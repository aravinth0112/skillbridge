import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

# Seed database automatically on first startup in Vercel serverless environment
if os.getenv("VERCEL"):
    try:
        from app.database import SessionLocal
        from app.models.student import Student
        from seed import seed_database
        db = SessionLocal()
        if db.query(Student).count() == 0:
            seed_database()
        db.close()
    except Exception as e:
        print(f"Vercel auto-seed notice: {e}")
