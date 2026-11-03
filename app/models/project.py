from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Date, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(30), default="open", nullable=False)
    deadline = Column(Date, nullable=True)
    contact_email = Column(String(120), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Deleting a project cascades to required skills and shortlists
    project_skills = relationship("ProjectSkill", back_populates="project", cascade="all, delete-orphan", passive_deletes=True)
    shortlists = relationship("Shortlist", back_populates="project", cascade="all, delete-orphan", passive_deletes=True)
