from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError

from app.database import engine, Base
# Import all models to ensure metadata registration before create_all
import app.models # noqa: F401

from app.routers import (
    departments_router,
    courses_router,
    students_router,
    skills_router,
    student_skills_router,
    projects_router,
    project_skills_router,
    shortlists_router,
    dashboard_router,
    matching_router,
    ai_router,
)
from app.core.exceptions import raise_conflict_on_integrity_error

# Create database tables automatically upon startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SkillBridge API",
    description="Smart Student Skill Finder & Project Matcher REST API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global fallback exception handler for database integrity conflicts
@app.exception_handler(IntegrityError)
def integrity_error_handler(request: Request, exc: IntegrityError):
    try:
        raise_conflict_on_integrity_error(exc)
    except Exception as e:
        status_code = getattr(e, "status_code", status.HTTP_409_CONFLICT)
        detail = getattr(e, "detail", "Database integrity violation.")
        return JSONResponse(status_code=status_code, content={"detail": detail})

# Mount all resource routers
app.include_router(departments_router)
app.include_router(courses_router)
app.include_router(students_router)
app.include_router(skills_router)
app.include_router(student_skills_router)
app.include_router(projects_router)
app.include_router(project_skills_router)
app.include_router(shortlists_router)
app.include_router(dashboard_router)
app.include_router(matching_router)
app.include_router(ai_router)

# Mount static frontend for Phase 2.5
app.mount("/app", StaticFiles(directory="app/static", html=True), name="static")

from fastapi.responses import RedirectResponse

@app.get("/", tags=["Health"])
def root_status(request: Request):
    accept = request.headers.get("accept", "")
    user_agent = request.headers.get("user-agent", "").lower()
    if "text/html" in accept and "testclient" not in user_agent:
        return RedirectResponse(url="/app/index.html")

    return {
        "project": "SkillBridge – Smart Student Skill Finder & Project Matcher",
        "status": "healthy",
        "documentation": "/docs",
        "version": "1.0.0"
    }
