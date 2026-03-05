"""
Claude Chatbot Service — SkillsMirage L2
Retrieves L1 evidence (top 5 aggregated docs) and calls Claude API
with a context-aware bilingual prompt.
"""

import os
from datetime import datetime, timedelta, timezone

import httpx
from dotenv import load_dotenv

from core.database import get_db

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-20250514"


async def get_l1_evidence(city: str, role_norm: str, limit: int = 5) -> list[dict]:
    """Fetch top L1 aggregated docs for (city, role) as RAG context."""
    db = get_db()
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=30)).strftime("%Y-%m-%d")

    cursor = db.aggregates.find(
        {"city": city, "date": {"$gte": since}},
        {"_id": 0, "updated_at": 0},
    ).sort("ai_tool_mention_rate", -1).limit(limit)

    docs = await cursor.to_list(length=limit)
    return docs


async def ask_claude(
    profile: dict,
    question: str,
    risk_result: dict,
    reskill_result: dict,
    language: str = "en",
) -> dict:
    """
    Call Claude API with full context.
    Returns: { answer, citations, language }
    """
    if not ANTHROPIC_API_KEY:
        return {
            "answer": (
                "ANTHROPIC_API_KEY not set. Please add it to backend/.env as:\n"
                "ANTHROPIC_API_KEY=sk-ant-..."
            ),
            "citations": [],
            "language": language,
        }

    # Fetch L1 evidence
    evidence_docs = await get_l1_evidence(
        profile.get("city", ""),
        profile.get("title", ""),
    )

    # Format evidence for prompt
    evidence_text = ""
    for i, doc in enumerate(evidence_docs, 1):
        skills_list = ", ".join(s["skill"] for s in doc.get("top_skills", [])[:5])
        evidence_text += (
            f"\nEVIDENCE_{i} [{doc.get('city')} — {doc.get('role_norm')} — {doc.get('date')}]: "
            f"postings={doc.get('posting_count')}, "
            f"AI_mention_rate={doc.get('ai_tool_mention_rate', 0):.1%}, "
            f"top_skills=[{skills_list}]"
        )

    # Format reskilling path summary
    reskill_summary = ""
    for tr in reskill_result.get("target_roles", [])[:2]:
        reskill_summary += (
            f"\n  • {tr['role']} ({tr['total_weeks']} weeks, confidence {tr['confidence']}%)"
        )
        for w in tr.get("weeks", [])[:3]:
            reskill_summary += f"\n      {w['week']}: {w['action']} → {w['resource_link']}"

    lang_instruction = (
        "Respond ONLY in Hindi (Devanagari script)."
        if language == "hi"
        else "Respond in English."
    )

    system_prompt = (
        "You are SkillsMirage Assistant, an AI career advisor specializing in "
        "Indian job market displacement risk. Use ONLY the profile JSON and the "
        "provided Layer-1 evidence (labeled EVIDENCE_1..N). Cite evidence IDs when "
        "answering. Be concise, practical, and give step-by-step reskilling suggestions "
        "with links. Always include: 1) why the risk is what it is (cite drivers), "
        "2) 2 recommended target roles, 3) top 3 weeks of the reskilling path with links, "
        f"4) a confidence score 0–100. {lang_instruction} "
        "Answer in ≤300 words."
    )

    user_prompt = (
        f"Worker Profile: {{\n"
        f"  name: {profile.get('name', 'Worker')},\n"
        f"  title: {profile.get('title')},\n"
        f"  city: {profile.get('city')},\n"
        f"  years_experience: {profile.get('xp_years')},\n"
        f"  extracted_skills: {profile.get('extracted_skills', [])}\n"
        f"}}\n\n"
        f"Risk Assessment:\n"
        f"  Score: {risk_result.get('score')}/100 ({risk_result.get('level')})\n"
        f"  Drivers: {risk_result.get('drivers')}\n\n"
        f"Recommended Reskilling Paths:{reskill_summary}\n\n"
        f"L1 Market Evidence:{evidence_text}\n\n"
        f"Question: {question}\n\n"
        f"Constraints: ≤300 words. Always cite EVIDENCE_N IDs used."
    )

    # Call Claude API
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            },
        )

    if resp.status_code != 200:
        return {
            "answer": f"Claude API error {resp.status_code}: {resp.text[:200]}",
            "citations": [],
            "language": language,
        }

    data = resp.json()
    answer = data["content"][0]["text"] if data.get("content") else "No response."

    # Extract cited evidence IDs
    import re
    cited = re.findall(r"EVIDENCE_(\d+)", answer)
    citations = []
    for idx in set(cited):
        i = int(idx) - 1
        if 0 <= i < len(evidence_docs):
            citations.append({
                "id": f"EVIDENCE_{idx}",
                "city": evidence_docs[i].get("city"),
                "role": evidence_docs[i].get("role_norm"),
                "date": evidence_docs[i].get("date"),
                "posting_count": evidence_docs[i].get("posting_count"),
            })

    return {"answer": answer, "citations": citations, "language": language}