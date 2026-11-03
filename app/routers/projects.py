from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.core.exceptions import raise_conflict_on_integrity_error

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        title=project_in.title,
        description=project_in.description,
        status=project_in.status.lower(),
        deadline=project_in.deadline,
        contact_email=project_in.contact_email
    )
    db.add(project)
    try:
        db.commit()
        db.refresh(project)
        return project
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (open, in_progress, completed)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Project)
    if status_filter is not None:
        query = query.filter(Project.status == status_filter.lower())
    return query.offset(skip).limit(limit).all()

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project_in.title is not None:
        project.title = project_in.title
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.status is not None:
        project.status = project_in.status.lower()
    if project_in.deadline is not None:
        project.deadline = project_in.deadline
    if project_in.contact_email is not None:
        project.contact_email = project_in.contact_email

    try:
        db.commit()
        db.refresh(project)
        return project
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Rule 7: project -> cascade project_skills and shortlists
    db.delete(project)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)
    return None
