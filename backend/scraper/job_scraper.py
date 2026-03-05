"""
L1 Job Scraper — SkillsMirage
Scrapes Naukri.com (primary) with a LinkedIn fallback.
Uses requests + BeautifulSoup; no headless browser needed for the MVP.
"""

import asyncio
import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from core.database import get_db

# ── AI / automation keywords tracked in JDs ─────────────────
AI_KEYWORDS = [
    "artificial intelligence", "machine learning", "automation", "chatgpt",
    "generative ai", "llm", "robotic process automation", "rpa", "copilot",
    "ai-powered", "deep learning", "neural network", "nlp", "computer vision",
    "auto-ml", "automl", "openai",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
}

# ── Cities & roles to track ──────────────────────────────────
TARGET_CITIES = [
    "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune",
    "Chennai", "Kolkata", "Jaipur", "Ahmedabad", "Noida",
]

TARGET_ROLES = [
    "Data Entry", "BPO", "Data Analyst", "Software Engineer",
    "Customer Support", "Content Writer", "HR Executive",
    "Accountant", "Sales Executive", "Digital Marketing",
]


# ────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────

def _post_id(title: str, company: str, city: str, source: str) -> str:
    """Deterministic dedupe key."""
    raw = f"{title}|{company}|{city}|{source}".lower()
    return hashlib.md5(raw.encode()).hexdigest()


def _count_ai_mentions(text: str) -> int:
    t = text.lower()
    return sum(1 for kw in AI_KEYWORDS if kw in t)


def _extract_skills(text: str) -> list[str]:
    """Naive skill extraction — looks for common tech terms."""
    SKILL_PATTERNS = [
        r'\bpython\b', r'\bjava\b', r'\bsql\b', r'\bexcel\b', r'\bpowerpoint\b',
        r'\btableau\b', r'\bpower bi\b', r'\baws\b', r'\bazure\b', r'\bgcp\b',
        r'\bjavascript\b', r'\breact\b', r'\bnode\.?js\b', r'\bdjango\b',
        r'\bmachine learning\b', r'\bdeep learning\b', r'\bnlp\b',
        r'\bcustomer service\b', r'\bcommunication\b', r'\bms office\b',
        r'\btally\b', r'\bsap\b', r'\bcrm\b', r'\bsalesforce\b',
        r'\bdata entry\b', r'\btyping\b', r'\baccounting\b',
    ]
    found = []
    t = text.lower()
    for pat in SKILL_PATTERNS:
        if re.search(pat, t):
            found.append(re.sub(r'\\b|\\', '', pat).strip())
    return list(set(found))


# ────────────────────────────────────────────────────────────
# Naukri scraper
# ────────────────────────────────────────────────────────────

async def _scrape_naukri(role: str, city: str, client: httpx.AsyncClient) -> list[dict]:
    """Scrape Naukri search results page for role+city."""
    role_slug = role.lower().replace(" ", "-")
    city_slug = city.lower().replace(" ", "-")
    url = f"https://www.naukri.com/{role_slug}-jobs-in-{city_slug}"

    posts = []
    try:
        resp = await client.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return posts

        soup = BeautifulSoup(resp.text, "html.parser")

        # Naukri renders job cards with these classes (may shift over time)
        cards = soup.select("article.jobTuple") or soup.select("div.jobTupleHeader")
        if not cards:
            # Try JSON-LD embedded data
            scripts = soup.find_all("script", type="application/ld+json")
            for sc in scripts:
                try:
                    data = json.loads(sc.string or "")
                    if isinstance(data, list):
                        items = data
                    elif data.get("@type") == "ItemList":
                        items = data.get("itemListElement", [])
                    else:
                        items = [data]
                    for item in items:
                        job = item.get("item", item)
                        title = job.get("title", role)
                        company = job.get("hiringOrganization", {}).get("name", "Unknown") if isinstance(job.get("hiringOrganization"), dict) else job.get("hiringOrganization", "Unknown")
                        desc = job.get("description", "")
                        posts.append({
                            "post_id": _post_id(title, company, city, "naukri"),
                            "title": title,
                            "company": company,
                            "city": city,
                            "role_norm": role,
                            "skills": _extract_skills(desc),
                            "jd_text": desc[:2000],
                            "salary": job.get("baseSalary", {}).get("value", {}).get("value", "") if isinstance(job.get("baseSalary"), dict) else "",
                            "source": "naukri",
                            "posted_at": datetime.now(timezone.utc),
                            "ai_tool_mentions": _count_ai_mentions(desc),
                            "raw_url": url,
                        })
                except Exception:
                    continue
            return posts

        for card in cards[:20]:
            title_el = card.select_one("a.title") or card.select_one(".jobTitle")
            company_el = card.select_one("a.subTitle") or card.select_one(".companyName")
            skills_el = card.select_one("ul.tags") or card.select_one(".skills")
            salary_el = card.select_one("li.salary") or card.select_one(".salary")

            title = title_el.get_text(strip=True) if title_el else role
            company = company_el.get_text(strip=True) if company_el else "Unknown"
            skills_text = skills_el.get_text(" ", strip=True) if skills_el else ""
            salary = salary_el.get_text(strip=True) if salary_el else ""
            jd = card.get_text(" ", strip=True)

            posts.append({
                "post_id": _post_id(title, company, city, "naukri"),
                "title": title,
                "company": company,
                "city": city,
                "role_norm": role,
                "skills": _extract_skills(skills_text + " " + jd),
                "jd_text": jd[:2000],
                "salary": salary,
                "source": "naukri",
                "posted_at": datetime.now(timezone.utc),
                "ai_tool_mentions": _count_ai_mentions(jd),
                "raw_url": url,
            })
    except Exception as e:
        print(f"  [Naukri] {role}/{city} error: {e}")

    return posts


