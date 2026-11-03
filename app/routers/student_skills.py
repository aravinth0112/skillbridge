from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.student_skill import StudentSkill
from app.models.student import Student
from app.models.skill import Skill
from app.schemas.student_skill import (
    StudentSkillCreate,
    StudentSkillUpdate,
    StudentSkillResponse,
    PROFICIENCY_LABELS
)
from app.core.exceptions import raise_conflict_on_integrity_error

router = APIRouter(prefix="/api/v1/student-skills", tags=["Student Skills"])

def build_student_skill_response(ss: StudentSkill) -> StudentSkillResponse:
    skill_name = ss.skill.name if ss.skill else None
    skill_cat = ss.skill.category if ss.skill else None
    prof_label = PROFICIENCY_LABELS.get(ss.proficiency, "Unknown")

    return StudentSkillResponse(
        id=ss.id,
        student_id=ss.student_id,
        skill_id=ss.skill_id,
        skill_name=skill_name,
        skill_category=skill_cat,
        proficiency=ss.proficiency,
        proficiency_label=prof_label,
        verified=ss.verified,
        created_at=ss.created_at,
        updated_at=ss.updated_at
    )

@router.post("/", response_model=StudentSkillResponse, status_code=status.HTTP_201_CREATED)
def add_student_skill(ss_in: StudentSkillCreate, db: Session = Depends(get_db)):
    # Check student exists
    student = db.query(Student).filter(Student.id == ss_in.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {ss_in.student_id} does not exist"
        )
    # Check skill exists
    skill = db.query(Skill).filter(Skill.id == ss_in.skill_id).first()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {ss_in.skill_id} does not exist"
        )

    student_skill = StudentSkill(
        student_id=ss_in.student_id,
        skill_id=ss_in.skill_id,
        proficiency=ss_in.proficiency,
        verified=ss_in.verified
    )
    db.add(student_skill)
    try:
        db.commit()
        db.refresh(student_skill)
        return build_student_skill_response(student_skill)
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.get("/", response_model=List[StudentSkillResponse])
def list_student_skills(
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    skill_id: Optional[int] = Query(None, description="Filter by skill ID"),
    verified: Optional[bool] = Query(None, description="Filter by verification status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(StudentSkill)
    if student_id is not None:
        query = query.filter(StudentSkill.student_id == student_id)
    if skill_id is not None:
        query = query.filter(StudentSkill.skill_id == skill_id)
    if verified is not None:
        query = query.filter(StudentSkill.verified == verified)

    items = query.offset(skip).limit(limit).all()
    return [build_student_skill_response(item) for item in items]

@router.get("/{student_skill_id}", response_model=StudentSkillResponse)
def get_student_skill(student_skill_id: int, db: Session = Depends(get_db)):
    item = db.query(StudentSkill).filter(StudentSkill.id == student_skill_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student skill not found")
    return build_student_skill_response(item)

@router.put("/{student_skill_id}", response_model=StudentSkillResponse)
def update_student_skill(
    student_skill_id: int,
    ss_in: StudentSkillUpdate,
    db: Session = Depends(get_db)
):
    item = db.query(StudentSkill).filter(StudentSkill.id == student_skill_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student skill not found")

    if ss_in.proficiency is not None:
        item.proficiency = ss_in.proficiency
    if ss_in.verified is not None:
        item.verified = ss_in.verified
    item.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(item)
        return build_student_skill_response(item)
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.delete("/{student_skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student_skill(student_skill_id: int, db: Session = Depends(get_db)):
    item = db.query(StudentSkill).filter(StudentSkill.id == student_skill_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student skill not found")

    db.delete(item)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)
    return None
