from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class SkillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=80, description="Skill name, e.g. FastAPI, React")
    category: str = Field(..., min_length=2, max_length=60, description="Category, e.g. Backend, Frontend, AI/ML")

class SkillCreate(SkillBase):
    pass

class SkillUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    category: Optional[str] = Field(None, min_length=2, max_length=60)

class SkillResponse(SkillBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