# ────────────────────────────────────────────────────────────
# LinkedIn scraper (public search, no login)
# ────────────────────────────────────────────────────────────

async def _scrape_linkedin(role: str, city: str, client: httpx.AsyncClient) -> list[dict]:
    """LinkedIn public job search (no auth required for listing pages)."""
    url = (
        "https://www.linkedin.com/jobs/search/"
        f"?keywords={role.replace(' ', '%20')}"
        f"&location={city.replace(' ', '%20')}%2C%20India"
        "&f_TPR=r604800"   # last 7 days
    )
    posts = []
    try:
        resp = await client.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return posts

        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.select("div.base-card") or soup.select("li.jobs-search-results__list-item")

        for card in cards[:15]:
            title_el = card.select_one("h3.base-search-card__title") or card.select_one("span.sr-only")
            company_el = card.select_one("h4.base-search-card__subtitle")
            location_el = card.select_one("span.job-search-card__location")

            title = title_el.get_text(strip=True) if title_el else role
            company = company_el.get_text(strip=True) if company_el else "Unknown"
            jd = card.get_text(" ", strip=True)

            posts.append({
                "post_id": _post_id(title, company, city, "linkedin"),
                "title": title,
                "company": company,
                "city": city,
                "role_norm": role,
                "skills": _extract_skills(jd),
                "jd_text": jd[:2000],
                "salary": "",
                "source": "linkedin",
                "posted_at": datetime.now(timezone.utc),
                "ai_tool_mentions": _count_ai_mentions(jd),
                "raw_url": url,
            })
    except Exception as e:
        print(f"  [LinkedIn] {role}/{city} error: {e}")

    return posts


# ────────────────────────────────────────────────────────────
# Seed realistic fallback data (used when scraping is blocked)
# ────────────────────────────────────────────────────────────

def _seed_fallback_posts(role: str, city: str) -> list[dict]:
    """Return plausible synthetic posts so the pipeline always has data."""
    import random
    companies = {
        "BPO": ["Wipro BPS", "Genpact", "Infosys BPM", "HCL BPO", "Concentrix"],
        "Data Entry": ["Tata Consultancy", "iEnergizer", "Teleperformance", "Sutherland"],
        "Data Analyst": ["Mu Sigma", "Fractal Analytics", "Tiger Analytics", "Flipkart"],
        "Software Engineer": ["Infosys", "TCS", "Wipro", "HCL Technologies", "Tech Mahindra"],
        "Customer Support": ["Amazon", "Flipkart", "Zomato", "HDFC Bank", "Airtel"],
        "Content Writer": ["iProspect", "Webchutney", "Mirum India", "WATConsult"],
        "HR Executive": ["Naukri.com", "TeamLease", "Randstad", "Manpower Group"],
        "Accountant": ["Deloitte", "KPMG", "EY", "Grant Thornton", "BDO India"],
        "Sales Executive": ["HDFC Life", "Bajaj Allianz", "Max Life", "Asian Paints"],
        "Digital Marketing": ["WATConsult", "iProspect", "Dentsu", "Ogilvy India"],
    }.get(role, ["Unknown Corp"])

    skill_map = {
        "BPO": ["communication", "customer service", "ms office", "typing", "crm"],
        "Data Entry": ["data entry", "typing", "ms office", "tally", "excel"],
        "Data Analyst": ["python", "sql", "tableau", "excel", "power bi"],
        "Software Engineer": ["python", "java", "javascript", "sql", "aws"],
        "Customer Support": ["communication", "crm", "ms office", "customer service"],
        "Content Writer": ["communication", "ms office", "excel"],
        "HR Executive": ["communication", "ms office", "excel", "sap"],
        "Accountant": ["tally", "excel", "accounting", "sap"],
        "Sales Executive": ["communication", "crm", "salesforce"],
        "Digital Marketing": ["digital marketing", "excel", "ms office"],
    }.get(role, ["communication"])

    ai_jd_phrases = [
        "Experience with AI tools preferred.",
        "Will work alongside automation workflows.",
        "Familiarity with RPA tools is a plus.",
        "",
        "ChatGPT / Copilot usage experience desirable.",
        "",
    ]

    posts = []
    count = random.randint(8, 18)
    for i in range(count):
        company = random.choice(companies)
        jd_extra = random.choice(ai_jd_phrases)
        jd = (
            f"We are hiring {role} professionals for our {city} office. "
            f"Required skills: {', '.join(skill_map)}. {jd_extra} "
            f"CTC: {random.randint(2, 12)} LPA. Immediate joiners preferred."
        )
        posts.append({
            "post_id": _post_id(f"{role}-{i}", company, city, "seed"),
            "title": role,
            "company": company,
            "city": city,
            "role_norm": role,
            "skills": skill_map,
            "jd_text": jd,
            "salary": f"{random.randint(2, 12)} LPA",
            "source": "seed",
            "posted_at": datetime.now(timezone.utc),
            "ai_tool_mentions": _count_ai_mentions(jd),
            "raw_url": "",
        })
    return posts


