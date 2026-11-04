from typing import Dict, List
from pydantic import BaseModel

class TotalsCount(BaseModel):
    students: int
    departments: int
    courses: int
    skills: int
    projects: int
    shortlists: int
    open_projects: int = 0
    verified_skills_pct: float = 0.0

class DepartmentCount(BaseModel):
    department_id: int
    department_name: str
    student_count: int

class SkillDemand(BaseModel):
    skill_id: int
    skill_name: str
    category: str
    student_count: int
    project_count: int

class DashboardStatsResponse(BaseModel):
    totals: TotalsCount
    students_per_department: List[DepartmentCount]
    top_skills: List[SkillDemand]
    proficiency_distribution: Dict[str, int]
