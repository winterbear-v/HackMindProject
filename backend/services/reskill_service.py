"""
Reskilling Path Generator — SkillsMirage L2

Maps skill gaps to concrete week-by-week plans using
NPTEL, SWAYAM, and PMKVY course metadata with real links.
"""

from datetime import datetime, timedelta, timezone

from core.database import get_db
from services.nlp_service import compute_skill_match

# ── NPTEL / SWAYAM / PMKVY course catalog ───────────────────
COURSE_CATALOG = {
    "python": [
        {"title": "Python for Data Science", "provider": "NPTEL", "weeks": 4, "hours_per_week": 4,
         "link": "https://nptel.ac.in/courses/106/106/106106182/"},
        {"title": "Programming in Python", "provider": "SWAYAM", "weeks": 8, "hours_per_week": 3,
         "link": "https://swayam.gov.in/nd1_noc19_cs41/preview"},
    ],
    "sql": [
        {"title": "Database Management System", "provider": "NPTEL", "weeks": 8, "hours_per_week": 4,
         "link": "https://nptel.ac.in/courses/106/105/106105175/"},
    ],
    "excel": [
        {"title": "Excel Skills for Business", "provider": "SWAYAM", "weeks": 4, "hours_per_week": 3,
         "link": "https://swayam.gov.in/nd1_noc20_mg56/preview"},
    ],
    "power bi": [
        {"title": "Business Analytics & Data Visualization", "provider": "NPTEL", "weeks": 6, "hours_per_week": 4,
         "link": "https://nptel.ac.in/courses/110/105/110105101/"},
    ],
    "machine learning": [
        {"title": "Introduction to Machine Learning", "provider": "NPTEL", "weeks": 8, "hours_per_week": 5,
         "link": "https://nptel.ac.in/courses/106/106/106106139/"},
        {"title": "Machine Learning for Engineers", "provider": "SWAYAM", "weeks": 12, "hours_per_week": 4,
         "link": "https://swayam.gov.in/nd1_noc20_cs71/preview"},
    ],
    "data analysis": [
        {"title": "Data Science for Engineers", "provider": "NPTEL", "weeks": 8, "hours_per_week": 4,
         "link": "https://nptel.ac.in/courses/106/106/106106126/"},
    ],
    "digital marketing": [
        {"title": "Digital Marketing", "provider": "SWAYAM", "weeks": 8, "hours_per_week": 3,
         "link": "https://swayam.gov.in/nd1_noc20_mg55/preview"},
        {"title": "Fundamentals of Digital Marketing", "provider": "Google (free)", "weeks": 4, "hours_per_week": 3,
         "link": "https://learndigital.withgoogle.com/digitalgarage/course/digital-marketing"},
    ],
    "communication": [
        {"title": "Effective Communication Skills", "provider": "SWAYAM", "weeks": 4, "hours_per_week": 2,
         "link": "https://swayam.gov.in/nd1_noc19_hs48/preview"},
    ],
    "accounting": [
        {"title": "Financial Accounting", "provider": "SWAYAM", "weeks": 6, "hours_per_week": 3,
         "link": "https://swayam.gov.in/nd1_noc19_mg35/preview"},
    ],
    "tally": [
        {"title": "Tally Accounting Software", "provider": "PMKVY", "weeks": 3, "hours_per_week": 6,
         "link": "https://www.pmkvyofficial.org/find-a-training-centre"},
    ],
    "project management": [
        {"title": "Project Management", "provider": "SWAYAM", "weeks": 8, "hours_per_week": 3,
         "link": "https://swayam.gov.in/nd1_noc19_mg19/preview"},
    ],
    "aws": [
        {"title": "Cloud Computing", "provider": "NPTEL", "weeks": 8, "hours_per_week": 4,
         "link": "https://nptel.ac.in/courses/106/105/106105167/"},
        {"title": "AWS Free Tier — Solutions Architect", "provider": "AWS (free)", "weeks": 6, "hours_per_week": 4,
         "link": "https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/"},
    ],
    "nlp": [
        {"title": "Natural Language Processing", "provider": "NPTEL", "weeks": 8, "hours_per_week": 5,
         "link": "https://nptel.ac.in/courses/106/101/106101007/"},
    ],
    "customer service": [
        {"title": "Customer Relationship Management", "provider": "SWAYAM", "weeks": 4, "hours_per_week": 3,
         "link": "https://swayam.gov.in/nd1_noc20_mg45/preview"},
        {"title": "Domestic BPO — PMKVY", "provider": "PMKVY", "weeks": 4, "hours_per_week": 6,
         "link": "https://www.pmkvyofficial.org/find-a-training-centre"},
    ],
    "hr": [
        {"title": "Human Resource Management", "provider": "SWAYAM", "weeks": 8, "hours_per_week": 3,
         "link": "https://swayam.gov.in/nd1_noc19_mg29/preview"},
    ],
    "sales": [
        {"title": "Sales Management", "provider": "SWAYAM", "weeks": 6, "hours_per_week": 3,
         "link": "https://swayam.gov.in/nd1_noc20_mg48/preview"},
    ],
    "content writing": [
        {"title": "Technical Writing", "provider": "SWAYAM", "weeks": 6, "hours_per_week": 3,
         "link": "https://swayam.gov.in/nd1_noc19_hs51/preview"},
    ],
}

