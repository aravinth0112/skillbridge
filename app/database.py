import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

# Load configuration from .env file if present
load_dotenv()

# SQLite database file path stored in project root (or /tmp on Vercel)
if os.getenv("VERCEL"):
    default_db_url = "sqlite:////tmp/skillbridge.db"
else:
    default_db_url = "sqlite:///./skillbridge.db"

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", default_db_url)

# connect_args={"check_same_thread": False} is required for SQLite with multi-threaded FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Rule: enable PRAGMA foreign_keys=ON on each SQLite connection
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# Synchronous session factory for plain def routes
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base for all SQLAlchemy models
Base = declarative_base()

# Dependency to get a DB session per request and close it afterwards
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
