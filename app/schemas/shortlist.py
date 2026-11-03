from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ShortlistBase(BaseModel):
    project_id: int
    student_id: int
    match_score: float = Field(..., ge=0.0, le=100.0, description="Match score percentage between 0 and 100")
    status: str = Field("shortlisted", description="Status: shortlisted, contacted, selected")
    notes: Optional[str] = Field(None, max_length=500)

class ShortlistCreate(ShortlistBase):
    pass

class ShortlistUpdate(BaseModel):
    match_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    status: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)

class ShortlistResponse(ShortlistBase):
    id: int
    student_name: Optional[str] = None
    project_title: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
