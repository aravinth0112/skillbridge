from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.student import Student
from app.models.course import Course
from app.models.department import Department
from app.models.student_skill import StudentSkill
from app.models.skill import Skill
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.schemas.search import StudentSearchResult
from app.core.exceptions import raise_conflict_on_integrity_error

router = APIRouter(prefix="/api/v1/students", tags=["Students"])

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

@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(student_in: StudentCreate, db: Session = Depends(get_db)):
    # Validate course exists
    course = db.query(Course).filter(Course.id == student_in.course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with ID {student_in.course_id} does not exist"
        )

    student = Student(
        full_name=student_in.full_name,
        email=student_in.email,
        reg_no=student_in.reg_no.upper(),
        course_id=student_in.course_id,
        year_of_study=student_in.year_of_study,
        available=student_in.available,
        bio=student_in.bio
    )
    db.add(student)
    try:
        db.commit()
        db.refresh(student)
        return build_student_response(student)
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

from app.services.student_service import filter_students, build_student_response

@router.get("/search", response_model=List[StudentSearchResult])
def search_students(
    skill_ids: Optional[List[int]] = Query(None, description="List of skill IDs to match"),
    skill_match_mode: str = Query("OR", pattern="^(AND|OR|and|or)$", description="'AND' (must have all skills) or 'OR' (must have any)"),
    course_id: Optional[int] = Query(None, description="Filter by enrolled course"),
    department_id: Optional[int] = Query(None, description="Filter by department (derived via course)"),
    year_of_study: Optional[int] = Query(None, ge=1, le=4, description="Filter by year of study (1-4)"),
    available: Optional[bool] = Query(None, description="Filter by availability"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return filter_students(
        db=db,
        skill_ids=skill_ids,
        skill_match_mode=skill_match_mode,
        course_id=course_id,
        department_id=department_id,
        year_of_study=year_of_study,
        available=available,
        skip=skip,
        limit=limit
    )

@router.get("/", response_model=List[StudentResponse])
def list_students(
    course_id: Optional[int] = Query(None, description="Filter by degree course"),
    year_of_study: Optional[int] = Query(None, ge=1, le=4, description="Filter by year"),
    available: Optional[bool] = Query(None, description="Filter by availability"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    if course_id is not None:
        query = query.filter(Student.course_id == course_id)
    if year_of_study is not None:
        query = query.filter(Student.year_of_study == year_of_study)
    if available is not None:
        query = query.filter(Student.available == available)

    students = query.offset(skip).limit(limit).all()
    return [build_student_response(s) for s in students]

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return build_student_response(student)

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    student_in: StudentUpdate,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    if student_in.course_id is not None:
        course = db.query(Course).filter(Course.id == student_in.course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {student_in.course_id} does not exist"
            )
        student.course_id = student_in.course_id

    if student_in.full_name is not None:
        student.full_name = student_in.full_name
    if student_in.email is not None:
        student.email = student_in.email
    if student_in.reg_no is not None:
        student.reg_no = student_in.reg_no.upper()
    if student_in.year_of_study is not None:
        student.year_of_study = student_in.year_of_study
    if student_in.available is not None:
        student.available = student_in.available
    if student_in.bio is not None:
        student.bio = student_in.bio

    try:
        db.commit()
        db.refresh(student)
        return build_student_response(student)
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    # Rule 7: student delete cascades to skills and shortlists
    db.delete(student)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)
    return None
