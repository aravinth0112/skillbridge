from collections import defaultdict
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.models.student import Student
from app.models.course import Course
from app.models.department import Department
from app.models.skill import Skill
from app.models.project_skill import ProjectSkill
from app.models.student_skill import StudentSkill
from app.models.shortlist import Shortlist

from app.services.matching_service import calculate_match_score
from app.schemas.matching import (
    CandidateMatchResponse,
    ProjectMatchResponse,
    AutoShortlistResponse,
    ShortlistedItemInfo,
    MatchedSkillItem,
    MissingSkillItem
)

router = APIRouter(prefix="/api/v1/matching", tags=["Matching Engine"])

@router.get("/projects/{project_id}/students", response_model=List[CandidateMatchResponse])
def get_ranked_candidates_for_project(
    project_id: int,
    min_score: float = Query(0.0, ge=0.0, le=100.0, description="Minimum match score threshold"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of candidates to return"),
    only_available: bool = Query(False, description="Filter only available students"),
    db: Session = Depends(get_db)
):
    # 1. Check project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # 2. Efficiently load project's required skills in ONE query
    ps_rows = db.query(ProjectSkill, Skill).join(Skill, ProjectSkill.skill_id == Skill.id).filter(
        ProjectSkill.project_id == project_id
    ).all()

    # Rule 1: A project with no required skills returns HTTP 400
    if not ps_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project has no required skills"
        )

    required_skills = [
        {
            "skill_id": ps.skill_id,
            "skill_name": sk.name,
            "min_proficiency": ps.min_proficiency,
            "weight": ps.weight
        }
        for ps, sk in ps_rows
    ]

    # 3. Load students in ONE query
    stu_query = db.query(Student).join(Course, Student.course_id == Course.id)
    if only_available:
        stu_query = stu_query.filter(Student.available == True)
    students = stu_query.all()

    if not students:
        return []

    student_ids = [s.id for s in students]

    # 4. Load all students' skills in ONE query (no query per student!)
    all_student_skills = db.query(StudentSkill).filter(
        StudentSkill.student_id.in_(student_ids)
    ).all()

    student_skills_map = defaultdict(dict)
    for ss in all_student_skills:
        student_skills_map[ss.student_id][ss.skill_id] = {
            "proficiency": ss.proficiency,
            "verified": ss.verified
        }

    # 5. Score each student using pure function
    candidates = []
    for s in students:
        s_skills = student_skills_map.get(s.id, {})
        match_res = calculate_match_score(required_skills, s_skills)

        if match_res["score"] >= min_score:
            course_name = s.course.name if s.course else None
            dept_name = s.course.department.name if s.course and s.course.department else None

            candidates.append(CandidateMatchResponse(
                student_id=s.id,
                full_name=s.full_name,
                email=s.email,
                reg_no=s.reg_no,
                course_id=s.course_id,
                course_name=course_name,
                department_name=dept_name,
                year_of_study=s.year_of_study,
                available=s.available,
                score=match_res["score"],
                matched_skills=[MatchedSkillItem(**item) for item in match_res["matched_skills"]],
                missing_skills=[MissingSkillItem(**item) for item in match_res["missing_skills"]]
            ))

    # Rank by score descending
    candidates.sort(key=lambda c: c.score, reverse=True)
    return candidates[:limit]

