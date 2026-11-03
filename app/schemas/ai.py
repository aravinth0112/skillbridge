from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.search import StudentSearchResult

class AISearchRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Natural language query, e.g. '3rd year students good in Python and SQL'"
    )

class AIInterpretedFilters(BaseModel):
    skills: List[str] = []
    mode: str = "or"
    course: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    available: Optional[bool] = None

class AISearchResponse(BaseModel):
    used_ai: bool
    interpreted_filters: AIInterpretedFilters
    results: List[StudentSearchResult]

class AIStatusResponse(BaseModel):
    ollama_reachable: bool
    model: str
    url: str
