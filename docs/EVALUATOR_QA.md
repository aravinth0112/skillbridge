# SkillBridge – Evaluator Q&A and 5-Minute Live Demo Script

---

## Part 1: Section A (Verbatim from Pending Kit)

### Concept
1. **What problem does SkillBridge solve?**  
   Faculty and placement cells pick the same few known students, and skills sit in resumes and chats. SkillBridge stores skills with levels and ranks students for a project, with reasons.

2. **How is it different from a normal student database?**  
   A normal database only stores records. SkillBridge takes a project's required skills and returns ranked candidates with a score, matched skills and missing skills.

3. **Who uses it?**  
   Admins: faculty, project coordinators, the placement cell.

### Database
4. **Why a separate `student_skills` table?**  
   Students and skills are many-to-many. The link table also holds extra data: proficiency 1-5, verified flag, updated time. A unique constraint on (student, skill) stops duplicates.

5. **Why does `students` have `course_id` but no `department_id`?**  
   Department is derived through the course. Storing both would duplicate data and could go out of sync.

6. **What happens if you delete a department that has courses?**  
   The API returns 409 Conflict. Same for a course that has students, or a skill used by a student or project. Deleting a student or project cascades to its skills and shortlists.

7. **Why does SQLite need `PRAGMA foreign_keys=ON`?**  
   SQLite ignores foreign keys by default. It runs on every connection in `database.py`, so delete rules are enforced.

8. **Why SQLite? Can it scale?**  
   Zero setup and enough for this scale. Because I use SQLAlchemy, moving to PostgreSQL mostly means changing the connection string.

### Matching
9. **Explain the match score.**  
   For each required skill: `weight x min(student_level / required_level, 1)`. Sum them, divide by the sum of weights, multiply by 100. A missing skill counts 0. A small verified bonus (up to 5 points) applies, and the final score is capped at 100.

10. **Why `min(..., 1)`?**  
    Being over-qualified in one skill shouldn't hide a missing skill elsewhere.

11. **Why is it explainable?**  
    Each result lists matched skills (with both levels) and missing skills, so a faculty member sees why a student ranked where they did.

12. **Is the matching efficient?**  
    Yes. A project's requirements and all candidates' skills are loaded in a single query each, not one query per student.

### API and Code
13. **Why plain `def` routes instead of `async def`?**  
    I use synchronous SQLAlchemy sessions. An async route with a sync database call can block the server.

14. **How do you handle errors?**  
    Pydantic returns 422 for invalid input. Duplicates and restricted deletes return 409. Missing records return 404. A project with no required skills returns 400 for matching.

15. **How did you test it?**  
    24 pytest tests: CRUD lifecycles, 409 and cascade rules, search, dashboard, matching math (including a hand-calculated case), and AI with Ollama mocked.

### AI
16. **How does the AI search work?**  
    Ollama turns a sentence into JSON filters. The output is validated by Pydantic, and names are mapped to real database records. Unknown ones are dropped. The normal search then runs.

17. **Why doesn't the LLM write SQL?**  
    Safety and correctness. The model can hallucinate or be injected. Here it only picks filter values, and my code runs the query.

18. **What if Ollama is off?**  
    A keyword parser takes over, and the badge shows basic search. No 500 error.

19. **Privacy?**  
    Ollama runs locally, and the prompt contains only skill, course and department names, not student records.

### Honest Limitations
20. **What is missing?**  
    No login (any user can edit), self-claimed skills unless verified, no resume parsing. Future work: JWT admin login, resume skill extraction, skill gap analysis, PostgreSQL.

---

## Part 2: Section B (5-Minute Live Demo Script Matching Actual Code)

| Time | Action | What to Click / Type | Narration & Code Alignment |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:30** | **Open Dashboard** | Navigate to `http://127.0.0.1:8000/app/index.html`. | *"Faculty can't easily find the right student for a project. SkillBridge fixes that by turning unstructured resumes into ranked, explainable matches. Notice our high-contrast paper palette and animated KPI totals."* |
| **0:30 - 1:15** | **Point at Charts** | Scroll down to the Supply vs Demand skill chart. | *"Here we track students per department and project skill demand against student supply. Skills with demand above zero and 3 or fewer available students are automatically tagged with coral 'Thin bench' badges."* |
| **1:15 - 2:00** | **Natural Language Search** | In the Ask bar, type: `3rd year students good in Python and SQL` and press Enter. | *"Our local Ollama LLM converts plain English into structured JSON filters without ever touching raw SQL. In this demo query, it extracts Year 3 and skills Python + SQL, displaying the top 5 candidates inline with interpreted filter badges."* |
| **2:00 - 2:30** | **Test Fallback Resilience** | Search for `nonexistent framework` or query with Ollama daemon stopped. | *"When Ollama is unreachable or times out, our zero-downtime fallback parser takes over with keyword/regex extraction. The API returns status 200 with `used_ai: false`, guaranteeing zero 500 crashes."* |
| **2:30 - 3:15** | **Create Project & Skills** | Navigate to Projects (`projects.html`), click '+ New Project' drawer. Fill in title, deadline, and add 3 skills with levels (1-5) and weights (1-5). | *"Faculty define projects with explicit minimum proficiencies and weights from 1 to 5. These constraints are enforced directly at the database level with SQLAlchemy CheckConstraints."* |
| **3:15 - 3:45** | **Find Matches & Gauges** | Click 'Find Matches' for **Campus AI Assistant**. | *"The matching engine ranks candidates by score. Here is our signature 5-segment skill gauge: required levels appear as markers, shortfalls show hatched diagonal gaps, and surpluses are solidly filled."* |
| **3:45 - 4:30** | **Explain Match Calculation** | Expand Aarav Sharma's score (80.0%). | *"The score is calculated as `weight x min(level/required, 1)`, summed across skills, divided by total weight, plus a verified skill bonus up to +5%. Over-qualification is capped at 1.0, preventing a high Python score from masking missing PyTorch."* |
| **4:30 - 4:50** | **Manage Shortlist Pipeline** | Drag or advance Aarav from 'Shortlisted' to 'Contacted'. | *"The shortlist pipeline persists state transitions directly to `/api/v1/shortlists/{id}` with optimistic UI updates and instant error rollback if the network fails."* |
| **4:50 - 5:00** | **API Documentation & Tests** | Open `/docs` and show Swagger UI. Switch to terminal and run `pytest`. | *"All 26 endpoints are fully documented with OpenAPI schemas and validated by Pydantic v2. Our 24 automated tests cover full CRUD lifecycles, 409 conflict rules, and matching math."* |

