"""
NLP Service — extracts skills from a worker's free-text writeup.
Uses regex pattern matching (no heavy ML deps needed for MVP).
"""

import re

# ── Master skill vocabulary ──────────────────────────────────
SKILL_VOCAB = {
    # Tech
    "python": ["python", "py"],
    "java": ["java", "j2ee", "spring boot"],
    "javascript": ["javascript", "js", "node.js", "nodejs"],
    "react": ["react", "reactjs"],
    "sql": ["sql", "mysql", "postgresql", "postgres", "sqlite"],
    "excel": ["excel", "ms excel", "spreadsheet"],
    "power bi": ["power bi", "powerbi"],
    "tableau": ["tableau"],
    "aws": ["aws", "amazon web services", "ec2", "s3"],
    "azure": ["azure", "microsoft azure"],
    "gcp": ["gcp", "google cloud"],
    "machine learning": ["machine learning", "ml", "scikit", "sklearn"],
    "deep learning": ["deep learning", "tensorflow", "pytorch", "keras"],
    "nlp": ["nlp", "natural language processing", "text analytics"],
    "data analysis": ["data analysis", "data analytics", "data science"],
    "tally": ["tally", "tally erp"],
    "sap": ["sap", "sap erp", "sap fico"],
    "crm": ["crm", "salesforce", "zoho crm", "hubspot"],
    "ms office": ["ms office", "microsoft office", "word", "powerpoint", "outlook"],
    "accounting": ["accounting", "bookkeeping", "gst", "tds", "accounts"],
    # Soft skills
    "communication": ["communication", "verbal", "written communication", "presentation"],
    "customer service": ["customer service", "customer support", "customer care"],
    "data entry": ["data entry", "data processing", "typing"],
    "digital marketing": ["digital marketing", "seo", "sem", "social media marketing", "google ads"],
    "content writing": ["content writing", "copywriting", "blog", "article writing"],
    "hr": ["recruitment", "hr", "human resources", "payroll", "onboarding"],
    "sales": ["sales", "business development", "b2b", "b2c", "lead generation"],
    "project management": ["project management", "agile", "scrum", "jira"],
}


def extract_skills(text: str) -> list[str]:
    """
    Extract known skills from free text.
    Returns a deduplicated list of canonical skill names.
    """
    text_lower = text.lower()
    found = set()

    for canonical, aliases in SKILL_VOCAB.items():
        for alias in aliases:
            # Use word-boundary matching for short terms to avoid false positives
            pattern = r'\b' + re.escape(alias) + r'\b'
            if re.search(pattern, text_lower):
                found.add(canonical)
                break

    return sorted(found)


def compute_skill_match(profile_skills: list[str], posting_skills: list[str]) -> float:
    """
    Jaccard similarity between profile skills and top skills in postings.
    Returns 0.0 - 1.0.
    """
    if not profile_skills or not posting_skills:
        return 0.0
    a = set(s.lower() for s in profile_skills)
    b = set(s.lower() for s in posting_skills)
    intersection = a & b
    union = a | b
    return len(intersection) / len(union) if union else 0.0


def experience_penalty(xp_years: float) -> float:
    """
    Returns 0-1 penalty. Extremes (very new or very senior) score higher risk.
    Sweet spot is 3-8 years.
    """
    if xp_years < 1:
        return 0.7
    elif xp_years <= 3:
        return 0.3
    elif xp_years <= 8:
        return 0.1
    elif xp_years <= 15:
        return 0.2
    else:
        return 0.5