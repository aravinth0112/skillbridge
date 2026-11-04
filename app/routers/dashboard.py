from typing import Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.department import Department
from app.models.course import Course
from app.models.student import Student
from app.models.skill import Skill
from app.models.student_skill import StudentSkill
from app.models.project import Project
from app.models.project_skill import ProjectSkill
from app.models.shortlist import Shortlist
from app.schemas.dashboard import (
    DashboardStatsResponse,
    TotalsCount,
    DepartmentCount,
    SkillDemand
)
from app.schemas.student_skill import PROFICIENCY_LABELS

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Totals
    total_students = db.query(Student).count()
    total_depts = db.query(Department).count()
    total_courses = db.query(Course).count()
    total_skills = db.query(Skill).count()
    total_projects = db.query(Project).count()
    total_shortlists = db.query(Shortlist).count()
    open_projects = db.query(Project).filter(func.lower(Project.status) == "open").count()

    total_student_skills = db.query(StudentSkill).count()
    verified_student_skills = db.query(StudentSkill).filter(StudentSkill.verified == True).count()
    verified_skills_pct = round((verified_student_skills / total_student_skills * 100), 1) if total_student_skills > 0 else 0.0

    totals = TotalsCount(
        students=total_students,
        departments=total_depts,
        courses=total_courses,
        skills=total_skills,
        projects=total_projects,
        shortlists=total_shortlists,
        open_projects=open_projects,
        verified_skills_pct=verified_skills_pct
    )

    # 2. Students per department
    # Department -> Course -> Student
    dept_rows = db.query(
        Department.id,
        Department.name,
        func.count(Student.id).label("student_count")
    ).outerjoin(Course, Course.department_id == Department.id)\
     .outerjoin(Student, Student.course_id == Course.id)\
     .group_by(Department.id, Department.name)\
     .order_by(func.count(Student.id).desc())\
     .all()

    students_per_dept = [
        DepartmentCount(
            department_id=row[0],
            department_name=row[1],
            student_count=row[2]
        )
        for row in dept_rows
    ]

    # 3. Top skills by student enrollment and project demand
    skills = db.query(Skill).all()
    top_skills_list = []
    for s in skills:
        s_count = db.query(StudentSkill).filter(StudentSkill.skill_id == s.id).count()
        p_count = db.query(ProjectSkill).filter(ProjectSkill.skill_id == s.id).count()
        top_skills_list.append(SkillDemand(
            skill_id=s.id,
            skill_name=s.name,
            category=s.category,
            student_count=s_count,
            project_count=p_count
        ))
    # Sort top skills by combined demand
    top_skills_list.sort(key=lambda x: (x.student_count + x.project_count), reverse=True)

    # 4. Proficiency distribution
    prof_dist: Dict[str, int] = {}
    for level, label in PROFICIENCY_LABELS.items():
        count = db.query(StudentSkill).filter(StudentSkill.proficiency == level).count()
        prof_dist[f"{label} ({level})"] = count

    return DashboardStatsResponse(
        totals=totals,
        students_per_department=students_per_dept,
        top_skills=top_skills_list,
        proficiency_distribution=prof_dist
    )
