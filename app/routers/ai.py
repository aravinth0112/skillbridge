from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.skill import Skill
from app.models.course import Course
from app.models.department import Department
from app.models.student import Student
from app.models.student_skill import StudentSkill
from app.schemas.ai import AISearchRequest, AISearchResponse, AIStatusResponse
from app.schemas.search import StudentSearchResult
from app.services.student_service import filter_students
from app.services.ai_service import (
    check_ollama_reachable,
    parse_query_with_ai,
    OLLAMA_MODEL,
    OLLAMA_URL
)

router = APIRouter(prefix="/api/v1/ai", tags=["AI Search"])

@router.get("/status", response_model=AIStatusResponse)
def get_ai_status():
    """
    Returns connectivity status to the local Ollama daemon.
    """
    is_reachable = check_ollama_reachable()
    return AIStatusResponse(
        ollama_reachable=is_reachable,
        model=OLLAMA_MODEL,
        url=OLLAMA_URL
    )

@router.post("/search", response_model=AISearchResponse)
def smart_ai_search(request: AISearchRequest, db: Session = Depends(get_db)):
    """
    Translates natural language student queries into filters and runs the search.
    Never lets the LLM generate SQL. Falls back to keyword parsing if Ollama is off.
    """
    # 1. Fetch allowed database entities to scope the parser
    known_skills = [s.name for s in db.query(Skill).all()]
    known_courses = [c.name for c in db.query(Course).all()]
    known_departments = [d.name for d in db.query(Department).all()]

    # 2. Parse query using Ollama (or fallback keyword parser)
    used_ai, filters = parse_query_with_ai(
        query=request.query,
        known_skills=known_skills,
        known_courses=known_courses,
        known_departments=known_departments
    )

    # 3. Resolve filtered entity names to database primary keys
    skill_ids = []
    if filters.skills:
        skill_rows = db.query(Skill.id).filter(Skill.name.in_(filters.skills)).all()
        skill_ids = [r[0] for r in skill_rows]

    course_id = None
    if filters.course:
        course_row = db.query(Course.id).filter(Course.name.ilike(filters.course)).first()
        if course_row:
            course_id = course_row[0]

    department_id = None
    if filters.department:
        dept_row = db.query(Department.id).filter(Department.name.ilike(filters.department)).first()
        if dept_row:
            department_id = dept_row[0]

    # 4. Run exact same search filtering logic via shared service
    results = filter_students(
        db=db,
        skill_ids=skill_ids,
        skill_match_mode=filters.mode,
        course_id=course_id,
        department_id=department_id,
        year_of_study=filters.year,
        available=filters.available,
        limit=50
    )

    return AISearchResponse(
        used_ai=used_ai,
        interpreted_filters=filters,
        results=results
    )