---

## Part 3: Five Code-Based Questions

### 1. Match Formula Implementation
**Question**: How is the matching formula implemented in `app/services/matching_service.py`, and how does it prevent over-qualification distortion?  
**Answer**:  
In `app/services/matching_service.py`, the core calculation is performed in `calculate_match_score()`:
```python
# Base weighted contribution
ratio = min(student_level / req.min_proficiency, 1.0)
weighted_sum += req.weight * ratio
total_weight += req.weight

base_score = (weighted_sum / total_weight) * 100.0 if total_weight > 0 else 0.0

# Verified skill bonus
if total_matched > 0:
    bonus = 5.0 * (verified_matched / total_matched)
    final_score = min(100.0, round(base_score + bonus, 1))
```
Over-qualification distortion is prevented by `min(student_level / req.min_proficiency, 1.0)`. Even if a student has proficiency 5 for a level-2 requirement, their ratio is capped at `1.0`. They receive full weight credit for that requirement, but cannot earn surplus points to compensate for missing other required skills.

### 2. AI Fallback and Zero-Downtime Resilience
**Question**: How does `app/services/ai_service.py` ensure the system never returns an HTTP 500 error when the local AI fails?  
**Answer**:  
The endpoint `POST /api/v1/ai/search` wraps the entire Ollama communication in a robust `try...except` block with a 15-second `httpx.Timeout`. If `httpx.ConnectError`, `httpx.TimeoutException`, or JSON parsing failure occurs, the code logs the error and seamlessly delegates to `_keyword_fallback_search(query, db)`:
```python
try:
    response = client.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=15.0)
    # Validate and parse JSON filters...
except Exception as e:
    logger.warning(f"Ollama request failed: {e}. Falling back to keyword parser.")
    return _keyword_fallback_search(query, db)
```
The fallback function tokenizes the input string and compares it against known database skills, degree courses, study years (digits 1-4), and availability keywords. The response is returned with HTTP 200 and `used_ai: false`.

### 3. Schema Migrations and SQLite Foreign Key Enforcement
**Question**: How does SkillBridge enforce database schema integrity and handle migrations?  
**Answer**:  
SkillBridge defines relational models via SQLAlchemy 2.0 ORM in `app/models.py`. Initial schema setup is performed through `Base.metadata.create_all(bind=engine)`.  
Because SQLite disables foreign key enforcement by default, `app/database.py` registers an engine connection listener:
```python
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
```
This guarantees that foreign key constraints, restricted deletes (returning HTTP 409 when attempting to delete a department with active courses), and cascade deletes are strictly enforced by the database engine. In an enterprise production setting, DDL schema alterations would be managed through Alembic migration scripts.

### 4. 5-Segment Skill Gauge Rendering
**Question**: How are the signature 5-segment skill gauges rendered in CSS and JavaScript without using external UI libraries?  
**Answer**:  
The gauges are rendered via clean DOM utilities in `app/static/js/common.js` (`renderSkillMeter()`) and styled in `app/static/css/style.css`. Each gauge consists of a container with 5 discrete `div.gauge-segment` elements:
- In roster views, segments up to the student's proficiency receive the `.active` class (styled in solid cobalt `#1D4ED8`).
- In project match comparisons, the project's required proficiency adds a vertical pin marker via `.required` (styled in deep amber `#B45309` with a 1px ink outline for WCAG AAA contrast).
- If the student's level is lower than required, the intervening segments receive `.gap` with a CSS diagonal hatched striping pattern (`repeating-linear-gradient(45deg, ...)`).
- If the student exceeds the requirement, extra segments receive `.surplus`.
- In interactive edit forms, each segment is rendered as an accessible `<button>` with `role="button"`, ARIA labels (`aria-label="Set Python to 3"`), and keyboard arrow navigation.

### 5. Role of Starlette vs FastAPI
**Question**: What is the relationship between Starlette and FastAPI in the SkillBridge architecture?  
**Answer**:  
FastAPI is an extension and wrapper built directly on top of Starlette:
- **Starlette's Role**: Provides the underlying ASGI foundation, request/response cycle, routing table (`starlette.routing`), middleware stack (CORS, GZip), static asset streaming (`StaticFiles`), and test harness (`starlette.testclient.TestClient`).
- **FastAPI's Layer**: Adds developer-facing API enhancements: automatic schema generation (`openapi.json` and Swagger UI at `/docs`), Pydantic v2 request body validation and response serialization, dependency injection (`Depends(get_db)`), and automatic HTTP error formatting.
In `SkillBridge`, Starlette mounts the frontend static directory (`app.mount("/app", StaticFiles(directory="app/static"), name="static")`), while FastAPI manages all REST endpoint routing, query parameter coercion, and data contracts.
