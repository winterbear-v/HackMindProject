"""
L2 API Router — SkillsMirage Worker Intelligence
Endpoints:
  POST /api/l2/profile          — create worker profile + extract skills
  GET  /api/l2/profile/:id      — get profile
  GET  /api/l2/profiles/me      — all profiles for current user
  POST /api/l2/profile/:id/score    — compute risk score
  POST /api/l2/profile/:id/reskill  — generate reskilling path
  POST /api/l2/chat             — chatbot (Claude + RAG)
  GET  /api/l2/samples          — preloaded sample profiles
"""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from core.database import get_db
from middleware.auth import get_current_user
from schemas.l2 import ChatRequest, ProfileCreate
from services.chat_service import ask_claude
from services.nlp_service import extract_skills
from services.reskill_service import generate_reskill_path
from services.risk_service import _normalize_title, compute_risk_score

router = APIRouter()


# ────────────────────────────────────────────────────────────
# Preloaded sample profiles for demo
# ────────────────────────────────────────────────────────────

SAMPLE_PROFILES = [
    {
        "title": "BPO Executive",
        "city": "Pune",
        "xp_years": 3,
        "writeup": (
            "I work as a BPO executive handling inbound customer calls for a telecom client. "
            "My daily tasks include resolving customer queries, updating CRM records, "
            "and escalating technical issues. I use MS Office and the company's internal CRM tool. "
            "I have basic communication skills and am comfortable with typing and data entry. "
            "Recently heard that AI bots are replacing many voice process roles in my company."
        ),
    },
    {
        "title": "Data Entry Operator",
        "city": "Jaipur",
        "xp_years": 2,
        "writeup": (
            "I do data entry work for a logistics company in Jaipur. I enter invoice details, "
            "shipment records, and customer data into Excel and Tally. I work 8 hours a day "
            "mostly on repetitive tasks. I can type fast — around 40 WPM. "
            "I have basic knowledge of MS Office. My manager told us that they are evaluating "
            "automation software to replace manual data entry."
        ),
    },
    {
        "title": "Data Analyst",
        "city": "Bangalore",
        "xp_years": 4,
        "writeup": (
            "I am a data analyst at a fintech startup in Bangalore. I use Python, SQL, and Tableau "
            "daily for creating dashboards and business reports. I have experience with data cleaning, "
            "EDA, and statistical analysis. I also know basic machine learning using scikit-learn. "
            "Recently started exploring Power BI. Looking to upskill in deep learning and NLP."
        ),
    },
    {
        "title": "HR Executive",
        "city": "Mumbai",
        "xp_years": 6,
        "writeup": (
            "I manage recruitment and onboarding for a mid-size IT company in Mumbai. "
            "I use Excel, LinkedIn Recruiter, and our internal HRMS. I handle payroll coordination, "
            "offer letters, and employee engagement activities. I have good communication skills "
            "and knowledge of HR compliance. Looking to learn SAP HR module."
        ),
    },
    {
        "title": "Accountant",
        "city": "Chennai",
        "xp_years": 8,
        "writeup": (
            "I work as an accountant in a manufacturing company in Chennai. I handle GST filing, "
            "TDS, accounts payable/receivable using Tally ERP. I prepare monthly MIS reports "
            "in Excel. I also handle bank reconciliation and audit preparation. "
            "I have 8 years experience and am looking to learn SAP FICO to stay relevant."
        ),
    },
]


# ────────────────────────────────────────────────────────────
# Profile CRUD
# ────────────────────────────────────────────────────────────

