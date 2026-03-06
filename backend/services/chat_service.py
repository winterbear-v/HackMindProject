"""
Chatbot Service — SkillsMirage L2
Provider: Groq (FREE — 14,400 req/day, no credit card)
Get key : console.groq.com
"""

import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv
from core.database import get_db


# ── Force reload .env from disk every time ──────────────────
def _load_env():
    for path in [
        Path(__file__).parent.parent / ".env",
        Path(".env"),
        Path("../.env"),
    ]:
        if path.exists():
            load_dotenv(dotenv_path=path, override=True)
            return
    load_dotenv(override=True)

_load_env()


def _get_groq_key():
    return os.getenv("GROQ_API_KEY", "").strip()


GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


# ─── L1 Evidence Helpers ────────────────────────────────────

async def _count_jobs(city=None, role=None, days=30):
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    match = {"date": {"$gte": since}}
    if city: match["city"] = city
    if role: match["role_norm"] = role
    res = await db.aggregates.aggregate([
        {"$match": match},
        {"$group": {"_id": None, "total": {"$sum": "$posting_count"}}},
    ]).to_list(1)
    return res[0]["total"] if res else 0


async def get_l1_evidence(city, role_norm):
    db = get_db()
    since_30 = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    since_90 = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%d")

    curr_docs = await db.aggregates.find(
        {"city": city, "date": {"$gte": since_30}}, {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)

    hist_docs = await db.aggregates.find(
        {"city": city, "date": {"$gte": since_90, "$lt": since_30}}, {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)

    safe_pipeline = [
        {"$match": {"city": city, "date": {"$gte": since_30}}},
        {"$group": {
            "_id": "$role_norm",
            "postings": {"$sum": "$posting_count"},
            "avg_ai_rate": {"$avg": "$ai_tool_mention_rate"},
        }},
        {"$match": {"avg_ai_rate": {"$lt": 0.3}}},
        {"$sort": {"postings": -1}},
        {"$limit": 5},
    ]
    safe_roles_raw = await db.aggregates.aggregate(safe_pipeline).to_list(5)
    safe_roles = [{"role": r["_id"], "postings": r["postings"]} for r in safe_roles_raw]

    return {"curr_docs": curr_docs, "hist_docs": hist_docs, "safe_roles": safe_roles}


# ─── Groq API Call ──────────────────────────────────────────

async def _call_groq(system_prompt, user_prompt):
    groq_key = _get_groq_key()
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_prompt},
                    ],
                    "max_tokens": 1024,
                    "temperature": 0.3,
                },
            )
            if resp.status_code == 429:
                return {"error": "rate_limit", "message": "Groq rate limited — please wait a moment and try again."}
            if resp.status_code != 200:
                return {"error": "api_error", "message": f"Groq error {resp.status_code}: {resp.text[:200]}"}
            answer = resp.json()["choices"][0]["message"]["content"]
            return {"answer": answer}
    except httpx.TimeoutException:
        return {"error": "timeout", "message": "Groq timed out — please try again."}
    except Exception as e:
        return {"error": "exception", "message": str(e)}


# ─── Main Ask Function ───────────────────────────────────────

