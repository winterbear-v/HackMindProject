"""
L1 Job Scraper — SkillsMirage
Primary : JSearch API (RapidAPI) — real data, real dates, multiple date points per call
Fallback : Seed data spread across 30 days — always gives a proper time-series
"""

import asyncio, hashlib, os, re
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from dotenv import load_dotenv
from core.database import get_db

load_dotenv()

JSEARCH_API_KEY = os.getenv("JSEARCH_API_KEY", "")
JSEARCH_URL     = "https://jsearch.p.rapidapi.com/search"
JSEARCH_HEADERS = {
    "X-RapidAPI-Key":  JSEARCH_API_KEY,
    "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
}

AI_KEYWORDS = [
    "artificial intelligence","machine learning","automation","chatgpt",
    "generative ai","llm","robotic process automation","rpa","copilot",
    "ai-powered","deep learning","neural network","nlp","computer vision",
    "automl","openai","genai","large language model",
]

TARGET_CITIES = [
    "Bangalore","Mumbai","Delhi","Hyderabad","Pune",
    "Chennai","Kolkata","Jaipur","Ahmedabad","Noida",
    "Indore","Nagpur","Chandigarh","Bhopal","Lucknow",
    "Kochi","Coimbatore","Surat","Vadodara","Patna",
]

TARGET_ROLES = [
    "Data Entry","BPO","Data Analyst","Software Engineer",
    "Customer Support","Content Writer","HR Executive",
    "Accountant","Sales Executive","Digital Marketing",
]

SKILL_PATTERNS = [
    r'\bpython\b',r'\bjava\b',r'\bsql\b',r'\bexcel\b',r'\bpowerpoint\b',
    r'\btableau\b',r'\bpower bi\b',r'\baws\b',r'\bazure\b',r'\bgcp\b',
    r'\bjavascript\b',r'\breact\b',r'\bnode\.?js\b',r'\bdjango\b',
    r'\bmachine learning\b',r'\bdeep learning\b',r'\bnlp\b',
    r'\bcustomer service\b',r'\bcommunication\b',r'\bms office\b',
    r'\btally\b',r'\bsap\b',r'\bcrm\b',r'\bsalesforce\b',
    r'\bdata entry\b',r'\btyping\b',r'\baccounting\b',
    r'\bdigital marketing\b',r'\bseo\b',r'\bcontent writing\b',
]

# PMKVY / SWAYAM trained skills — for gap map in Skills tab
PMKVY_TRAINED_SKILLS = [
    "data entry","tally","ms office","typing","communication",
    "customer service","accounting","sap","crm","excel",
    "digital marketing","seo","content writing","python","sql",
]


def _post_id(title, company, city, source):
    return hashlib.md5(f"{title}|{company}|{city}|{source}".lower().encode()).hexdigest()

def _count_ai_mentions(text):
    t = text.lower()
    return sum(1 for kw in AI_KEYWORDS if kw in t)

def _extract_skills(text):
    found, t = [], text.lower()
    for pat in SKILL_PATTERNS:
        if re.search(pat, t):
            found.append(re.sub(r'\\b|\\','',pat).strip())
    return list(set(found))

def _parse_posted_at(job):
    dt_str = job.get("job_posted_at_datetime_utc")
    if dt_str:
        try: return datetime.fromisoformat(dt_str.replace("Z","+00:00"))
        except: pass
    ts = job.get("job_posted_at_timestamp")
    if ts:
        try: return datetime.fromtimestamp(int(ts), tz=timezone.utc)
        except: pass
    return datetime.now(timezone.utc)


