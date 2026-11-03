from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, EmailStr

class ProjectBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=5)
    status: str = Field("open", description="Project status: open, in_progress, completed")
    deadline: Optional[date] = Field(None, description="Target completion or application deadline")
    contact_email: EmailStr

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = Field(None, min_length=5)
    status: Optional[str] = None
    deadline: Optional[date] = None
    contact_email: Optional[EmailStr] = None

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
