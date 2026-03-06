"""
Chatbot Service — SkillsMirage L2
Provider priority:
  1. Groq  (FREE, no card, 14,400 req/day) <- PRIMARY
  2. Gemini Flash <- FALLBACK
"""

import os
import re
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv, dotenv_values
from core.database import get_db

# ── Force reload .env from disk every time ──────────────────
# This fixes the issue where module-level os.getenv() reads
# stale values if .env was updated after server started.

def _load_env():
    """Load .env fresh from disk — tries multiple locations."""
    for path in [
        Path(__file__).parent.parent / ".env",   # backend/.env
        Path(".env"),                              # cwd/.env
        Path("../.env"),                           # parent/.env
    ]:
        if path.exists():
            load_dotenv(dotenv_path=path, override=True)
            print(f"  [Env] Loaded .env from: {path.resolve()}")
            return
    load_dotenv(override=True)  # fallback: search default locations

_load_env()


def _get_groq_key():
    return os.getenv("GROQ_API_KEY", "").strip()

def _get_gemini_key():
    return os.getenv("GEMINI_API_KEY", "").strip()


GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)


def _get_provider():
    """Read keys fresh from env every call."""
    groq_key   = _get_groq_key()
    gemini_key = _get_gemini_key()

    print(f"  [Chat] GROQ_API_KEY present: {bool(groq_key and groq_key != 'your_groq_key_here')}")
    print(f"  [Chat] GEMINI_API_KEY present: {bool(gemini_key and gemini_key != 'your_gemini_api_key_here')}")

    if groq_key and groq_key not in ("", "your_groq_key_here"):
        return "groq"
    if gemini_key and gemini_key not in ("", "your_gemini_api_key_here"):
        return "gemini"
    return None


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
                return {"error": "rate_limit", "message": "Groq rate limited — please wait a moment."}
            if resp.status_code != 200:
                return {"error": "api_error", "message": f"Groq error {resp.status_code}: {resp.text[:200]}"}
            answer = resp.json()["choices"][0]["message"]["content"]
            return {"answer": answer}
    except httpx.TimeoutException:
        return {"error": "timeout", "message": "Groq timed out. Please try again."}
    except Exception as e:
        return {"error": "exception", "message": str(e)}


# ─── Gemini API Call ────────────────────────────────────────

async def _call_gemini(system_prompt, user_prompt):
    gemini_key = _get_gemini_key()
    MAX_RETRIES = 3
    RETRY_DELAYS = [10, 20, 30]
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            for attempt in range(MAX_RETRIES):
                resp = await client.post(
                    f"{GEMINI_URL}?key={gemini_key}",
                    headers={"Content-Type": "application/json"},
                    json={
                        "system_instruction": {"parts": [{"text": system_prompt}]},
                        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                        "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.3},
                    },
                )
                if resp.status_code == 429:
                    if attempt < MAX_RETRIES - 1:
                        wait = RETRY_DELAYS[attempt]
                        print(f"  [Gemini] Rate limited. Waiting {wait}s...")
                        await asyncio.sleep(wait)
                        continue
                    return {"error": "rate_limit", "message": "Please wait 30 seconds and try again."}
                if resp.status_code != 200:
                    return {"error": "api_error", "message": f"Gemini error {resp.status_code}: {resp.text[:200]}"}
                break
            try:
                answer = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                return {"answer": answer}
            except (KeyError, IndexError) as e:
                return {"error": "parse_error", "message": f"Unexpected response: {e}"}
    except httpx.TimeoutException:
        return {"error": "timeout", "message": "Gemini timed out. Please try again."}
    except Exception as e:
        return {"error": "exception", "message": str(e)}


# ─── Main Ask Function ───────────────────────────────────────

