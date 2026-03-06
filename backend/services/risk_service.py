"""
Risk Scoring Service — SkillsMirage L2
Formula:
  score = 0.45 * hiring_decline + 0.30 * ai_mentions + 0.15 * skill_gap + 0.10 * xp_penalty

PPT extras:
  - trend: score change vs 30 days ago  (↑ +8 vs 30 days ago)
  - vs_peers: percentile rank among all workers (top 15% at-risk)
"""

from datetime import datetime, timedelta, timezone
from core.database import get_db
from services.nlp_service import compute_skill_match, experience_penalty as xp_penalty


def _clamp(v, lo=0, hi=100): return max(lo, min(hi, v))


# Map free-text titles → canonical TARGET_ROLES
TITLE_MAP = {
    "bpo":"BPO","call centre":"BPO","call center":"BPO","telecaller":"BPO","voice process":"BPO",
    "data entry":"Data Entry","data entry operator":"Data Entry","deo":"Data Entry",
    "data analyst":"Data Analyst","analyst":"Data Analyst","business analyst":"Data Analyst",
    "software engineer":"Software Engineer","developer":"Software Engineer","sde":"Software Engineer",
    "customer support":"Customer Support","customer service":"Customer Support","customer care":"Customer Support",
    "content writer":"Content Writer","copywriter":"Content Writer","technical writer":"Content Writer",
    "hr":"HR Executive","human resources":"HR Executive","recruiter":"HR Executive",
    "accountant":"Accountant","accounts":"Accountant","finance":"Accountant",
    "sales":"Sales Executive","sales executive":"Sales Executive","bdm":"Sales Executive",
    "digital marketing":"Digital Marketing","seo":"Digital Marketing","social media":"Digital Marketing",
}

def _normalize_title(title: str) -> str:
    t = title.lower().strip()
    for k, v in TITLE_MAP.items():
        if k in t:
            return v
    return title.title()


