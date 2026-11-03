from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.course import Course
from app.models.department import Department
from app.models.student import Student
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.core.exceptions import raise_conflict_on_integrity_error

router = APIRouter(prefix="/api/v1/courses", tags=["Courses"])

@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(course_in: CourseCreate, db: Session = Depends(get_db)):
    # Verify parent department exists
    dept = db.query(Department).filter(Department.id == course_in.department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {course_in.department_id} does not exist"
        )

    course = Course(
        name=course_in.name,
        code=course_in.code.upper(),
        department_id=course_in.department_id
    )
    db.add(course)
    try:
        db.commit()
        db.refresh(course)
        return CourseResponse(
            id=course.id,
            name=course.name,
            code=course.code,
            department_id=course.department_id,
            created_at=course.created_at,
            department_name=dept.name
        )
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.get("/", response_model=List[CourseResponse])
def list_courses(
    department_id: Optional[int] = Query(None, description="Filter courses by department ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Course)
    if department_id is not None:
        query = query.filter(Course.department_id == department_id)
    courses = query.offset(skip).limit(limit).all()

    result = []
    for c in courses:
        dept_name = c.department.name if c.department else None
        result.append(CourseResponse(
            id=c.id,
            name=c.name,
            code=c.code,
            department_id=c.department_id,
            created_at=c.created_at,
            department_name=dept_name
        ))
    return result

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    
    dept_name = course.department.name if course.department else None
    return CourseResponse(
        id=course.id,
        name=course.name,
        code=course.code,
        department_id=course.department_id,
        created_at=course.created_at,
        department_name=dept_name
    )

@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    course_in: CourseUpdate,
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course_in.department_id is not None:
        dept = db.query(Department).filter(Department.id == course_in.department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department with ID {course_in.department_id} does not exist"
            )
        course.department_id = course_in.department_id

    if course_in.name is not None:
        course.name = course_in.name
    if course_in.code is not None:
        course.code = course_in.code.upper()

    try:
        db.commit()
        db.refresh(course)
        dept_name = course.department.name if course.department else None
        return CourseResponse(
            id=course.id,
            name=course.name,
            code=course.code,
            department_id=course.department_id,
            created_at=course.created_at,
            department_name=dept_name
        )
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)

@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # Rule 1: Courses with enrolled students cannot be deleted (409 Conflict)
    student_count = db.query(Student).filter(Student.course_id == course_id).count()
    if student_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete course because it has {student_count} enrolled student(s)."
        )

    db.delete(course)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise_conflict_on_integrity_error(e)
    return None
