from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class ProjectSkill(Base):
    __tablename__ = "project_skills"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False)
    min_proficiency = Column(Integer, nullable=False)
    weight = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("min_proficiency >= 1 AND min_proficiency <= 5", name="chk_project_min_proficiency_1_5"),
        CheckConstraint("weight >= 1 AND weight <= 5", name="chk_project_importance_weight_1_5"),
        UniqueConstraint("project_id", "skill_id", name="uq_project_skill"),
    )

    # Relationships
    project = relationship("Project", back_populates="project_skills")
    skill = relationship("Skill", back_populates="project_skills")