async def compute_risk_score(
    title: str,
    city: str,
    xp_years: float,
    extracted_skills: list,
    window_days: int = 30,
) -> dict:
    db   = get_db()
    now  = datetime.now(timezone.utc)
    role = _normalize_title(title)

    curr_since = (now - timedelta(days=window_days)).strftime("%Y-%m-%d")
    prev_since = (now - timedelta(days=window_days * 2)).strftime("%Y-%m-%d")

    # ── Fetch aggregates ──────────────────────────────────────
    curr_docs = await db.aggregates.find(
        {"city": city, "role_norm": role, "date": {"$gte": curr_since}},
        {"_id":0}
    ).to_list(None)

    # Fallback: any city for this role
    if not curr_docs:
        curr_docs = await db.aggregates.find(
            {"role_norm": role, "date": {"$gte": curr_since}},
            {"_id":0}
        ).to_list(None)

    prev_docs = await db.aggregates.find(
        {"city": city, "role_norm": role,
         "date": {"$gte": prev_since, "$lt": curr_since}},
        {"_id":0}
    ).to_list(None)

    if not prev_docs:
        prev_docs = await db.aggregates.find(
            {"role_norm": role,
             "date": {"$gte": prev_since, "$lt": curr_since}},
            {"_id":0}
        ).to_list(None)

    curr_count = sum(d.get("posting_count", 0) for d in curr_docs)
    prev_count = sum(d.get("posting_count", 0) for d in prev_docs)

    # ── Component 1: Hiring Decline (45%) ─────────────────────
    if prev_count > 0:
        hiring_decline_pct = _clamp((prev_count - curr_count) / prev_count * 100, 0, 100)
    elif curr_count == 0:
        hiring_decline_pct = 50.0
    else:
        hiring_decline_pct = 0.0

    # ── Component 2: AI mention rate (30%) ────────────────────
    ai_rates = [d.get("ai_tool_mention_rate", 0) for d in curr_docs]
    avg_ai   = sum(ai_rates) / len(ai_rates) if ai_rates else 0
    ai_score = _clamp(avg_ai * 200, 0, 100)  # 0.5 rate → 100

    # ── Component 3: Skill gap (15%) ──────────────────────────
    # Compare worker's skills vs skills demanded in job postings
    demanded_skills = []
    for doc in curr_docs:
        for s in doc.get("top_skills", []):
            demanded_skills.append(s.get("skill", ""))
    demanded_set = list(set(demanded_skills))
    match_ratio  = compute_skill_match(extracted_skills, demanded_set)
    skill_gap_score = _clamp((1 - match_ratio) * 100, 0, 100)

    # ── Component 4: Experience penalty (10%) ─────────────────
    xp_score = _clamp(xp_penalty(xp_years) * 100, 0, 100)

    # ── Final weighted score ───────────────────────────────────
    raw_score = (
        0.45 * hiring_decline_pct +
        0.30 * ai_score           +
        0.15 * skill_gap_score    +
        0.10 * xp_score
    )
    score = round(_clamp(raw_score))

    level = "HIGH" if score >= 65 else "MEDIUM" if score >= 35 else "LOW"

    # ── Trend: score vs 30 days ago ───────────────────────────
    # Compute previous score with prev_docs as "current"
    older_since = (now - timedelta(days=window_days * 3)).strftime("%Y-%m-%d")
    older_docs  = await db.aggregates.find(
        {"role_norm": role,
         "date": {"$gte": older_since, "$lt": prev_since}},
        {"_id":0}
    ).to_list(None)

    older_count = sum(d.get("posting_count",0) for d in older_docs)
    if older_count > 0 and prev_count > 0:
        old_decline = _clamp((older_count - prev_count) / older_count * 100, 0, 100)
    else:
        old_decline = hiring_decline_pct

    old_ai_rates = [d.get("ai_tool_mention_rate",0) for d in prev_docs]
    old_ai       = sum(old_ai_rates)/len(old_ai_rates) if old_ai_rates else avg_ai
    old_ai_score = _clamp(old_ai * 200, 0, 100)

    old_raw   = 0.45*old_decline + 0.30*old_ai_score + 0.15*skill_gap_score + 0.10*xp_score
    old_score = round(_clamp(old_raw))
    score_delta = score - old_score

    # ── vs Peers percentile ───────────────────────────────────
    # Compare against all other roles in same city
    all_city_docs = await db.aggregates.find(
        {"city": city, "date": {"$gte": curr_since}},
        {"_id":0, "role_norm":1, "posting_count":1, "ai_tool_mention_rate":1}
    ).to_list(None)

    peer_scores = []
    role_groups: dict = {}
    for d in all_city_docs:
        r = d["role_norm"]
        role_groups.setdefault(r, []).append(d)

    for r, docs in role_groups.items():
        rc = sum(d.get("posting_count",0) for d in docs)
        rai = sum(d.get("ai_tool_mention_rate",0) for d in docs) / len(docs)
        pd_ = _clamp((rc - rc*0.8)/max(rc*0.8,1)*100, 0, 100) if rc else 50
        ps_ = round(_clamp(0.45*pd_ + 0.30*_clamp(rai*200,0,100) + 0.15*50 + 0.10*50))
        peer_scores.append(ps_)

    if peer_scores:
        worse_than = sum(1 for ps in peer_scores if ps <= score)
        percentile = round(worse_than / len(peer_scores) * 100)
        # "top X% at-risk" means you're in the high end
        top_pct = round((1 - worse_than/len(peer_scores)) * 100) + 1
    else:
        percentile = 50
        top_pct    = 50

    return {
        "score":       score,
        "level":       level,
        "role_norm":   role,
        "score_delta": score_delta,      # +8 means risk grew vs 30d ago
        "top_pct":     top_pct,          # "top 15% at-risk"
        "drivers": {
            "hiring_decline": round(hiring_decline_pct),
            "ai_mentions":    round(ai_score),
            "skill_gap":      round(skill_gap_score),
            "xp_penalty":     round(xp_score),
        },
        "context": {
            "curr_postings":       curr_count,
            "prev_postings":       prev_count,
            "hiring_change_pct":   round((curr_count - prev_count) / max(prev_count,1) * 100, 1),
            "avg_ai_mention_rate": round(avg_ai * 100, 1),
            "city":                city,
            "role":                role,
        },
        "evidence":    curr_docs[:5],
    }