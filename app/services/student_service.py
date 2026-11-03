"""
Shared student query and filtering service.
Consolidates search filtering logic across students.py and ai.py without duplication.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.course import Course
from app.models.student_skill import StudentSkill
from app.models.skill import Skill
from app.schemas.search import StudentSearchResult
from app.schemas.student import StudentResponse

def build_student_response(student: Student) -> StudentResponse:
    dept_id = student.course.department.id if student.course and student.course.department else None
    dept_name = student.course.department.name if student.course and student.course.department else None
    course_name = student.course.name if student.course else None

    return StudentResponse(
        id=student.id,
        full_name=student.full_name,
        email=student.email,
        reg_no=student.reg_no,
        course_id=student.course_id,
        course_name=course_name,
        department_id=dept_id,
        department_name=dept_name,
        year_of_study=student.year_of_study,
        available=student.available,
        bio=student.bio,
        created_at=student.created_at
    )

def filter_students(
    db: Session,
    skill_ids: Optional[List[int]] = None,
    skill_match_mode: str = "OR",
    course_id: Optional[int] = None,
    department_id: Optional[int] = None,
    year_of_study: Optional[int] = None,
    available: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[StudentSearchResult]:
    """
    Executes student search with multi-criteria filtering across skills, course,
    department, year of study, and project availability.
    """
    query = db.query(Student).join(Course, Student.course_id == Course.id)

    if department_id is not None:
        query = query.filter(Course.department_id == department_id)
    if course_id is not None:
        query = query.filter(Student.course_id == course_id)
    if year_of_study is not None:
        query = query.filter(Student.year_of_study == year_of_study)
    if available is not None:
        query = query.filter(Student.available == available)

    mode = str(skill_match_mode).upper()
    if skill_ids:
        if mode == "AND":
            for s_id in skill_ids:
                query = query.filter(
                    Student.id.in_(
                        db.query(StudentSkill.student_id).filter(StudentSkill.skill_id == s_id)
                    )
                )
        else: # OR mode
            query = query.filter(
                Student.id.in_(
                    db.query(StudentSkill.student_id).filter(StudentSkill.skill_id.in_(skill_ids))
                )
            )

    students = query.offset(skip).limit(limit).all()

    results = []
    for s in students:
        base_resp = build_student_response(s)
        s_skills = db.query(StudentSkill, Skill).join(Skill, StudentSkill.skill_id == Skill.id).filter(
            StudentSkill.student_id == s.id
        ).all()

        skills_list = [
            {
                "skill_id": sk.id,
                "name": sk.name,
                "category": sk.category,
                "proficiency": ss.proficiency,
                "verified": ss.verified
            }
            for ss, sk in s_skills
        ]

        matched_count = 0
        if skill_ids:
            student_skill_id_set = {sk.id for _, sk in s_skills}
            matched_count = len(set(skill_ids).intersection(student_skill_id_set))

        results.append(StudentSearchResult(
            **base_resp.model_dump(),
            matched_skills_count=matched_count,
            skills=skills_list
        ))

    return results