async def ask_claude(profile, question, risk_result, reskill_result, language="en"):
    _load_env()

    groq_key = _get_groq_key()
    if not groq_key or groq_key == "your_groq_key_here":
        return {
            "answer": (
                "⚠️ GROQ_API_KEY not set.\n\n"
                "Steps to fix:\n"
                "1. Go to console.groq.com → sign up free\n"
                "2. Create an API key\n"
                "3. Add to backend/.env:\n"
                "   GROQ_API_KEY=gsk_xxxxxxxxxxxx\n"
                "4. Restart the backend"
            ),
            "citations": [], "language": language,
        }

    # Build L1 context
    l1 = await get_l1_evidence(profile.get("city", ""), profile.get("title", ""))

    # Live job count for "how many X jobs in Y" questions
    count_match = re.search(
        r'(?:how many|count|number of)\s+(.+?)\s+(?:jobs?|openings?|postings?)\s+(?:in|at)\s+(\w+)',
        question, re.IGNORECASE,
    )
    live_count = None
    if count_match:
        live_count = await _count_jobs(
            city=count_match.group(2).strip(),
            role=count_match.group(1).strip(),
        )

    # Format evidence
    evidence_text = ""
    for i, doc in enumerate(l1["curr_docs"][:5], 1):
        skills = ", ".join(s["skill"] for s in doc.get("top_skills", [])[:4])
        evidence_text += (
            f"\nEVIDENCE_{i} [{doc.get('city')} - {doc.get('role_norm')} - {doc.get('date')}]: "
            f"postings={doc.get('posting_count')}, "
            f"AI_rate={doc.get('ai_tool_mention_rate', 0)*100:.1f}%, "
            f"skills=[{skills}]"
        )

    safe_roles_text = ", ".join(
        f"{r['role']} ({r['postings']} postings)" for r in l1["safe_roles"]
    ) or "No data available yet."

    reskill_text = ""
    for tr in reskill_result.get("target_roles", [])[:2]:
        reskill_text += f"\n  - {tr['role']} - {tr['total_weeks']} weeks"
        for w in tr.get("weeks", [])[:3]:
            reskill_text += f"\n    {w['week']}: {w['action']} -> {w['resource_link']}"

    lang_inst = (
        "Respond ENTIRELY in Hindi (Devanagari script). Do not switch to English."
        if language == "hi"
        else "Respond in English."
    )

    # Guard: never let the model hallucinate when evidence is missing
    if not evidence_text:
        evidence_text = (
            "⚠️ NO LIVE DATA — the scraper has not run yet for "
            f"{profile.get('city','this city')} / {profile.get('title','this role')}. "
            "Do NOT invent any numbers or trends."
        )

    if not safe_roles_text or safe_roles_text == "No data available yet.":
        safe_roles_text = (
            "⚠️ NO SAFE ROLE DATA — scraper has not run yet. "
            "Do NOT suggest roles based on assumptions."
        )

    system_prompt = f"""You are SkillsMirage AI Advisor - India's workforce intelligence assistant.

STRICT RULES — violating these will disqualify the response:
1. ALWAYS cite EVIDENCE_N tags when referencing any data point
2. If LIVE L1 EVIDENCE starts with ⚠️ NO LIVE DATA — you MUST say:
   "I don't have live market data for your city yet. Please run the scraper from the Admin tab first."
   Do NOT invent hiring percentages, AI rates, or job counts under any circumstance.
3. For job count questions — use LIVE_COUNT value only. If not provided, say you don't have that data.
4. For safer jobs questions — list only from SAFE_ROLES. If empty, say data is not available yet.
5. {lang_inst}
6. Be specific and cite actual numbers from the evidence. Max 300 words.
7. Generic advice like "learn Python" without citing L1 data is NOT acceptable."""

    user_prompt = f"""=== WORKER PROFILE ===
Name: {profile.get('name', 'Worker')} | Role: {profile.get('title', 'Unknown')} | City: {profile.get('city', 'Unknown')}
Experience: {profile.get('xp_years', 0)} years | Skills: {', '.join(profile.get('extracted_skills', []))}

=== RISK SCORE ===
Score: {risk_result.get('score', 'N/A')}/100 | Level: {risk_result.get('level', 'N/A')}

=== LIVE L1 EVIDENCE (cite these or say no data) ===
{evidence_text}

=== SAFE ROLES IN {profile.get('city', 'your city').upper()} ===
{safe_roles_text}

=== RESKILLING PATHS ===
{reskill_text or "No reskilling data available."}

{f"=== LIVE JOB COUNT ==={chr(10)}Current openings: {live_count}" if live_count is not None else ""}

=== USER QUESTION ===
{question}

{lang_inst}
Remember: If evidence is missing, say so clearly. Never invent data."""

    print(f"  [Chat] Calling Groq API...")
    result = await _call_groq(system_prompt, user_prompt)

    if "error" in result:
        return {
            "answer": f"❌ {result.get('message', 'Unknown error')}",
            "citations": [],
            "language": language,
        }

    answer = result.get("answer", "")

    # Extract cited evidence tags
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