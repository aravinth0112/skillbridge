from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), unique=True, nullable=False, index=True)
    category = Column(String(60), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships to link tables. Deleting skill in use is blocked
    student_skills = relationship("StudentSkill", back_populates="skill")
    project_skills = relationship("ProjectSkill", back_populates="skill")
