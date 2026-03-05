"""
L1 API Router — SkillsMirage
Endpoints:
  POST /api/l1/scrape          — trigger scraper run
  GET  /api/l1/status          — scraper status & last run info
  GET  /api/l1/trends          — Tab A: hiring trends by city/sector
  GET  /api/l1/skills          — Tab B: rising/declining skills
  GET  /api/l1/vulnerability   — Tab C: AI Vulnerability Index
  GET  /api/l1/jobs            — raw job postings (paginated)
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Query
from fastapi.responses import JSONResponse

from core.database import get_db
from scraper.job_scraper import (
    TARGET_CITIES,
    TARGET_ROLES,
    run_scraper,
    run_aggregator,
)

router = APIRouter()

# In-memory scraper state (simple; Redis in production)
_scraper_state = {
    "running": False,
    "last_run": None,
    "last_result": None,
}


# ────────────────────────────────────────────────────────────
# Scraper control
# ────────────────────────────────────────────────────────────

async def _run_scraper_task(cities, roles):
    _scraper_state["running"] = True
    try:
        result = await run_scraper(cities, roles)
        _scraper_state["last_result"] = result
        _scraper_state["last_run"] = datetime.now(timezone.utc).isoformat()
    except Exception as e:
        _scraper_state["last_result"] = {"error": str(e)}
    finally:
        _scraper_state["running"] = False


@router.post("/scrape")
async def trigger_scrape(
    background_tasks: BackgroundTasks,
    cities: Optional[str] = Query(None, description="Comma-separated cities, default=all"),
    roles: Optional[str] = Query(None, description="Comma-separated roles, default=all"),
):
    """Trigger a scraper run in the background."""
    if _scraper_state["running"]:
        return JSONResponse(
            status_code=409,
            content={"success": False, "message": "Scraper is already running"},
        )

    city_list = [c.strip() for c in cities.split(",")] if cities else None
    role_list = [r.strip() for r in roles.split(",")] if roles else None

    background_tasks.add_task(_run_scraper_task, city_list, role_list)
    return {
        "success": True,
        "message": "Scraper started in background",
        "cities": city_list or TARGET_CITIES,
        "roles": role_list or TARGET_ROLES,
    }


@router.get("/status")
async def scraper_status():
    db = get_db()
    total_posts = await db.job_posts.count_documents({})
    total_aggs = await db.aggregates.count_documents({})
    return {
        "success": True,
        "data": {
            **_scraper_state,
            "total_job_posts": total_posts,
            "total_aggregates": total_aggs,
            "available_cities": TARGET_CITIES,
            "available_roles": TARGET_ROLES,
        },
    }


# ────────────────────────────────────────────────────────────
# Tab A — Hiring Trends
# ────────────────────────────────────────────────────────────

@router.get("/trends")
async def hiring_trends(
    city: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    window: int = Query(30, description="Days: 7 | 30 | 90 | 365"),
):
    """
    Returns posting counts grouped by date for the given city/role.
    Also returns % change vs previous equal window.
    """
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=window)).strftime("%Y-%m-%d")

    match: dict = {"date": {"$gte": since}}
    if city:
        match["city"] = city
    if role:
        match["role_norm"] = role

    pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": {"date": "$date", "city": "$city", "role_norm": "$role_norm"},
                "posting_count": {"$sum": "$posting_count"},
                "ai_mention_rate": {"$avg": "$ai_tool_mention_rate"},
            }
        },
        {"$sort": {"_id.date": 1}},
    ]

    docs = await db.aggregates.aggregate(pipeline).to_list(length=None)

    # Build time-series per city+role
    series: dict = {}
    for d in docs:
        key = f"{d['_id']['city']} — {d['_id']['role_norm']}"
        series.setdefault(key, []).append({
            "date": d["_id"]["date"],
            "count": d["posting_count"],
            "ai_rate": round(d["ai_mention_rate"], 3),
        })

    # Compute trend summary (current window vs prev window)
    prev_since = (datetime.now(timezone.utc) - timedelta(days=window * 2)).strftime("%Y-%m-%d")
    prev_match = {**match, "date": {"$gte": prev_since, "$lt": since}}

    prev_pipeline = [
        {"$match": prev_match},
        {"$group": {"_id": None, "total": {"$sum": "$posting_count"}}},
    ]
    curr_pipeline = [
        {"$match": match},
        {"$group": {"_id": None, "total": {"$sum": "$posting_count"}}},
    ]

    prev_res = await db.aggregates.aggregate(prev_pipeline).to_list(1)
    curr_res = await db.aggregates.aggregate(curr_pipeline).to_list(1)

    prev_total = prev_res[0]["total"] if prev_res else 0
    curr_total = curr_res[0]["total"] if curr_res else 0
    pct_change = (
        round((curr_total - prev_total) / prev_total * 100, 1) if prev_total else 0
    )

    return {
        "success": True,
        "data": {
            "window_days": window,
            "city_filter": city,
            "role_filter": role,
            "current_total": curr_total,
            "previous_total": prev_total,
            "pct_change": pct_change,
            "series": series,
        },
    }


# ────────────────────────────────────────────────────────────
# Tab B — Rising / Declining Skills
# ────────────────────────────────────────────────────────────

@router.get("/skills")
async def skill_trends(
    city: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    limit: int = Query(10),
):
    """
    Returns top rising and declining skills week-over-week.
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    this_week = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    last_week_start = (now - timedelta(days=14)).strftime("%Y-%m-%d")

    base_match: dict = {}
    if city:
        base_match["city"] = city
    if role:
        base_match["role_norm"] = role

    async def _skill_counts(date_gte: str, date_lt: str) -> dict[str, int]:
        match = {**base_match, "date": {"$gte": date_gte, "$lt": date_lt}}
        pipeline = [
            {"$match": match},
            {"$unwind": "$top_skills"},
            {
                "$group": {
                    "_id": "$top_skills.skill",
                    "total": {"$sum": "$top_skills.count"},
                }
            },
        ]
        result = await db.aggregates.aggregate(pipeline).to_list(length=None)
        return {r["_id"]: r["total"] for r in result}

    this_counts = await _skill_counts(this_week, now.strftime("%Y-%m-%d"))
    last_counts = await _skill_counts(last_week_start, this_week)

    all_skills = set(this_counts) | set(last_counts)
    deltas = []
    for sk in all_skills:
        curr = this_counts.get(sk, 0)
        prev = last_counts.get(sk, 0)
        delta = curr - prev
        pct = round(delta / prev * 100, 1) if prev else 100.0
        deltas.append({"skill": sk, "this_week": curr, "last_week": prev, "delta": delta, "pct_change": pct})

    deltas.sort(key=lambda x: -x["delta"])
    rising = deltas[:limit]
    declining = sorted(deltas, key=lambda x: x["delta"])[:limit]

    return {
        "success": True,
        "data": {
            "rising": rising,
            "declining": declining,
            "city_filter": city,
            "role_filter": role,
        },
    }


