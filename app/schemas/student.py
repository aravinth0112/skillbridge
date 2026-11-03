from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, EmailStr

class StudentBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    reg_no: str = Field(..., min_length=3, max_length=50, description="Unique registration / roll number")
    course_id: int = Field(..., description="ID of enrolled degree course")
    year_of_study: int = Field(..., ge=1, le=4, description="Current academic year between 1 and 4")
    available: bool = Field(True, description="Availability flag for new projects")
    bio: Optional[str] = Field(None, max_length=1000)

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    reg_no: Optional[str] = Field(None, min_length=3, max_length=50)
    course_id: Optional[int] = None
    year_of_study: Optional[int] = Field(None, ge=1, le=4)
    available: Optional[bool] = None
    bio: Optional[str] = Field(None, max_length=1000)

class StudentResponse(BaseModel):
    id: int
    full_name: str
    email: str
    reg_no: str
    course_id: int
    course_name: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    year_of_study: int
    available: bool
    bio: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
