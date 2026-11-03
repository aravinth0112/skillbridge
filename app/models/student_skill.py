from datetime import datetime
from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class StudentSkill(Base):
    __tablename__ = "student_skills"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False)
    proficiency = Column(Integer, nullable=False)
    verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("proficiency >= 1 AND proficiency <= 5", name="chk_student_proficiency_1_5"),
        UniqueConstraint("student_id", "skill_id", name="uq_student_skill"),
    )

    # Relationships
    student = relationship("Student", back_populates="student_skills")
    skill = relationship("Skill", back_populates="student_skills")