async def _fetch_jsearch(role, city, client):
    if not JSEARCH_API_KEY or JSEARCH_API_KEY == "your_rapidapi_key_here":
        return []
    params = {
        "query":      f"{role} jobs in {city} India",
        "page":       "1",
        "num_pages":  "1",
        "date_posted":"month",
        "country":    "in",
        "language":   "en",
    }
    posts = []
    try:
        resp = await client.get(JSEARCH_URL, headers=JSEARCH_HEADERS, params=params, timeout=20)
        if resp.status_code == 429:
            print(f"  [JSearch] Rate limited for {role}/{city}")
            return []
        if resp.status_code != 200:
            print(f"  [JSearch] {resp.status_code} for {role}/{city}")
            return []
        jobs = resp.json().get("data", [])
        for job in jobs:
            title   = job.get("job_title", role)
            company = job.get("employer_name", "Unknown")
            desc    = job.get("job_description", "")
            min_s   = job.get("job_min_salary")
            max_s   = job.get("job_max_salary")
            curr    = job.get("job_salary_currency","INR")
            salary  = f"{curr} {min_s}–{max_s}" if min_s and max_s else (f"{curr} {min_s}+" if min_s else "")
            posts.append({
                "post_id":          job.get("job_id") or _post_id(title, company, city, "jsearch"),
                "title":            title,
                "company":          company,
                "city":             city,
                "role_norm":        role,
                "skills":           _extract_skills(desc),
                "jd_text":          desc[:2000],
                "salary":           salary,
                "source":           "jsearch",
                "posted_at":        _parse_posted_at(job),
                "ai_tool_mentions": _count_ai_mentions(desc),
                "raw_url":          job.get("job_apply_link",""),
            })
        print(f"  [JSearch] ✅ {len(posts)} jobs — {role}/{city}")
    except Exception as e:
        print(f"  [JSearch] Error {role}/{city}: {e}")
    return posts


def _seed_fallback_posts(role, city):
    import random
    companies = {
        "BPO":              ["Wipro BPS","Genpact","Infosys BPM","HCL BPO","Concentrix"],
        "Data Entry":       ["Tata Consultancy","iEnergizer","Teleperformance","Sutherland"],
        "Data Analyst":     ["Mu Sigma","Fractal Analytics","Tiger Analytics","Flipkart"],
        "Software Engineer":["Infosys","TCS","Wipro","HCL Technologies","Tech Mahindra"],
        "Customer Support": ["Amazon","Flipkart","Zomato","HDFC Bank","Airtel"],
        "Content Writer":   ["iProspect","Webchutney","Mirum India","WATConsult"],
        "HR Executive":     ["Naukri.com","TeamLease","Randstad","Manpower Group"],
        "Accountant":       ["Deloitte","KPMG","EY","Grant Thornton","BDO India"],
        "Sales Executive":  ["HDFC Life","Bajaj Allianz","Max Life","Asian Paints"],
        "Digital Marketing":["WATConsult","iProspect","Dentsu","Ogilvy India"],
    }.get(role, ["Unknown Corp"])
    skill_map = {
        "BPO":              ["communication","customer service","ms office","typing","crm"],
        "Data Entry":       ["data entry","typing","ms office","tally","excel"],
        "Data Analyst":     ["python","sql","tableau","excel","power bi"],
        "Software Engineer":["python","java","javascript","sql","aws"],
        "Customer Support": ["communication","crm","ms office","customer service"],
        "Content Writer":   ["communication","ms office","content writing"],
        "HR Executive":     ["communication","ms office","excel","sap"],
        "Accountant":       ["tally","excel","accounting","sap"],
        "Sales Executive":  ["communication","crm","salesforce"],
        "Digital Marketing":["digital marketing","excel","ms office","seo"],
    }.get(role, ["communication"])
    ai_phrases = [
        "Experience with AI tools preferred.",
        "Will work alongside automation workflows.",
        "Familiarity with RPA tools is a plus.",
        "ChatGPT / Copilot usage experience desirable.",
        "Our team uses automation to streamline processes.",
        "","","",
    ]
    posts, now = [], datetime.now(timezone.utc)
    for i in range(random.randint(25, 40)):
        company   = random.choice(companies)
        jd_extra  = random.choice(ai_phrases)
        days_ago  = random.randint(0, 29)
        posted_at = now - timedelta(days=days_ago)
        jd = (f"We are hiring {role} professionals for our {city} office. "
              f"Required skills: {', '.join(skill_map)}. {jd_extra} "
              f"CTC: {random.randint(2,12)} LPA. Immediate joiners preferred.")
        posts.append({
            "post_id":          _post_id(f"{role}-{city}-{i}-{days_ago}", company, city, "seed"),
            "title":            role,
            "company":          company,
            "city":             city,
            "role_norm":        role,
            "skills":           skill_map,
            "jd_text":          jd,
            "salary":           f"{random.randint(2,12)} LPA",
            "source":           "seed",
            "posted_at":        posted_at,
            "ai_tool_mentions": _count_ai_mentions(jd),
            "raw_url":          "",
        })
    return posts


