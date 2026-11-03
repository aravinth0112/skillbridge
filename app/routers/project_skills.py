from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.project_skill import ProjectSkill
from app.models.project import Project
from app.models.skill import Skill
from app.schemas.project_skill import (
    ProjectSkillCreate,
    ProjectSkillUpdate,
    ProjectSkillResponse
)
from app.schemas.student_skill import PROFICIENCY_LABELS
from app.core.exceptions import raise_conflict_on_integrity_error

router = APIRouter(prefix="/api/v1/project-skills", tags=["Project Skills"])

def build_project_skill_response(ps: ProjectSkill) -> ProjectSkillResponse:
    skill_name = ps.skill.name if ps.skill else None
    prof_label = PROFICIENCY_LABELS.get(ps.min_proficiency, "Unknown")
    return ProjectSkillResponse(
        id=ps.id,
        project_id=ps.project_id,
        skill_id=ps.skill_id,
        skill_name=skill_name,
        min_proficiency=ps.min_proficiency,
        min_proficiency_label=prof_label,
        weight=ps.weight,
        created_at=ps.created_at
    )

@router.post("/", response_model=ProjectSkillResponse, status_code=status.HTTP_201_CREATED)
def add_project_skill(ps_in: ProjectSkillCreate, db: Session = Depends(get_db)):
    # Validate project exists
    project = db.query(Project).filter(Project.id == ps_in.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {ps_in.project_id} does not exist"
        )
    # Validate skill exists
    skill = db.query(Skill).filter(Skill.id == ps_in.skill_id).first()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Skill with ID {ps_in.skill_id} does not exist"
        )

    ps = ProjectSkill(
        project_id=ps_in.project_id,
        skill_id=ps_in.skill_id,
        min_proficiency=ps_in.min_proficiency,
        weight=ps_in.weight
    )
    db.add(ps)
    try:
        db.commit()
        db.refresh(ps)
        return build_project_skill_response(ps)
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.get("/", response_model=List[ProjectSkillResponse])
def list_project_skills(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(ProjectSkill)
    if project_id is not None:
        query = query.filter(ProjectSkill.project_id == project_id)
    items = query.offset(skip).limit(limit).all()
    return [build_project_skill_response(item) for item in items]

@router.get("/{project_skill_id}", response_model=ProjectSkillResponse)
def get_project_skill(project_skill_id: int, db: Session = Depends(get_db)):
    item = db.query(ProjectSkill).filter(ProjectSkill.id == project_skill_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project skill requirement not found")
    return build_project_skill_response(item)

@router.put("/{project_skill_id}", response_model=ProjectSkillResponse)
def update_project_skill(
    project_skill_id: int,
    ps_in: ProjectSkillUpdate,
    db: Session = Depends(get_db)
):
    item = db.query(ProjectSkill).filter(ProjectSkill.id == project_skill_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project skill requirement not found")

    if ps_in.min_proficiency is not None:
        item.min_proficiency = ps_in.min_proficiency
    if ps_in.weight is not None:
        item.weight = ps_in.weight

    try:
        db.commit()
        db.refresh(item)
        return build_project_skill_response(item)
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.delete("/{project_skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_skill(project_skill_id: int, db: Session = Depends(get_db)):
    item = db.query(ProjectSkill).filter(ProjectSkill.id == project_skill_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project skill requirement not found")

    db.delete(item)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)
    return None
