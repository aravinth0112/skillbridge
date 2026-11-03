from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

def raise_conflict_on_integrity_error(e: IntegrityError):
    """
    Translates SQLAlchemy IntegrityError into appropriate HTTP 409 or 422 error.
    Enforces Rule #7: duplicate unique-constraint errors return 409.
    """
    orig_str = str(e.orig).lower() if hasattr(e, "orig") else str(e).lower()
    if "unique constraint" in orig_str:
        raise HTTPException(
            status_code=409,
            detail="A record with these unique details already exists."
        )
    if "foreign key constraint" in orig_str:
        raise HTTPException(
            status_code=409,
            detail="Operation rejected due to a related reference constraint."
        )
    if "check constraint" in orig_str:
        raise HTTPException(
            status_code=422,
            detail="Provided value violates database check constraint."
        )
    raise HTTPException(
        status_code=409,
        detail="Database integrity constraint violation."
    )
