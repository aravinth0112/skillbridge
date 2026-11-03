from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.shortlist import Shortlist
from app.models.project import Project
from app.models.student import Student
from app.schemas.shortlist import (
    ShortlistCreate,
    ShortlistUpdate,
    ShortlistResponse
)
from app.core.exceptions import raise_conflict_on_integrity_error

router = APIRouter(prefix="/api/v1/shortlists", tags=["Shortlists"])

def build_shortlist_response(s: Shortlist) -> ShortlistResponse:
    student_name = s.student.full_name if s.student else None
    project_title = s.project.title if s.project else None
    return ShortlistResponse(
        id=s.id,
        project_id=s.project_id,
        student_id=s.student_id,
        student_name=student_name,
        project_title=project_title,
        match_score=s.match_score,
        status=s.status,
        notes=s.notes,
        created_at=s.created_at
    )

@router.post("/", response_model=ShortlistResponse, status_code=status.HTTP_201_CREATED)
def create_shortlist_entry(entry_in: ShortlistCreate, db: Session = Depends(get_db)):
    # Validate project exists
    project = db.query(Project).filter(Project.id == entry_in.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {entry_in.project_id} does not exist"
        )
    # Validate student exists
    student = db.query(Student).filter(Student.id == entry_in.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {entry_in.student_id} does not exist"
        )

    shortlist_item = Shortlist(
        project_id=entry_in.project_id,
        student_id=entry_in.student_id,
        match_score=entry_in.match_score,
        status=entry_in.status.lower(),
        notes=entry_in.notes
    )
    db.add(shortlist_item)
    try:
        db.commit()
        db.refresh(shortlist_item)
        return build_shortlist_response(shortlist_item)
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.get("/", response_model=List[ShortlistResponse])
def list_shortlists(
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    student_id: Optional[int] = Query(None, description="Filter by student ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (shortlisted, contacted, selected)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Shortlist)
    if project_id is not None:
        query = query.filter(Shortlist.project_id == project_id)
    if student_id is not None:
        query = query.filter(Shortlist.student_id == student_id)
    if status_filter is not None:
        query = query.filter(Shortlist.status == status_filter.lower())

    items = query.offset(skip).limit(limit).all()
    return [build_shortlist_response(item) for item in items]

@router.get("/{shortlist_id}", response_model=ShortlistResponse)
def get_shortlist_entry(shortlist_id: int, db: Session = Depends(get_db)):
    item = db.query(Shortlist).filter(Shortlist.id == shortlist_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shortlist record not found")
    return build_shortlist_response(item)

@router.put("/{shortlist_id}", response_model=ShortlistResponse)
def update_shortlist_entry(
    shortlist_id: int,
    entry_in: ShortlistUpdate,
    db: Session = Depends(get_db)
):
    item = db.query(Shortlist).filter(Shortlist.id == shortlist_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shortlist record not found")

    if entry_in.match_score is not None:
        item.match_score = entry_in.match_score
    if entry_in.status is not None:
        item.status = entry_in.status.lower()
    if entry_in.notes is not None:
        item.notes = entry_in.notes

    try:
        db.commit()
        db.refresh(item)
        return build_shortlist_response(item)
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.delete("/{shortlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shortlist_entry(shortlist_id: int, db: Session = Depends(get_db)):
    item = db.query(Shortlist).filter(Shortlist.id == shortlist_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shortlist record not found")

    db.delete(item)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)
    return None
