from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    reg_no = Column(String(50), unique=True, nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    year_of_study = Column(Integer, nullable=False)
    available = Column(Boolean, default=True, nullable=False)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("year_of_study >= 1 AND year_of_study <= 4", name="chk_student_year_1_4"),
    )

    # Relationship to Course (department is derived via student.course.department)
    course = relationship("Course", back_populates="students")
    # Deleting a student cascades to their skills and shortlists
    student_skills = relationship("StudentSkill", back_populates="student", cascade="all, delete-orphan", passive_deletes=True)
    shortlists = relationship("Shortlist", back_populates="student", cascade="all, delete-orphan", passive_deletes=True)
