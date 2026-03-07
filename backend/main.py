import os
from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from routers import auth, users, l1, l2
from core.database import connect_db, disconnect_db

load_dotenv()

app = FastAPI(title="SkillsMirage API", version="1.0.0")

# ─── CORS ────────────────────────────────────────────────────
# In production, reads FRONTEND_URL from env (your Vercel URL).
# In development, falls back to localhost:3000.

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",   # always allow local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DB lifecycle ────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()

# ─── Routers ─────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(l1.router, prefix="/api/l1", tags=["L1 Scraper"])
app.include_router(l2.router, prefix="/api/l2", tags=["L2 Worker Intelligence"])

# ─── Health check ────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "🚀 FastAPI is running!", "status": "OK"}

# ─── Error handlers ──────────────────────────────────────────
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        message = detail.get("message", str(detail))
        success = detail.get("success", False)
    else:
        message = str(detail)
        success = False
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": success, "message": message},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    message = errors[0]["msg"] if errors else "Validation error"
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": message},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": str(exc) or "Internal Server Error"},
    )