# ────────────────────────────────────────────────────────────
# Main pipeline entry point
# ────────────────────────────────────────────────────────────

async def run_scraper(
    cities: Optional[list[str]] = None,
    roles: Optional[list[str]] = None,
) -> dict:
    """
    Scrape job postings for given cities × roles.
    Upserts into MongoDB `job_posts` collection.
    Returns summary stats.
    """
    cities = cities or TARGET_CITIES
    roles = roles or TARGET_ROLES
    db = get_db()

    # Ensure indexes
    await db.job_posts.create_index("post_id", unique=True)
    await db.job_posts.create_index([("city", 1), ("role_norm", 1)])
    await db.job_posts.create_index("posted_at")

    total_new = 0
    total_seen = 0
    errors = []

    async with httpx.AsyncClient(follow_redirects=True) as client:
        for city in cities:
            for role in roles:
                print(f"  Scraping {role} / {city} …")
                posts: list[dict] = []

                # Try live scraping first
                naukri_posts = await _scrape_naukri(role, city, client)
                linkedin_posts = await _scrape_linkedin(role, city, client)
                posts = naukri_posts + linkedin_posts

                # Fall back to seed data if scraping returned nothing
                if not posts:
                    print(f"    ↳ no live data, using seed fallback")
                    posts = _seed_fallback_posts(role, city)

                # Upsert into MongoDB
                for post in posts:
                    try:
                        result = await db.job_posts.update_one(
                            {"post_id": post["post_id"]},
                            {"$setOnInsert": post},
                            upsert=True,
                        )
                        if result.upserted_id:
                            total_new += 1
                        else:
                            total_seen += 1
                    except Exception as e:
                        errors.append(str(e))

                # Small delay to avoid rate-limiting
                await asyncio.sleep(0.5)

    # Run aggregation after scraping
    await run_aggregator()

    return {
        "new_posts": total_new,
        "existing_posts": total_seen,
        "errors": errors[:10],
        "ran_at": datetime.now(timezone.utc).isoformat(),
    }


# ────────────────────────────────────────────────────────────
# Aggregator — builds daily rollups
# ────────────────────────────────────────────────────────────

async def run_aggregator():
    """
    Aggregates raw job_posts into the `aggregates` collection.
    Groups by (city, role_norm, date) and computes:
      - posting_count
      - ai_tool_mention_rate
      - top_skills
    """
    db = get_db()
    pipeline = [
        {
            "$group": {
                "_id": {
                    "city": "$city",
                    "role_norm": "$role_norm",
                    "date": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": "$posted_at",
                        }
                    },
                },
                "posting_count": {"$sum": 1},
                "total_ai_mentions": {"$sum": "$ai_tool_mentions"},
                "all_skills": {"$push": "$skills"},
                "sources": {"$addToSet": "$source"},
            }
        },
        {
            "$addFields": {
                "ai_tool_mention_rate": {
                    "$cond": [
                        {"$gt": ["$posting_count", 0]},
                        {"$divide": ["$total_ai_mentions", "$posting_count"]},
                        0,
                    ]
                }
            }
        },
    ]

    async for doc in db.job_posts.aggregate(pipeline):
        key = doc["_id"]
        # Flatten skills
        flat_skills: list[str] = []
        for sublist in doc.get("all_skills", []):
            flat_skills.extend(sublist)
        # Count skill frequency
        skill_freq: dict[str, int] = {}
        for s in flat_skills:
            skill_freq[s] = skill_freq.get(s, 0) + 1
        top_skills = sorted(skill_freq.items(), key=lambda x: -x[1])[:10]

        agg_doc = {
            "city": key["city"],
            "role_norm": key["role_norm"],
            "date": key["date"],
            "posting_count": doc["posting_count"],
            "ai_tool_mention_rate": round(doc["ai_tool_mention_rate"], 4),
            "top_skills": [{"skill": s, "count": c} for s, c in top_skills],
            "sources": doc.get("sources", []),
            "updated_at": datetime.now(timezone.utc),
        }

        await db.aggregates.update_one(
            {"city": key["city"], "role_norm": key["role_norm"], "date": key["date"]},
            {"$set": agg_doc},
            upsert=True,
        )

    # Ensure indexes on aggregates
    await db.aggregates.create_index([("city", 1), ("role_norm", 1), ("date", 1)])
    print("Aggregation complete")