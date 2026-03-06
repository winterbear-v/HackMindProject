"""
Claude/Groq Chatbot Service — SkillsMirage L2
Handles all 5 required question types from the PPT:
  1. Why is my risk score so high?
  2. What jobs are safer for someone like me?
  3. Show paths under N months
  4. How many BPO jobs in Indore right now? (live L1 query)
  5. Hindi full support (मुझे क्या करना चाहिए?)
"""

import os, re
from datetime import datetime, timedelta, timezone

import httpx
from dotenv import load_dotenv
from core.database import get_db

load_dotenv()

GROQ_API_KEY      = os.getenv("GROQ_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Use Groq if available (free), else Anthropic, else error
def _get_provider():
    if GROQ_API_KEY and GROQ_API_KEY != "your_groq_key_here":
        return "groq"
    if ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "your_anthropic_api_key_here":
        return "anthropic"
    return None


async def get_l1_evidence(city: str, role_norm: str) -> dict:
    """Fetch comprehensive L1 context for the chatbot."""
    db = get_db()
    now = datetime.now(timezone.utc)
    curr_since = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    prev_since = (now - timedelta(days=60)).strftime("%Y-%m-%d")

    # Current period docs for city+role
    curr_docs = await db.aggregates.find(
        {"city": city, "date": {"$gte": curr_since}},
        {"_id":0,"updated_at":0}
    ).sort("ai_tool_mention_rate",-1).limit(8).to_list(8)

    # Previous period for trend
    prev_docs = await db.aggregates.find(
        {"city": city, "date": {"$gte": prev_since, "$lt": curr_since}},
        {"_id":0,"updated_at":0}
    ).limit(5).to_list(5)

    # All vulnerability scores for comparison
    vuln_docs = await db.aggregates.find(
        {"date": {"$gte": curr_since}},
        {"city":1,"role_norm":1,"posting_count":1,"ai_tool_mention_rate":1,"_id":0}
    ).limit(50).to_list(50)

    # Compute city+role specific counts
    curr_total = sum(d.get("posting_count",0) for d in curr_docs
                     if d.get("role_norm")==role_norm)
    prev_total = sum(d.get("posting_count",0) for d in prev_docs
                     if d.get("role_norm")==role_norm)
    decline_pct = round((prev_total - curr_total)/prev_total*100, 1) if prev_total else 0
    avg_ai_rate = 0
    role_docs = [d for d in curr_docs if d.get("role_norm")==role_norm]
    if role_docs:
        avg_ai_rate = round(sum(d.get("ai_tool_mention_rate",0) for d in role_docs)/len(role_docs)*100,1)

    # Safe roles (low vulnerability in same city)
    safe_roles = []
    for d in vuln_docs:
        if d.get("city")==city and d.get("ai_tool_mention_rate",0)<0.15 and d.get("posting_count",0)>3:
            safe_roles.append({"role":d["role_norm"],"postings":d["posting_count"]})
    seen = set()
    safe_roles_dedup = []
    for r in safe_roles:
        if r["role"] not in seen:
            seen.add(r["role"])
            safe_roles_dedup.append(r)

    return {
        "curr_docs":    curr_docs,
        "curr_total":   curr_total,
        "prev_total":   prev_total,
        "decline_pct":  decline_pct,
        "avg_ai_rate":  avg_ai_rate,
        "safe_roles":   safe_roles_dedup[:5],
        "vuln_docs":    vuln_docs,
    }


async def get_live_job_count(city: str, role: str, days: int = 30) -> int:
    """Direct DB count for 'how many X jobs in Y' questions."""
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    match = {"date": {"$gte": since}}
    if city: match["city"] = city
    if role: match["role_norm"] = role
    res = await db.aggregates.aggregate([
        {"$match": match},
        {"$group": {"_id":None,"total":{"$sum":"$posting_count"}}},
    ]).to_list(1)
    return res[0]["total"] if res else 0


async def ask_claude(
    profile: dict,
    question: str,
    risk_result: dict,
    reskill_result: dict,
    language: str = "en",
) -> dict:
    provider = _get_provider()
    if not provider:
        return {
            "answer": (
                "⚠️ No AI API key set.\n\n"
                "Add either:\n"
                "• GROQ_API_KEY (free) from console.groq.com\n"
                "• ANTHROPIC_API_KEY from console.anthropic.com\n\n"
                "to your backend/.env file."
            ),
            "citations": [], "language": language,
        }

    # Fetch live L1 context
    l1 = await get_l1_evidence(profile.get("city",""), profile.get("title",""))

    # Check if this is a live count question
    count_match = re.search(
        r'(?:how many|count|number of)\s+(.+?)\s+(?:jobs?|openings?|postings?)\s+(?:in|at)\s+(\w+)',
        question, re.IGNORECASE
    )

    # Format evidence
    evidence_text = ""
    for i, doc in enumerate(l1["curr_docs"][:5], 1):
        skills = ", ".join(s["skill"] for s in doc.get("top_skills",[])[:4])
        evidence_text += (
            f"\nEVIDENCE_{i} [{doc.get('city')} — {doc.get('role_norm')} — {doc.get('date')}]: "
            f"postings={doc.get('posting_count')}, "
            f"AI_rate={doc.get('ai_tool_mention_rate',0)*100:.1f}%, "
            f"skills=[{skills}]"
        )

    # Safe roles context
    safe_roles_text = ", ".join(
        f"{r['role']} ({r['postings']} postings in {profile.get('city','')})"
        for r in l1["safe_roles"]
    ) or "checking..."

    # Reskilling path summary
    reskill_text = ""
    for tr in reskill_result.get("target_roles",[])[:2]:
        reskill_text += f"\n  • {tr['role']} — {tr['total_weeks']} weeks"
        for w in tr.get("weeks",[])[:3]:
            reskill_text += f"\n    {w['week']}: {w['action']} → {w['resource_link']}"

    lang_inst = (
        "Respond ENTIRELY in Hindi (Devanagari script). Do not switch to English at all."
        if language == "hi"
        else "Respond in English."
    )

    system_prompt = f"""You are SkillsMirage AI Advisor — India's workforce intelligence assistant.
You have access to LIVE Layer 1 job market data and the worker's personal profile.

CRITICAL RULES:
1. ALWAYS cite EVIDENCE_N tags when referencing data
2. NEVER hallucinate numbers — use only data provided
3. For "how many jobs" questions — use the LIVE_COUNT provided
4. For "safer jobs" questions — list from SAFE_ROLES data
5. For "time-constrained paths" — filter reskilling weeks accordingly
6. {lang_inst}
7. Be specific: cite actual % numbers, actual course names, actual cities
8. Answer in ≤ 300 words"""

    user_prompt = f"""WORKER PROFILE:
Name: {profile.get('name','Worker')}
Title: {profile.get('title')}
City: {profile.get('city')}
Experience: {profile.get('xp_years')} years
Skills: {profile.get('extracted_skills',[])}

RISK ASSESSMENT:
Score: {risk_result.get('score',50)}/100 ({risk_result.get('level','MEDIUM')})
Drivers: hiring_decline={risk_result.get('drivers',{}).get('hiring_decline',0):.0f}/100, ai_mentions={risk_result.get('drivers',{}).get('ai_mentions',0):.0f}/100

LIVE L1 SIGNALS for {profile.get('city')} — {profile.get('title')}:
• Current postings (30d): {l1['curr_total']}
• Previous period: {l1['prev_total']}
• Hiring change: {'-' if l1['decline_pct']>0 else '+'}{abs(l1['decline_pct'])}%
• AI tool mention rate: {l1['avg_ai_rate']}%

SAFE_ROLES actively hiring in {profile.get('city')}: {safe_roles_text}

RESKILLING PATH:{reskill_text}

LAYER 1 EVIDENCE:{evidence_text}

QUESTION: {question}

Answer with specific data. Cite EVIDENCE_N tags. {lang_inst}"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            if provider == "groq":
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}","Content-Type":"application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role":"system","content":system_prompt},
                            {"role":"user","content":user_prompt},
                        ],
                        "max_tokens": 1024,
                        "temperature": 0.3,
                    },
                )
                if resp.status_code != 200:
                    return {"answer":f"Groq error {resp.status_code}: {resp.text[:200]}","citations":[],"language":language}
                answer = resp.json()["choices"][0]["message"]["content"]

            else:  # anthropic
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 1024,
                        "system": system_prompt,
                        "messages": [{"role":"user","content":user_prompt}],
                    },
                )
                if resp.status_code != 200:
                    return {"answer":f"Claude API error {resp.status_code}: {resp.text[:200]}","citations":[],"language":language}
                answer = resp.json()["content"][0]["text"]

    except Exception as e:
        return {"answer":f"API call failed: {str(e)}","citations":[],"language":language}

    # Extract cited evidence
    cited = re.findall(r"EVIDENCE_(\d+)", answer)
    citations = []
    for idx in set(cited):
        i = int(idx) - 1
        if 0 <= i < len(l1["curr_docs"]):
            d = l1["curr_docs"][i]
            citations.append({
                "id": f"EVIDENCE_{idx}",
                "city": d.get("city"),
                "role": d.get("role_norm"),
                "date": d.get("date"),
                "posting_count": d.get("posting_count"),
            })

    return {"answer": answer, "citations": citations, "language": language}