async def run_scraper(cities=None, roles=None):
    cities = cities or TARGET_CITIES
    roles  = roles  or TARGET_ROLES
    db     = get_db()

    await db.job_posts.create_index("post_id", unique=True)
    await db.job_posts.create_index([("city",1),("role_norm",1)])
    await db.job_posts.create_index("posted_at")

    total_new = total_seen = api_calls = 0
    errors = []
    MAX_API_CALLS = 50  # stay within free tier

    async with httpx.AsyncClient(follow_redirects=True) as client:
        for city in cities:
            for role in roles:
                print(f"  {role} / {city} …")
                posts = []
                if JSEARCH_API_KEY and JSEARCH_API_KEY != "your_rapidapi_key_here" and api_calls < MAX_API_CALLS:
                    posts = await _fetch_jsearch(role, city, client)
                    api_calls += 1
                    await asyncio.sleep(1.2)
                if not posts:
                    print(f"    ↳ seed fallback")
                    posts = _seed_fallback_posts(role, city)
                for post in posts:
                    try:
                        r = await db.job_posts.update_one(
                            {"post_id": post["post_id"]},
                            {"$setOnInsert": post},
                            upsert=True,
                        )
                        if r.upserted_id: total_new += 1
                        else:             total_seen += 1
                    except Exception as e:
                        errors.append(str(e))

    await run_aggregator()
    return {
        "new_posts": total_new, "existing_posts": total_seen,
        "api_calls_used": api_calls, "errors": errors[:10],
        "ran_at": datetime.now(timezone.utc).isoformat(),
    }


async def run_aggregator():
    db = get_db()
    pipeline = [
        {"$group": {
            "_id": {
                "city": "$city", "role_norm": "$role_norm",
                "date": {"$dateToString": {"format":"%Y-%m-%d","date":"$posted_at"}},
            },
            "posting_count":     {"$sum": 1},
            "total_ai_mentions": {"$sum": "$ai_tool_mentions"},
            "all_skills":        {"$push": "$skills"},
            "sources":           {"$addToSet": "$source"},
        }},
        {"$addFields": {"ai_tool_mention_rate": {
            "$cond": [{"$gt":["$posting_count",0]},
                      {"$divide":["$total_ai_mentions","$posting_count"]}, 0]
        }}},
    ]
    async for doc in db.job_posts.aggregate(pipeline):
        key = doc["_id"]
        flat = [s for sub in doc.get("all_skills",[]) for s in sub]
        freq = {}
        for s in flat: freq[s] = freq.get(s,0)+1
        top  = sorted(freq.items(), key=lambda x:-x[1])[:10]
        agg  = {
            "city": key["city"], "role_norm": key["role_norm"], "date": key["date"],
            "posting_count": doc["posting_count"],
            "ai_tool_mention_rate": round(doc["ai_tool_mention_rate"],4),
            "top_skills": [{"skill":s,"count":c} for s,c in top],
            "sources":    doc.get("sources",[]),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.aggregates.update_one(
            {"city":key["city"],"role_norm":key["role_norm"],"date":key["date"]},
            {"$set": agg}, upsert=True,
        )
    await db.aggregates.create_index([("city",1),("role_norm",1),("date",1)])
    print("✅ Aggregation complete")