from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.schemas.skill import SkillCreate, SkillUpdate, SkillResponse
from app.schemas.student_skill import StudentSkillCreate, StudentSkillUpdate, StudentSkillResponse, PROFICIENCY_LABELS
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.schemas.project_skill import ProjectSkillCreate, ProjectSkillUpdate, ProjectSkillResponse
from app.schemas.shortlist import ShortlistCreate, ShortlistUpdate, ShortlistResponse
from app.schemas.search import StudentSearchQuery, StudentSearchResult
from app.schemas.dashboard import DashboardStatsResponse

__all__ = [
    "DepartmentCreate", "DepartmentUpdate", "DepartmentResponse",
    "CourseCreate", "CourseUpdate", "CourseResponse",
    "StudentCreate", "StudentUpdate", "StudentResponse",
    "SkillCreate", "SkillUpdate", "SkillResponse",
    "StudentSkillCreate", "StudentSkillUpdate", "StudentSkillResponse", "PROFICIENCY_LABELS",
    "ProjectCreate", "ProjectUpdate", "ProjectResponse",
    "ProjectSkillCreate", "ProjectSkillUpdate", "ProjectSkillResponse",
    "ShortlistCreate", "ShortlistUpdate", "ShortlistResponse",
    "StudentSearchQuery", "StudentSearchResult",
    "DashboardStatsResponse",
]