async def ask_claude(profile, question, risk_result, reskill_result, language="en"):
    # Re-load env on every call to pick up any .env changes
    _load_env()

    provider = _get_provider()
    if not provider:
        # Debug: print what keys we see
        print(f"  [Chat] DEBUG - All env keys with GROQ: {[k for k in os.environ if 'GROQ' in k]}")
        print(f"  [Chat] DEBUG - All env keys with GEMINI: {[k for k in os.environ if 'GEMINI' in k]}")
        return {
            "answer": (
                "⚠️ No AI API key found.\n\n"
                "Your .env file should have:\n"
                "  GROQ_API_KEY=gsk_xxxxxxxxxxxx\n\n"
                "Make sure:\n"
                "1. The file is saved at backend/.env\n"
                "2. No spaces around the = sign\n"
                "3. No quotes around the value\n"
                "4. Restart the backend after saving"
            ),
            "citations": [], "language": language,
        }

    # Build context
    l1 = await get_l1_evidence(profile.get("city", ""), profile.get("title", ""))

    count_match = re.search(
        r'(?:how many|count|number of)\s+(.+?)\s+(?:jobs?|openings?|postings?)\s+(?:in|at)\s+(\w+)',
        question, re.IGNORECASE
    )
    live_count = None
    if count_match:
        live_count = await _count_jobs(city=count_match.group(2).strip(), role=count_match.group(1).strip())

    evidence_text = ""
    for i, doc in enumerate(l1["curr_docs"][:5], 1):
        skills = ", ".join(s["skill"] for s in doc.get("top_skills", [])[:4])
        evidence_text += (
            f"\nEVIDENCE_{i} [{doc.get('city')} - {doc.get('role_norm')} - {doc.get('date')}]: "
            f"postings={doc.get('posting_count')}, "
            f"AI_rate={doc.get('ai_tool_mention_rate', 0)*100:.1f}%, skills=[{skills}]"
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
        "Respond ENTIRELY in Hindi (Devanagari script)."
        if language == "hi" else "Respond in English."
    )

    system_prompt = f"""You are SkillsMirage AI Advisor - India's workforce intelligence assistant.
RULES:
1. Always cite EVIDENCE_N tags when referencing data
2. Never hallucinate numbers - use only provided data
3. For job count questions - use LIVE_COUNT
4. For safer jobs - list from SAFE_ROLES
5. {lang_inst}
6. Be concise and actionable. Max 300 words."""

    user_prompt = f"""=== WORKER PROFILE ===
Name: {profile.get('name','Worker')} | Role: {profile.get('title','Unknown')} | City: {profile.get('city','Unknown')}
Experience: {profile.get('xp_years',0)} years | Skills: {', '.join(profile.get('extracted_skills',[]))}

=== RISK SCORE ===
Score: {risk_result.get('score','N/A')}/100 | Level: {risk_result.get('level','N/A')}

=== LIVE L1 EVIDENCE ===
{evidence_text or "No recent data found."}

=== SAFE ROLES IN {profile.get('city','your city').upper()} ===
{safe_roles_text}

=== RESKILLING PATHS ===
{reskill_text or "No reskilling data available."}

{f"=== LIVE JOB COUNT ==={chr(10)}Current openings: {live_count}" if live_count is not None else ""}

=== USER QUESTION ===
{question}

{lang_inst}"""

    # Call provider
    result = {}
    if provider == "groq":
        print(f"  [Chat] Calling Groq API...")
        result = await _call_groq(system_prompt, user_prompt)
        if "error" in result:
            gemini_key = _get_gemini_key()
            if gemini_key and gemini_key not in ("", "your_gemini_api_key_here"):
                print(f"  [Chat] Groq failed ({result.get('error')}), trying Gemini...")
                result = await _call_gemini(system_prompt, user_prompt)
    else:
        print(f"  [Chat] Calling Gemini API...")
        result = await _call_gemini(system_prompt, user_prompt)

    if "error" in result:
        return {"answer": f"❌ {result.get('message','Unknown error')}", "citations": [], "language": language}

    answer = result.get("answer", "")

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