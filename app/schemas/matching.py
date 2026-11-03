from typing import List, Optional
from datetime import date
from pydantic import BaseModel, ConfigDict

class MatchedSkillItem(BaseModel):
    skill_id: int
    skill: str
    student_level: int
    required_level: int
    weight: int
    verified: bool

class MissingSkillItem(BaseModel):
    skill_id: int
    skill: str
    required_level: int
    student_level: Optional[int] = None

class CandidateMatchResponse(BaseModel):
    student_id: int
    full_name: str
    email: str
    reg_no: str
    course_id: int
    course_name: Optional[str] = None
    department_name: Optional[str] = None
    year_of_study: int
    available: bool
    score: float
    matched_skills: List[MatchedSkillItem]
    missing_skills: List[MissingSkillItem]

    model_config = ConfigDict(from_attributes=True)

class ProjectMatchResponse(BaseModel):
    project_id: int
    title: str
    description: str
    status: str
    deadline: Optional[date] = None
    contact_email: str
    score: float
    matched_skills: List[MatchedSkillItem]
    missing_skills: List[MissingSkillItem]

    model_config = ConfigDict(from_attributes=True)

class ShortlistedItemInfo(BaseModel):
    student_id: int
    student_name: str
    match_score: float

class AutoShortlistResponse(BaseModel):
    project_id: int
    created_count: int
    skipped_count: int
    shortlisted_students: List[ShortlistedItemInfo]
