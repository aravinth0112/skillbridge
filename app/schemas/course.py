from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class CourseBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Degree program name, e.g. B.Tech Computer Science")
    code: str = Field(..., min_length=2, max_length=30, description="Unique course/degree code, e.g. BT-CSE")
    department_id: int = Field(..., description="ID of parent department")

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    code: Optional[str] = Field(None, min_length=2, max_length=30)
    department_id: Optional[int] = None

class CourseResponse(CourseBase):
    id: int
    created_at: datetime
    department_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
