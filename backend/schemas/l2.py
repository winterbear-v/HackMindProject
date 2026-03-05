from typing import Optional
from pydantic import BaseModel, Field


class ProfileCreate(BaseModel):
    title: str = Field(..., description="Current job title e.g. BPO Executive")
    city: str = Field(..., description="City e.g. Pune")
    xp_years: float = Field(..., ge=0, le=50, description="Years of experience")
    writeup: str = Field(..., min_length=50, max_length=1000,
                         description="100-200 word description of current work and skills")


class ProfileOut(BaseModel):
    id: str
    user_id: str
    title: str
    city: str
    xp_years: float
    writeup: str
    extracted_skills: list[str]
    created_at: str


class RiskDrivers(BaseModel):
    hiring_decline: float
    ai_mentions: float
    skill_match: float
    experience_penalty: float


class RiskResult(BaseModel):
    score: float
    level: str
    drivers: RiskDrivers
    evidence: list[dict]


class WeekPlan(BaseModel):
    week: str
    action: str
    resource: str
    resource_link: str
    hours_per_week: int


class TargetRole(BaseModel):
    role: str
    vulnerability_score: float
    postings_in_city: int
    weeks: list[WeekPlan]
    confidence: int
    total_weeks: int


class ReskillResult(BaseModel):
    extracted_skills: list[str]
    skill_gaps: list[str]
    target_roles: list[TargetRole]


class ChatRequest(BaseModel):
    profile_id: str
    question: str
    language: Optional[str] = "en"