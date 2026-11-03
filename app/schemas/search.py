from typing import List, Optional
from pydantic import BaseModel
from app.schemas.student import StudentResponse

class StudentSearchQuery(BaseModel):
    skill_ids: Optional[List[int]] = None
    skill_match_mode: str = "OR" # "AND" or "OR"
    course_id: Optional[int] = None
    department_id: Optional[int] = None
    year_of_study: Optional[int] = None
    available: Optional[bool] = None

class StudentSearchResult(StudentResponse):
    matched_skills_count: Optional[int] = 0
    skills: List[dict] = []
