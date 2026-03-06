"""
Gemini Flash Chatbot Service — SkillsMirage L2
Handles all 5 required question types from the PPT:
  1. Why is my risk score so high?
  2. What jobs are safer for someone like me?
  3. Show paths under N months
  4. How many BPO jobs in Indore right now? (live L1 query)
  5. Hindi full support (मुझे क्या करना चाहिए?)
"""

import os
import re
from datetime import datetime, timedelta, timezone

import httpx
from dotenv import load_dotenv
from core.database import get_db

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Gemini Flash endpoint
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-1.5-flash:generateContent"
)


def _get_provider():
    if GEMINI_API_KEY and GEMINI_API_KEY not in ("", "your_gemini_api_key_here"):
        return "gemini"
    return None


# ─── L1 Evidence Helpers ────────────────────────────────────

async def _count_jobs(city: str = None, role: str = None, days: int = 30) -> int:
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    match = {"date": {"$gte": since}}
    if city:
        match["city"] = city
    if role:
        match["role_norm"] = role
    res = await db.aggregates.aggregate([
        {"$match": match},
        {"$group": {"_id": None, "total": {"$sum": "$posting_count"}}},
    ]).to_list(1)
    return res[0]["total"] if res else 0


async def get_l1_evidence(city: str, role_norm: str) -> dict:
    """Fetch comprehensive L1 context for the chatbot."""
    db = get_db()
    since_30 = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    since_90 = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%d")

    # Current city+role data
    curr_docs = await db.aggregates.find(
        {"city": city, "date": {"$gte": since_30}},
        {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)

    # Historical (90d) for trend
    hist_docs = await db.aggregates.find(
        {"city": city, "date": {"$gte": since_90, "$lt": since_30}},
        {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)

    # Safe roles = high posting count in city, low AI mention rate
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

    return {
        "curr_docs": curr_docs,
        "hist_docs": hist_docs,
        "safe_roles": safe_roles,
    }


# ─── Main Ask Function ───────────────────────────────────────

async def ask_claude(
    profile: dict,
    question: str,
    risk_result: dict,
    reskill_result: dict,
    language: str = "en",
) -> dict:
    """
    Main chatbot function — uses Gemini Flash (free tier).
    The function name 'ask_claude' is kept for backward compatibility
    with existing router imports.
    """
    provider = _get_provider()
    if not provider:
        return {
            "answer": (
                "⚠️ No AI API key set.\n\n"
                "Add your Gemini API key to backend/.env:\n"
                "  GEMINI_API_KEY=AIzaSy_xxxxxxxxxxxxxxxxxxxx\n\n"
                "Get a FREE key at: https://aistudio.google.com\n"
                "(Free tier: 1 million tokens/day, 15 req/min)"
            ),
            "citations": [],
            "language": language,
        }

    # Fetch live L1 context
    l1 = await get_l1_evidence(
        profile.get("city", ""),
        profile.get("title", "")
    )

    # Check for live job count question
    count_match = re.search(
        r'(?:how many|count|number of)\s+(.+?)\s+(?:jobs?|openings?|postings?)\s+(?:in|at)\s+(\w+)',
        question, re.IGNORECASE
    )
    live_count = None
    if count_match:
        role_q = count_match.group(1).strip()
        city_q = count_match.group(2).strip()
        live_count = await _count_jobs(city=city_q, role=role_q)

    # Format evidence blocks
    evidence_text = ""
    for i, doc in enumerate(l1["curr_docs"][:5], 1):
        skills = ", ".join(s["skill"] for s in doc.get("top_skills", [])[:4])
        evidence_text += (
            f"\nEVIDENCE_{i} [{doc.get('city')} — {doc.get('role_norm')} — {doc.get('date')}]: "
            f"postings={doc.get('posting_count')}, "
            f"AI_rate={doc.get('ai_tool_mention_rate', 0) * 100:.1f}%, "
            f"skills=[{skills}]"
        )

    # Safe roles context
    safe_roles_text = ", ".join(
        f"{r['role']} ({r['postings']} postings in {profile.get('city', '')})"
        for r in l1["safe_roles"]
    ) or "No data available yet."

    # Reskilling path summary
    reskill_text = ""
    for tr in reskill_result.get("target_roles", [])[:2]:
        reskill_text += f"\n  • {tr['role']} — {tr['total_weeks']} weeks"
        for w in tr.get("weeks", [])[:3]:
            reskill_text += f"\n    {w['week']}: {w['action']} → {w['resource_link']}"

    # Language instruction
    lang_inst = (
        "Respond ENTIRELY in Hindi (Devanagari script). Do not switch to English at all."
        if language == "hi"
        else "Respond in English."
    )

    # System + user prompts
    system_prompt = f"""You are SkillsMirage AI Advisor — India's workforce intelligence assistant.
You have access to LIVE Layer 1 job market data and the worker's personal profile.

CRITICAL RULES:
1. ALWAYS cite EVIDENCE_N tags when referencing data
2. NEVER hallucinate numbers — use only data provided
3. For "how many jobs" questions — use the LIVE_COUNT provided
4. For "safer jobs" questions — list from SAFE_ROLES data
5. For "time-constrained paths" — filter reskilling weeks accordingly
6. {lang_inst}
7. Be concise, helpful, and actionable. Max 300 words."""

    user_prompt = f"""=== WORKER PROFILE ===
Name: {profile.get('name', 'Worker')}
Role: {profile.get('title', 'Unknown')}
City: {profile.get('city', 'Unknown')}
Experience: {profile.get('xp_years', 0)} years
Skills: {', '.join(profile.get('extracted_skills', []))}

=== RISK SCORE ===
Score: {risk_result.get('score', 'N/A')}/100
Level: {risk_result.get('level', 'N/A')}
Drivers: {risk_result.get('drivers', {})}

=== LIVE L1 EVIDENCE (last 30 days) ===
{evidence_text if evidence_text else "No recent data found."}

=== SAFE ROLES IN {profile.get('city', 'your city').upper()} ===
{safe_roles_text}

=== RESKILLING PATHS ===
{reskill_text if reskill_text else "No reskilling data available."}

{f"=== LIVE JOB COUNT ==={chr(10)}Current openings matching query: {live_count}" if live_count is not None else ""}

=== USER QUESTION ===
{question}

Cite EVIDENCE_N tags where relevant. {lang_inst}"""

    # ── Call Gemini Flash ──────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                headers={"Content-Type": "application/json"},
                json={
                    "system_instruction": {
                        "parts": [{"text": system_prompt}]
                    },
                    "contents": [
                        {
                            "role": "user",
                            "parts": [{"text": user_prompt}]
                        }
                    ],
                    "generationConfig": {
                        "maxOutputTokens": 1024,
                        "temperature": 0.3,
                    },
                },
            )

            if resp.status_code != 200:
                error_detail = resp.text[:300]
                return {
                    "answer": f"❌ Gemini API error {resp.status_code}:\n{error_detail}\n\nCheck your GEMINI_API_KEY in backend/.env",
                    "citations": [],
                    "language": language,
                }

            resp_json = resp.json()

            # Extract text from Gemini response structure
            try:
                answer = (
                    resp_json["candidates"][0]["content"]["parts"][0]["text"]
                )
            except (KeyError, IndexError) as e:
                return {
                    "answer": f"❌ Unexpected Gemini response format: {str(e)}\nRaw: {str(resp_json)[:200]}",
                    "citations": [],
                    "language": language,
                }

    except httpx.TimeoutException:
        return {
            "answer": "❌ Gemini API timed out. Please try again in a moment.",
            "citations": [],
            "language": language,
        }
    except Exception as e:
        return {
            "answer": f"❌ API call failed: {str(e)}",
            "citations": [],
            "language": language,
        }

    # ── Extract cited evidence for frontend ───────────────
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

    return {
        "answer": answer,
        "citations": citations,
        "language": language,
    }