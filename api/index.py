import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from starlette.types import ASGIApp, Receive, Scope, Send

# ASGI middleware to normalize paths when Vercel rewrites requests to api/index.py
class VercelPathMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path in ("/api/index.py", "/api/index", "/api"):
                headers = dict(scope.get("headers", []))
                orig = headers.get(b"x-forwarded-uri", b"").decode("utf-8")
                if not orig:
                    orig = headers.get(b"x-matched-path", b"").decode("utf-8")
                
                if orig and not orig.startswith("/api/index.py") and orig != "/":
                    scope["path"] = orig.split("?")[0]
                else:
                    scope["path"] = "/"
            elif path.startswith("/api/index.py/"):
                scope["path"] = path[len("/api/index.py"):]
            elif path.startswith("/api/index/"):
                scope["path"] = path[len("/api/index"):]

            if not scope["path"]:
                scope["path"] = "/"

        await self.app(scope, receive, send)

app.add_middleware(VercelPathMiddleware)

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
