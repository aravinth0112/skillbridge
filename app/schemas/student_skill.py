from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

PROFICIENCY_LABELS = {
    1: "Beginner",
    2: "Elementary",
    3: "Intermediate",
    4: "Advanced",
    5: "Expert"
}

class StudentSkillBase(BaseModel):
    student_id: int
    skill_id: int
    proficiency: int = Field(..., ge=1, le=5, description="Proficiency integer rating from 1 (Beginner) to 5 (Expert)")
    verified: bool = Field(False, description="Whether skill claim has been verified by faculty/admin")

class StudentSkillCreate(StudentSkillBase):
    pass

class StudentSkillUpdate(BaseModel):
    proficiency: Optional[int] = Field(None, ge=1, le=5)
    verified: Optional[bool] = None

class StudentSkillResponse(StudentSkillBase):
    id: int
    skill_name: Optional[str] = None
    skill_category: Optional[str] = None
    proficiency_label: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
