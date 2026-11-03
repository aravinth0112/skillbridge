# SkillBridge – Design Decisions

Use this file to explain the project in your evaluation. Fill in "My note" in your own words after each phase.

## 1. Problem
Student data sits in resumes and chats. Faculty and placement cells pick the same few students and shortlist manually.
SkillBridge answers: "I have a project needing X, Y, Z. Who fits, and why?"

## 2. Why this stack
| Choice | Reason |
|---|---|
| Python | Required; readable, strong ecosystem |
| FastAPI | Required; automatic validation and Swagger docs at /docs |
| SQLite | Required; zero setup, single file, fits project scale |
| SQLAlchemy | Maps Python classes to tables, avoids raw SQL errors |
| Pydantic | Validates request and response data |

## 3. Database design
- **departments 1–N courses 1–N students**: a student belongs to one degree course, a course belongs to one department. Department is derived via course.
- **students N–N skills** via `student_skills`: a student has many skills, each with proficiency 1-5, a verified boolean flag, and updated_at timestamp.
- **projects N–N skills** via `project_skills`: each required skill has a minimum level (1-5) and importance weight (1-5).
- **projects N–N students** via `shortlists`: stores match score (0-100) and status (shortlisted, contacted, selected).
- UNIQUE constraints on reg_no, email, (student_id, skill_id), (project_id, student_id) to prevent duplicates.
- Deletion rules: department with courses cannot be deleted (409 Conflict); course with students cannot be deleted (409 Conflict); skill in active use cannot be deleted (409 Conflict); deleting a student or project cleanly cascades to their link records.

My note: Database is normalized to 3NF with SQLite foreign keys actively enforced using connection PRAGMA listeners. Degree courses cleanly separate academic faculties from individual student enrolments.

## 4. Match score
Formula: `base = sum(weight × min(student_level / min_proficiency, 1)) / sum(weight) × 100`
- **Missing Skills**: A candidate with no rating for a required skill contributes `0.0` for that skill.
- **Over-qualification Cap**: Evaluated as `min(student_level / min_proficiency, 1.0)`. A student possessing Level 5 for a Level 2 requirement receives `1.0` maximum contribution, preventing distortion.
- **Skill Weighting**: Multipliers from 1 (low importance) to 5 (critical) scale skill impact on the base score.
- **Verified Bonus**: Proportional bonus up to `+5.0` points based on the fraction of the student's matched required skills that have `verified == True` (`5.0 * (verified_matched / total_matched)`).
- **Boundary Clamping & Precision**: Final score is capped at `100.0` and rounded to 1 decimal place.
- **Explainable Reasoning**: Calculations return detailed `matched_skills` (including student level vs required level) and `missing_skills` so match decisions are transparent.
- **Validation**: Projects with zero required skills reject candidate matching with HTTP 400 ("project has no required skills").

My note: ______

## 5. API design
- One router per resource, standard REST verbs with synchronous `def` endpoints.
- List endpoints support pagination, sorting and filters.
- Errors: 404 not found, 409 duplicate or restricted delete conflict, 422 validation / check constraint failure.
- Search endpoint supports combined multi-skill filtering with AND/OR modes, course, department, year, and availability.

My note: Strict HTTP status code mapping (409 on duplicate records and restricted deletions, 201 on creation, 204 on deletion) ensures clear client error feedback.

## 6. AI design (optional)
- **Local Ollama Daemon**: Interacts via HTTP POST `/api/generate` (`format: "json"` mode, 15s timeout) using `llama3.2`. Zero cloud costs and complete student data privacy.
- **Strict JSON-Only Scope**: The LLM prompt is injected with known database entities (skills, courses, departments). The model is constrained to return only JSON filters (`skills`, `mode`, `course`, `department`, `year`, `available`).
- **Sanitization & Mapping**: Extracted entities are cross-checked case-insensitively against active records. Hallucinated or unknown skills/courses are dropped.
- **SQL Safety Guarantee**: The LLM never writes or executes SQL. Query execution always proceeds through validated SQLAlchemy ORM queries.
- **Zero-Downtime Fallback**: If Ollama is offline, times out, or emits invalid JSON, a local keyword/regex parser extracts known skills, year of study (1-4), and availability without ever raising an HTTP 500 error.

My note: AI is purely a natural language query parser producing structured filters, keeping SQL execution safe.

## 7. Limitations and future work
- Skills are self-claimed unless verified by an admin.
- SQLite suits one server; production would move to PostgreSQL.
- Future: skill gap heatmap, team builder, resume skill extractor, CSV import.

## 8. Likely evaluator questions
1. Why a link table for student skills? (extra fields like proficiency and verified status, N–N relationship)
2. How is the match score calculated? (formula above with weights and capping at 1.0)
3. What happens if you delete a department that has courses? (Returns 409 Conflict, blocking accidental deletion of active curricula)
4. Why not let the AI write SQL? (safety, SQL injection prevention, correctness guarantee)
5. How would you scale this? (PostgreSQL connection pooling, Redis caching, JWT auth roles)
6. How did you test it? (pytest covering full CRUD operations, cascade deletes, 409 conflict errors, search, and dashboard stats)

## 9. Phase log
| Phase | Done | What I learned |
|---|---|---|
| 1 Models + DB + CRUD | [x] | How to configure SQLite with PRAGMA foreign keys, write clean SQLAlchemy ORM models with CHECK constraints, implement full CRUD with 409 Conflict handling, and test endpoints with Pytest. |
| 2 Matching Engine | [x] | Implemented pure matching function with weighted capping, verified bonus, explainable matched/missing lists, and batch query loading. |
| 2.5 Dashboard UI | [x] | Built vanilla JS + Chart.js responsive frontend, safely escaping textContent, friendly 409/422 error alerts, and interactive candidate match cards. |
| 3 AI Search | [x] | Implemented Ollama natural-language query parser to JSON filters with zero-downtime keyword fallback, dropping unknown entities and protecting SQL execution. |

## 10. Final state
### What was built
- **Complete Relational Architecture**: 8 normalized tables across academic hierarchy, student profiles, skill catalogs, project requirements, and shortlist pipelines with enforced foreign key PRAGMA rules.
- **RESTful API Core**: Complete CRUD across all resources with explicit HTTP status codes (201 Created, 204 No Content, 409 Conflict on restricted parent deletes, 422 Validation).
- **Explainable Matching Engine**: Pure mathematical scoring function with weighted requirements, over-qualification capped at 1.0, verified bonus up to +5%, and explainable matched/missing breakdowns.
- **Resilient AI Search**: Structured JSON filter extraction via local Ollama (`llama3.2`) with seamless, zero-downtime keyword fallback guaranteeing no HTTP 500 errors.
- **Accessible Vanilla Frontend**: 5 dedicated pages (Dashboard, Students, Student Profile, Projects, Matcher Drawer), signature 5-segment skill gauges with shortfall hatching, responsive from 360px to 1280px, motion control switch, and keyboard command palette (`/`).

### Test Suite Verification
- **Automated Tests**: 24 tests across all modules (`test_crud.py`, `test_matching.py`, `test_search.py`).
- **Pass Rate**: 24 passed, 0 failed in 6.58 seconds.

### Known Limitations
- **Proficiency Verification**: Student skills are self-claimed unless explicitly flagged as verified by faculty or administrators.
- **Database Concurrency**: SQLite operates in single-writer mode; production multi-user scale will require migrating connection strings to PostgreSQL.
- **Query Parser Scope**: AI search parses natural language queries into discrete entity filters rather than generating open-ended arbitrary SQL.
