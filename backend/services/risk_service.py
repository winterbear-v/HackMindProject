"""
Risk Scoring Service — SkillsMirage L2
Computes a 0-100 AI displacement risk score for a worker profile
based on live L1 aggregated data.

Formula:
  score = clamp(
    0.45 * norm(hiring_decline_pct_city_role)
  + 0.30 * norm(ai_tool_mentions_in_jds_role)
  + 0.15 * (1 - role_skill_match)
  + 0.10 * experience_penalty,
  0, 100)
"""

from datetime import datetime, timedelta, timezone

from core.database import get_db
from services.nlp_service import compute_skill_match, experience_penalty as xp_penalty


def _clamp(val: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, val))


def _norm_pct(val: float, cap: float = 100) -> float:
    """Normalize a percentage to 0-100."""
    return _clamp(val / cap * 100)


async def compute_risk_score(
    title: str,
    city: str,
    xp_years: float,
    extracted_skills: list[str],
    window_days: int = 30,
) -> dict:
    """
    Returns:
      score        — 0-100
      level        — LOW / MEDIUM / HIGH
      drivers      — breakdown of each component
      evidence     — top matching aggregated JD docs
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    curr_since = (now - timedelta(days=window_days)).strftime("%Y-%m-%d")
    prev_since = (now - timedelta(days=window_days * 2)).strftime("%Y-%m-%d")

    # ── Find best matching role in aggregates ─────────────────
    # Match by city first, fall back to any city
    role_norm = _normalize_title(title)

    curr_agg = await db.aggregates.find_one(
        {"city": city, "role_norm": role_norm, "date": {"$gte": curr_since}},
        sort=[("date", -1)],
    )
    if not curr_agg:
        # Try partial match
        curr_agg = await db.aggregates.find_one(
            {"date": {"$gte": curr_since}},
            sort=[("date", -1)],
        )

    prev_agg = await db.aggregates.find_one(
        {"city": city, "role_norm": role_norm,
         "date": {"$gte": prev_since, "$lt": curr_since}},
        sort=[("date", -1)],
    )

    # ── Component 1: Hiring decline ───────────────────────────
    curr_count = curr_agg["posting_count"] if curr_agg else 10
    prev_count = prev_agg["posting_count"] if prev_agg else curr_count
    if prev_count > 0:
        raw_decline = max(0, (prev_count - curr_count) / prev_count * 100)
    else:
        raw_decline = 0
    hiring_decline_norm = _norm_pct(raw_decline)

    # ── Component 2: AI mention rate ──────────────────────────
    ai_rate = curr_agg["ai_tool_mention_rate"] if curr_agg else 0.1
    ai_norm = _clamp(ai_rate * 200)  # 0–0.5 rate → 0–100

    # ── Component 3: Skill match ──────────────────────────────
    posting_skills = (
        [s["skill"] for s in curr_agg.get("top_skills", [])]
        if curr_agg else []
    )
    match_score = compute_skill_match(extracted_skills, posting_skills)
    skill_gap_norm = _clamp((1 - match_score) * 100)

    # ── Component 4: Experience penalty ───────────────────────
    xp_pen = xp_penalty(xp_years)
    xp_norm = _clamp(xp_pen * 100)

    # ── Weighted sum ──────────────────────────────────────────
    raw_score = (
        0.45 * hiring_decline_norm
        + 0.30 * ai_norm
        + 0.15 * skill_gap_norm
        + 0.10 * xp_norm
    )
    score = round(_clamp(raw_score), 1)

    level = "HIGH" if score >= 65 else "MEDIUM" if score >= 35 else "LOW"

    # ── Gather evidence docs ──────────────────────────────────
    evidence_cursor = db.aggregates.find(
        {"city": city, "date": {"$gte": curr_since}},
        {"_id": 0, "updated_at": 0},
    ).sort("ai_tool_mention_rate", -1).limit(5)
    evidence = await evidence_cursor.to_list(length=5)

    # Serialize evidence (remove non-JSON-serializable fields)
    for e in evidence:
        e.pop("updated_at", None)

    return {
        "score": score,
        "level": level,
        "drivers": {
            "hiring_decline": round(hiring_decline_norm, 1),
            "ai_mentions": round(ai_norm, 1),
            "skill_match": round(skill_gap_norm, 1),
            "experience_penalty": round(xp_norm, 1),
        },
        "evidence": evidence,
        "meta": {
            "role_matched": role_norm,
            "city": city,
            "curr_postings": curr_count,
            "prev_postings": prev_count,
            "posting_skills": posting_skills[:8],
        },
    }


def _normalize_title(title: str) -> str:
    """Map free-text title to a canonical TARGET_ROLES value."""
    title_lower = title.lower()
    mapping = {
        "data entry": ["data entry", "deo", "data operator"],
        "BPO": ["bpo", "call center", "voice process", "non-voice", "telecaller"],
        "Data Analyst": ["data analyst", "analyst", "business analyst", "ba"],
        "Software Engineer": ["software", "developer", "engineer", "sde", "swe", "programmer", "coder"],
        "Customer Support": ["customer support", "customer service", "customer care", "support executive"],
        "Content Writer": ["content writer", "copywriter", "content creator", "blogger"],
        "HR Executive": ["hr", "human resource", "recruiter", "talent acquisition"],
        "Accountant": ["accountant", "accounts", "finance", "ca", "chartered"],
        "Sales Executive": ["sales", "business development", "bdm", "bde"],
        "Digital Marketing": ["digital marketing", "seo", "social media", "performance marketing"],
    }
    for canonical, keywords in mapping.items():
        if any(kw in title_lower for kw in keywords):
            return canonical
    return title  # Return as-is if no match