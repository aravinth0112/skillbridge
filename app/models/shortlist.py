from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Shortlist(Base):
    __tablename__ = "shortlists"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    match_score = Column(Float, nullable=False)
    status = Column(String(30), default="shortlisted", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("match_score >= 0.0 AND match_score <= 100.0", name="chk_shortlist_match_score_0_100"),
        UniqueConstraint("project_id", "student_id", name="uq_project_student_shortlist"),
    )

    # Relationships
    project = relationship("Project", back_populates="shortlists")
    student = relationship("Student", back_populates="shortlists")
