"""
Optional AI Search Service using Ollama.
Converts natural language queries into structured JSON filters without generating raw SQL.
Includes automatic fallback to keyword parsing if Ollama is offline or unavailable.
"""

import os
import json
import re
from typing import List, Dict, Tuple, Optional
from dotenv import load_dotenv
import httpx
from app.schemas.ai import AIInterpretedFilters

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
REQUEST_TIMEOUT = 15.0

def check_ollama_reachable() -> bool:
    """
    Checks if local Ollama daemon is active and responsive within 2 seconds.
    """
    try:
        with httpx.Client(timeout=2.0) as client:
            resp = client.get(f"{OLLAMA_URL}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False

def fallback_keyword_parser(
    query: str,
    known_skills: List[str],
    known_courses: List[str],
    known_departments: List[str]
) -> AIInterpretedFilters:
    """
    Rule #2: Pure keyword-based fallback parser.
    Extracts known skills, years, and availability without calling Ollama or raising 500 errors.
    """
    q_lower = query.lower()

    # 1. Extract known skills (case-insensitive word boundary match)
    matched_skills = []
    for skill in known_skills:
        pattern = r"(?<!\w)" + re.escape(skill.lower()) + r"(?!\w)"
        if re.search(pattern, q_lower):
            matched_skills.append(skill)

    # 2. Extract skill combination mode (AND vs OR)
    mode = "and" if " and " in q_lower or "all" in q_lower else "or"

    # 3. Extract year of study (1st/2nd/3rd/4th year, year 1-4)
    year = None
    if re.search(r"\b(1st|first|year\s*1)\b", q_lower):
        year = 1
    elif re.search(r"\b(2nd|second|year\s*2)\b", q_lower):
        year = 2
    elif re.search(r"\b(3rd|third|year\s*3)\b", q_lower):
        year = 3
    elif re.search(r"\b(4th|fourth|year\s*4)\b", q_lower):
        year = 4

    # 4. Extract availability
    available = None
    if "available" in q_lower or "free" in q_lower:
        available = True

    # 5. Extract department if explicitly mentioned
    matched_dept = None
    for dept in known_departments:
        if dept.lower() in q_lower:
            matched_dept = dept
            break

    # 6. Extract course if explicitly mentioned
    matched_course = None
    for course in known_courses:
        if course.lower() in q_lower:
            matched_course = course
            break

    return AIInterpretedFilters(
        skills=matched_skills,
        mode=mode,
        course=matched_course,
        department=matched_dept,
        year=year,
        available=available
    )

def parse_query_with_ai(
    query: str,
    known_skills: List[str],
    known_courses: List[str],
    known_departments: List[str]
) -> Tuple[bool, AIInterpretedFilters]:
    """
    Translates a natural language query into JSON filters.
    Calls Ollama if reachable; otherwise gracefully falls back to keyword parsing.

    Returns:
        (used_ai: bool, interpreted_filters: AIInterpretedFilters)
    """
    system_prompt = (
        "You are an assistant that converts university student search requests into JSON filters.\n"
        f"Allowed Skills: {json.dumps(known_skills)}\n"
        f"Allowed Courses: {json.dumps(known_courses)}\n"
        f"Allowed Departments: {json.dumps(known_departments)}\n\n"
        f"User Query: \"{query}\"\n\n"
        "Return ONLY a JSON object matching this schema:\n"
        "{\n"
        '  "skills": ["<exact names from Allowed Skills only>"],\n'
        '  "mode": "and" or "or",\n'
        '  "course": "<exact name from Allowed Courses or null>",\n'
        '  "department": "<exact name from Allowed Departments or null>",\n'
        '  "year": <integer 1-4 or null>,\n'
        '  "available": <true or false or null>\n'
        "}\n"
        "Do NOT return markdown or explanation. Output valid JSON only."
    )

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": system_prompt,
                "stream": False,
                "format": "json"
            }
            resp = client.post(f"{OLLAMA_URL}/api/generate", json=payload)

            if resp.status_code == 200:
                body = resp.json()
                raw_response = body.get("response", "").strip()
                data = json.loads(raw_response)

                # Map & sanitize against known entities (drop unknown items)
                skill_map = {s.lower(): s for s in known_skills}
                course_map = {c.lower(): c for c in known_courses}
                dept_map = {d.lower(): d for d in known_departments}

                filtered_skills = []
                for s in data.get("skills", []):
                    if isinstance(s, str) and s.lower() in skill_map:
                        filtered_skills.append(skill_map[s.lower()])

                course_val = data.get("course")
                matched_course = course_map.get(course_val.lower()) if isinstance(course_val, str) else None

                dept_val = data.get("department")
                matched_dept = dept_map.get(dept_val.lower()) if isinstance(dept_val, str) else None

                mode_val = str(data.get("mode", "or")).lower()
                mode = "and" if mode_val == "and" else "or"

                year_val = data.get("year")
                year = year_val if isinstance(year_val, int) and 1 <= year_val <= 4 else None

                avail_val = data.get("available")
                available = avail_val if isinstance(avail_val, bool) else None

                filters = AIInterpretedFilters(
                    skills=filtered_skills,
                    mode=mode,
                    course=matched_course,
                    department=matched_dept,
                    year=year,
                    available=available
                )
                return True, filters

    except Exception:
        # Fall through gracefully on timeout, ConnectError, or invalid JSON
        pass

    # Fallback to local keyword extraction
    fallback_filters = fallback_keyword_parser(
        query=query,
        known_skills=known_skills,
        known_courses=known_courses,
        known_departments=known_departments
    )
    return False, fallback_filters