# ── Safe target roles (low AI vulnerability) ─────────────────
SAFE_ROLES = {
    "AI Content Reviewer — L1": {
        "required_skills": ["communication", "content writing", "ms office"],
        "vuln_threshold": 40,
    },
    "Data Analyst": {
        "required_skills": ["python", "sql", "excel", "data analysis"],
        "vuln_threshold": 35,
    },
    "Digital Marketing Executive": {
        "required_skills": ["digital marketing", "excel", "communication"],
        "vuln_threshold": 30,
    },
    "HR Operations Specialist": {
        "required_skills": ["hr", "communication", "ms office", "excel"],
        "vuln_threshold": 35,
    },
    "Cloud Support Associate": {
        "required_skills": ["aws", "communication", "sql"],
        "vuln_threshold": 25,
    },
    "Accounts Executive": {
        "required_skills": ["accounting", "tally", "excel"],
        "vuln_threshold": 40,
    },
    "NLP/ML Operations Analyst": {
        "required_skills": ["python", "machine learning", "nlp"],
        "vuln_threshold": 20,
    },
    "Customer Success Manager": {
        "required_skills": ["communication", "crm", "customer service"],
        "vuln_threshold": 35,
    },
    "Project Coordinator": {
        "required_skills": ["project management", "communication", "excel"],
        "vuln_threshold": 30,
    },
    "Sales Development Rep": {
        "required_skills": ["sales", "communication", "crm"],
        "vuln_threshold": 35,
    },
}


async def generate_reskill_path(
    profile_skills: list[str],
    city: str,
    current_role_norm: str,
    risk_score: float,
    max_weeks: int = 12,
) -> dict:
    """
    Returns up to 2 target roles with week-by-week plans.
    """
    db = get_db()

    # Get city posting counts for safe roles
    now = datetime.now(timezone.utc)
    curr_since = (now - timedelta(days=30)).strftime("%Y-%m-%d")

    skill_lower = [s.lower() for s in profile_skills]

    ranked_targets = []
    for role_name, meta in SAFE_ROLES.items():
        required = meta["required_skills"]
        match = compute_skill_match(profile_skills, required)
        gaps = [s for s in required if s.lower() not in skill_lower]

        # Check postings in city
        agg = await db.aggregates.find_one(
            {"city": city, "date": {"$gte": curr_since}},
        )
        postings = agg["posting_count"] if agg else 5

        # Estimate weeks needed based on gap count and course durations
        total_weeks = _estimate_weeks(gaps, max_weeks)
        confidence = max(10, min(95, int(match * 100) + (20 if postings > 5 else 0)))

        ranked_targets.append({
            "role": role_name,
            "match": match,
            "gaps": gaps,
            "postings": postings,
            "total_weeks": total_weeks,
            "confidence": confidence,
        })

    # Sort: prefer high match + high postings
    ranked_targets.sort(key=lambda x: -(x["match"] * 0.7 + (x["postings"] / 20) * 0.3))
    top2 = ranked_targets[:2]

    result = []
    for target in top2:
        weekly_plan = _build_weekly_plan(target["gaps"], profile_skills, target["total_weeks"])
        result.append({
            "role": target["role"],
            "vulnerability_score": SAFE_ROLES[target["role"]]["vuln_threshold"],
            "postings_in_city": target["postings"],
            "weeks": weekly_plan,
            "confidence": target["confidence"],
            "total_weeks": target["total_weeks"],
        })

    # Compute skill gaps across both targets
    all_gaps = list({gap for t in top2 for gap in t["gaps"]})

    return {
        "extracted_skills": profile_skills,
        "skill_gaps": all_gaps,
        "target_roles": result,
    }


def _estimate_weeks(gaps: list[str], max_weeks: int) -> int:
    total = 0
    for skill in gaps:
        courses = COURSE_CATALOG.get(skill, [])
        if courses:
            total += courses[0]["weeks"]
        else:
            total += 2  # Default 2-week generic module
    return min(total, max_weeks) or 4


def _build_weekly_plan(gaps: list[str], have_skills: list[str], total_weeks: int) -> list[dict]:
    """Build concrete week-by-week action plan."""
    plan = []
    week = 1

    # Phase 1: Foundation courses for gaps
    for skill in gaps:
        if week > total_weeks:
            break
        courses = COURSE_CATALOG.get(skill, [])
        if courses:
            c = courses[0]
            end_week = min(week + c["weeks"] - 1, total_weeks)
            plan.append({
                "week": f"Week {week}–{end_week}" if end_week > week else f"Week {week}",
                "action": f"Complete '{c['title']}' ({c['provider']})",
                "resource": c["title"],
                "resource_link": c["link"],
                "hours_per_week": c["hours_per_week"],
            })
            week = end_week + 1
        else:
            plan.append({
                "week": f"Week {week}",
                "action": f"Self-study {skill} via YouTube / free resources",
                "resource": f"{skill} fundamentals",
                "resource_link": f"https://www.youtube.com/results?search_query={skill.replace(' ', '+')}+tutorial",
                "hours_per_week": 3,
            })
            week += 1

    # Phase 2: Practical project
    if week <= total_weeks:
        plan.append({
            "week": f"Week {week}–{min(week + 1, total_weeks)}",
            "action": "Build a portfolio project using your new skills",
            "resource": "Kaggle — free datasets & notebooks",
            "resource_link": "https://www.kaggle.com/",
            "hours_per_week": 5,
        })
        week += 2

    # Phase 3: Certification / PMKVY
    if week <= total_weeks:
        plan.append({
            "week": f"Week {week}",
            "action": "Apply for PMKVY skill certification at nearest centre",
            "resource": "PMKVY Training Centre Locator",
            "resource_link": "https://www.pmkvyofficial.org/find-a-training-centre",
            "hours_per_week": 6,
        })

    return plan