@router.get("/students/{student_id}/projects", response_model=List[ProjectMatchResponse])
def get_ranked_projects_for_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    # 1. Check student exists
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    # 2. In ONE query, load student's skills
    ss_rows = db.query(StudentSkill).filter(StudentSkill.student_id == student_id).all()
    student_skills = {
        ss.skill_id: {
            "proficiency": ss.proficiency,
            "verified": ss.verified
        }
        for ss in ss_rows
    }

    # 3. Load all open projects in ONE query
    open_projects = db.query(Project).filter(Project.status == "open").all()
    if not open_projects:
        return []

    project_ids = [p.id for p in open_projects]

    # 4. Load all project requirements for open projects in ONE query
    ps_rows = db.query(ProjectSkill, Skill).join(Skill, ProjectSkill.skill_id == Skill.id).filter(
        ProjectSkill.project_id.in_(project_ids)
    ).all()

    project_skills_map = defaultdict(list)
    for ps, sk in ps_rows:
        project_skills_map[ps.project_id].append({
            "skill_id": ps.skill_id,
            "skill_name": sk.name,
            "min_proficiency": ps.min_proficiency,
            "weight": ps.weight
        })

    # 5. Score student against each open project
    ranked_projects = []
    for p in open_projects:
        req_skills = project_skills_map.get(p.id, [])
        match_res = calculate_match_score(req_skills, student_skills)

        ranked_projects.append(ProjectMatchResponse(
            project_id=p.id,
            title=p.title,
            description=p.description,
            status=p.status,
            deadline=p.deadline,
            contact_email=p.contact_email,
            score=match_res["score"],
            matched_skills=[MatchedSkillItem(**item) for item in match_res["matched_skills"]],
            missing_skills=[MissingSkillItem(**item) for item in match_res["missing_skills"]]
        ))

    # Rank by score descending
    ranked_projects.sort(key=lambda p: p.score, reverse=True)
    return ranked_projects

@router.post("/projects/{project_id}/auto-shortlist", response_model=AutoShortlistResponse)
def auto_shortlist_candidates(
    project_id: int,
    top_n: int = Query(5, ge=1, le=50, description="Maximum number of candidates to shortlist"),
    min_score: float = Query(60.0, ge=0.0, le=100.0, description="Minimum score threshold for shortlisting"),
    db: Session = Depends(get_db)
):
    # 1. Check project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # 2. Check project has required skills (400 if none)
    ps_rows = db.query(ProjectSkill, Skill).join(Skill, ProjectSkill.skill_id == Skill.id).filter(
        ProjectSkill.project_id == project_id
    ).all()

    if not ps_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project has no required skills"
        )

    required_skills = [
        {
            "skill_id": ps.skill_id,
            "skill_name": sk.name,
            "min_proficiency": ps.min_proficiency,
            "weight": ps.weight
        }
        for ps, sk in ps_rows
    ]

    # 3. Fetch all students & skills in batch
    students = db.query(Student).all()
    student_ids = [s.id for s in students]

    all_student_skills = db.query(StudentSkill).filter(
        StudentSkill.student_id.in_(student_ids)
    ).all()

    student_skills_map = defaultdict(dict)
    for ss in all_student_skills:
        student_skills_map[ss.student_id][ss.skill_id] = {
            "proficiency": ss.proficiency,
            "verified": ss.verified
        }

    # 4. Score all students
    scored_candidates = []
    for s in students:
        s_skills = student_skills_map.get(s.id, {})
        match_res = calculate_match_score(required_skills, s_skills)
        if match_res["score"] >= min_score:
            scored_candidates.append({
                "student_id": s.id,
                "student_name": s.full_name,
                "score": match_res["score"]
            })

    # Sort descending and take top N
    scored_candidates.sort(key=lambda c: c["score"], reverse=True)
    target_candidates = scored_candidates[:top_n]

    # 5. Fetch existing shortlist student IDs for this project
    existing_shortlisted = set(
        row[0] for row in db.query(Shortlist.student_id).filter(Shortlist.project_id == project_id).all()
    )

    created_count = 0
    skipped_count = 0
    shortlisted_result = []

    for cand in target_candidates:
        if cand["student_id"] in existing_shortlisted:
            skipped_count += 1
        else:
            new_entry = Shortlist(
                project_id=project_id,
                student_id=cand["student_id"],
                match_score=cand["score"],
                status="shortlisted",
                notes=f"Auto-shortlisted via matching engine (Score: {cand['score']}%)"
            )
            db.add(new_entry)
            existing_shortlisted.add(cand["student_id"])
            created_count += 1
            shortlisted_result.append(ShortlistedItemInfo(
                student_id=cand["student_id"],
                student_name=cand["student_name"],
                match_score=cand["score"]
            ))

    db.commit()

    return AutoShortlistResponse(
        project_id=project_id,
        created_count=created_count,
        skipped_count=skipped_count,
        shortlisted_students=shortlisted_result
    )
