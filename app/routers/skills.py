from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.skill import Skill
from app.models.student_skill import StudentSkill
from app.models.project_skill import ProjectSkill
from app.schemas.skill import SkillCreate, SkillUpdate, SkillResponse
from app.core.exceptions import raise_conflict_on_integrity_error

router = APIRouter(prefix="/api/v1/skills", tags=["Skills"])

@router.post("/", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def create_skill(skill_in: SkillCreate, db: Session = Depends(get_db)):
    skill = Skill(name=skill_in.name.strip(), category=skill_in.category.strip())
    db.add(skill)
    try:
        db.commit()
        db.refresh(skill)
        return skill
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.get("/", response_model=List[SkillResponse])
def list_skills(
    category: Optional[str] = Query(None, description="Filter skills by category"),
    search: Optional[str] = Query(None, description="Case-insensitive substring search on skill name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Skill)
    if category is not None:
        query = query.filter(Skill.category.ilike(f"%{category}%"))
    if search is not None:
        query = query.filter(Skill.name.ilike(f"%{search}%"))
    return query.offset(skip).limit(limit).all()

@router.get("/{skill_id}", response_model=SkillResponse)
def get_skill(skill_id: int, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    return skill

@router.put("/{skill_id}", response_model=SkillResponse)
def update_skill(
    skill_id: int,
    skill_in: SkillUpdate,
    db: Session = Depends(get_db)
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    if skill_in.name is not None:
        skill.name = skill_in.name.strip()
    if skill_in.category is not None:
        skill.category = skill_in.category.strip()

    try:
        db.commit()
        db.refresh(skill)
        return skill
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(skill_id: int, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    # Rule 7: skill in use -> 409
    in_student_skills = db.query(StudentSkill).filter(StudentSkill.skill_id == skill_id).count()
    in_project_skills = db.query(ProjectSkill).filter(ProjectSkill.skill_id == skill_id).count()
    if in_student_skills > 0 or in_project_skills > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete skill '{skill.name}' because it is linked to {in_student_skills} student(s) and {in_project_skills} project(s)."
        )

    db.delete(skill)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)
    return None