@router.post("/profile", status_code=201)
async def create_profile(
    body: ProfileCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    extracted = extract_skills(body.writeup)
    now = datetime.now(timezone.utc)

    doc = {
        "user_id": current_user["id"],
        "title": body.title,
        "city": body.city,
        "xp_years": body.xp_years,
        "writeup": body.writeup,
        "extracted_skills": extracted,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.profiles.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()

    return {"success": True, "data": doc}


@router.get("/profile/{profile_id}")
async def get_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        doc = await db.profiles.find_one({"_id": ObjectId(profile_id)})
    except Exception:
        raise HTTPException(status_code=404, detail={"success": False, "message": "Profile not found"})

    if not doc:
        raise HTTPException(status_code=404, detail={"success": False, "message": "Profile not found"})

    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    return {"success": True, "data": doc}


@router.get("/profiles/me")
async def my_profiles(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.profiles.find(
        {"user_id": current_user["id"]},
        {"writeup": 0},
    ).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    for d in docs:
        d["id"] = str(d["_id"])
        d.pop("_id", None)
        d["created_at"] = d["created_at"].isoformat()
        d["updated_at"] = d["updated_at"].isoformat()
    return {"success": True, "data": docs}


# ────────────────────────────────────────────────────────────
# Risk Score
# ────────────────────────────────────────────────────────────

@router.post("/profile/{profile_id}/score")
async def score_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        profile = await db.profiles.find_one({"_id": ObjectId(profile_id)})
    except Exception:
        raise HTTPException(status_code=404, detail={"success": False, "message": "Profile not found"})
    if not profile:
        raise HTTPException(status_code=404, detail={"success": False, "message": "Profile not found"})

    risk = await compute_risk_score(
        title=profile["title"],
        city=profile["city"],
        xp_years=profile["xp_years"],
        extracted_skills=profile["extracted_skills"],
    )

    # Cache result
    await db.risk_cache.update_one(
        {"profile_id": profile_id},
        {"$set": {**risk, "profile_id": profile_id, "computed_at": datetime.now(timezone.utc)}},
        upsert=True,
    )

    return {"success": True, "data": risk}


# ────────────────────────────────────────────────────────────
# Reskilling Path
# ────────────────────────────────────────────────────────────

@router.post("/profile/{profile_id}/reskill")
async def reskill_profile(
    profile_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        profile = await db.profiles.find_one({"_id": ObjectId(profile_id)})
    except Exception:
        raise HTTPException(status_code=404, detail={"success": False, "message": "Profile not found"})
    if not profile:
        raise HTTPException(status_code=404, detail={"success": False, "message": "Profile not found"})

    # Get cached risk score if available
    cached = await db.risk_cache.find_one({"profile_id": profile_id})
    risk_score = cached["score"] if cached else 50

    reskill = await generate_reskill_path(
        profile_skills=profile["extracted_skills"],
        city=profile["city"],
        current_role_norm=_normalize_title(profile["title"]),
        risk_score=risk_score,
    )

    return {"success": True, "data": reskill}


# ────────────────────────────────────────────────────────────
# Chatbot
# ────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        profile = await db.profiles.find_one({"_id": ObjectId(body.profile_id)})
    except Exception:
        raise HTTPException(status_code=404, detail={"success": False, "message": "Profile not found"})
    if not profile:
        raise HTTPException(status_code=404, detail={"success": False, "message": "Profile not found"})

    profile["id"] = str(profile["_id"])
    profile["name"] = current_user.get("name", "Worker")

    # Get cached risk + reskill
    cached_risk = await db.risk_cache.find_one({"profile_id": body.profile_id})
    risk_result = cached_risk or {"score": 50, "level": "MEDIUM", "drivers": {}}

    reskill_result = await generate_reskill_path(
        profile_skills=profile["extracted_skills"],
        city=profile["city"],
        current_role_norm=_normalize_title(profile["title"]),
        risk_score=risk_result.get("score", 50),
    )

    answer = await ask_claude(
        profile=profile,
        question=body.question,
        risk_result=risk_result,
        reskill_result=reskill_result,
        language=body.language,
    )

    # Store chat history
    await db.chat_history.insert_one({
        "profile_id": body.profile_id,
        "user_id": current_user["id"],
        "question": body.question,
        "answer": answer["answer"],
        "language": body.language,
        "created_at": datetime.now(timezone.utc),
    })

    return {"success": True, "data": answer}


# ────────────────────────────────────────────────────────────
# Sample profiles (demo)
# ────────────────────────────────────────────────────────────

@router.get("/samples")
async def get_samples():
    """Return the 5 preloaded demo profiles (no auth required)."""
    enriched = []
    for p in SAMPLE_PROFILES:
        skills = extract_skills(p["writeup"])
        enriched.append({**p, "extracted_skills": skills})
    return {"success": True, "data": enriched}