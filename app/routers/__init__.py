from app.routers.departments import router as departments_router
from app.routers.courses import router as courses_router
from app.routers.students import router as students_router
from app.routers.skills import router as skills_router
from app.routers.student_skills import router as student_skills_router
from app.routers.projects import router as projects_router
from app.routers.project_skills import router as project_skills_router
from app.routers.shortlists import router as shortlists_router
from app.routers.dashboard import router as dashboard_router
from app.routers.matching import router as matching_router
from app.routers.ai import router as ai_router

__all__ = [
    "departments_router",
    "courses_router",
    "students_router",
    "skills_router",
    "student_skills_router",
    "projects_router",
    "project_skills_router",
    "shortlists_router",
    "dashboard_router",
    "matching_router",
    "ai_router",
]
