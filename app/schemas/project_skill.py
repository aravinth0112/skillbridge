from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.student_skill import PROFICIENCY_LABELS

class ProjectSkillBase(BaseModel):
    project_id: int
    skill_id: int
    min_proficiency: int = Field(..., ge=1, le=5, description="Minimum proficiency rating from 1 to 5")
    weight: int = Field(1, ge=1, le=5, description="Importance weight multiplier from 1 (low) to 5 (critical)")

class ProjectSkillCreate(ProjectSkillBase):
    pass

class ProjectSkillUpdate(BaseModel):
    min_proficiency: Optional[int] = Field(None, ge=1, le=5)
    weight: Optional[int] = Field(None, ge=1, le=5)

class ProjectSkillResponse(ProjectSkillBase):
    id: int
    skill_name: Optional[str] = None
    min_proficiency_label: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