# ────────────────────────────────────────────────────────────
# Tab C — AI Vulnerability Index
# ────────────────────────────────────────────────────────────

@router.get("/vulnerability")
async def vulnerability_index(
    window: int = Query(30),
):
    """
    Returns AI Vulnerability Index per city x role.
    Score = weighted combo of:
      - hiring decline % (last window vs prev window)
      - AI tool mention rate
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    curr_since = (now - timedelta(days=window)).strftime("%Y-%m-%d")
    prev_since = (now - timedelta(days=window * 2)).strftime("%Y-%m-%d")

    # Current period aggregates
    curr_pipeline = [
        {"$match": {"date": {"$gte": curr_since}}},
        {
            "$group": {
                "_id": {"city": "$city", "role_norm": "$role_norm"},
                "curr_count": {"$sum": "$posting_count"},
                "avg_ai_rate": {"$avg": "$ai_tool_mention_rate"},
            }
        },
    ]

    # Previous period aggregates
    prev_pipeline = [
        {"$match": {"date": {"$gte": prev_since, "$lt": curr_since}}},
        {
            "$group": {
                "_id": {"city": "$city", "role_norm": "$role_norm"},
                "prev_count": {"$sum": "$posting_count"},
            }
        },
    ]

    curr_docs = {
        f"{d['_id']['city']}|{d['_id']['role_norm']}": d
        for d in await db.aggregates.aggregate(curr_pipeline).to_list(length=None)
    }
    prev_docs = {
        f"{d['_id']['city']}|{d['_id']['role_norm']}": d
        for d in await db.aggregates.aggregate(prev_pipeline).to_list(length=None)
    }

    results = []
    for key, curr in curr_docs.items():
        prev = prev_docs.get(key, {})
        city, role = key.split("|", 1)
        curr_count = curr["curr_count"]
        prev_count = prev.get("prev_count", curr_count)
        ai_rate = curr["avg_ai_rate"]

        # hiring_decline: positive = fewer jobs
        if prev_count > 0:
            hiring_decline = max(0, (prev_count - curr_count) / prev_count * 100)
        else:
            hiring_decline = 0

        # Normalize 0-100
        decline_norm = min(hiring_decline, 100)
        ai_norm = min(ai_rate * 200, 100)  # rate 0-0.5 → 0-100

        vuln_score = round(0.6 * decline_norm + 0.4 * ai_norm, 1)

        results.append({
            "city": city,
            "role": role,
            "vulnerability_score": vuln_score,
            "hiring_decline_pct": round(hiring_decline, 1),
            "ai_mention_rate": round(ai_rate, 3),
            "current_postings": curr_count,
            "previous_postings": prev_count,
        })

    results.sort(key=lambda x: -x["vulnerability_score"])

    return {
        "success": True,
        "data": {
            "window_days": window,
            "heatmap": results,
        },
    }


# ────────────────────────────────────────────────────────────
# Raw job posts (paginated)
# ────────────────────────────────────────────────────────────

@router.get("/jobs")
async def list_jobs(
    city: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
):
    db = get_db()
    match: dict = {}
    if city:
        match["city"] = city
    if role:
        match["role_norm"] = role
    if source:
        match["source"] = source

    skip = (page - 1) * limit
    total = await db.job_posts.count_documents(match)
    cursor = db.job_posts.find(match, {"_id": 0, "jd_text": 0}).skip(skip).limit(limit).sort("posted_at", -1)
    jobs = await cursor.to_list(length=limit)

    return {
        "success": True,
        "total": total,
        "page": page,
        "limit": limit,
        "data": jobs,
    }