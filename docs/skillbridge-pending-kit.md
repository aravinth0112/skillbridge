# SkillBridge Pending Kit

Contents: A) Mock evaluator Q&A, B) 5-minute demo script, C) Optional JWT login prompt, D) Final checklist prompt, E) Submission report outline.

---

## A) Mock evaluator questions (with answers based on your project)

**Concept**
1. **What problem does SkillBridge solve?**
   Faculty and placement cells pick the same few known students, and skills sit in resumes and chats. SkillBridge stores skills with levels and ranks students for a project, with reasons.
2. **How is it different from a normal student database?**
   A normal database only stores records. SkillBridge takes a project's required skills and returns ranked candidates with a score, matched skills and missing skills.
3. **Who uses it?**
   Admins: faculty, project coordinators, the placement cell.

**Database**
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

**Matching**
9. **Explain the match score.**
   For each required skill: `weight x min(student_level / required_level, 1)`. Sum them, divide by the sum of weights, multiply by 100. A missing skill counts 0. A small verified bonus (up to 5 points) applies, and the final score is capped at 100.
10. **Why `min(..., 1)`?**
    Being over-qualified in one skill shouldn't hide a missing skill elsewhere.
11. **Why is it explainable?**
    Each result lists matched skills (with both levels) and missing skills, so a faculty member sees why a student ranked where they did.
12. **Is the matching efficient?**
    Yes. A project's requirements and all candidates' skills are loaded in a single query each, not one query per student.

**API and code**
13. **Why plain `def` routes instead of `async def`?**
    I use synchronous SQLAlchemy sessions. An async route with a sync database call can block the server.
14. **How do you handle errors?**
    Pydantic returns 422 for invalid input. Duplicates and restricted deletes return 409. Missing records return 404. A project with no required skills returns 400 for matching.
15. **How did you test it?**
    24 pytest tests: CRUD lifecycles, 409 and cascade rules, search, dashboard, matching math (including a hand-calculated case), and AI with Ollama mocked.

**AI**
16. **How does the AI search work?**
    Ollama turns a sentence into JSON filters. The output is validated by Pydantic, and names are mapped to real database records. Unknown ones are dropped. The normal search then runs.
17. **Why doesn't the LLM write SQL?**
    Safety and correctness. The model can hallucinate or be injected. Here it only picks filter values, and my code runs the query.
18. **What if Ollama is off?**
    A keyword parser takes over, and the badge shows basic search. No 500 error.
19. **Privacy?**
    Ollama runs locally, and the prompt contains only skill, course and department names, not student records.

**Honest limitations**
20. **What is missing?**
    No login (any user can edit), self-claimed skills unless verified, no resume parsing. Future work: JWT admin login, resume skill extraction, skill gap analysis, PostgreSQL.

---

## B) 5-minute demo script

| Time | Do | Say |
|---|---|---|
| 0:00 | Open dashboard | "Faculty can't easily find the right student for a project. SkillBridge fixes that." |
| 0:30 | Point at charts | "Students per department, and skill supply against demand." |
| 1:15 | Smart search: "3rd year students good in Python and SQL" | "An LLM turns this into filters. It never writes SQL." |
| 2:00 | Turn Ollama off, search again | "Fallback keeps it working." (turn it back on afterward) |
| 2:30 | Create project, add 3 skills with levels and weights | "These are the requirements." |
| 3:15 | Click Find matches | "Ranked by score. Green is matched, red is missing." |
| 3:45 | Explain one score by hand | "weight x min(level/required, 1), summed, divided by total weight." |
| 4:30 | Shortlist a student, change status | "Pipeline: shortlisted, contacted, selected." |
| 4:50 | Open `/docs`, show 409 on duplicate | "All endpoints are documented and tested." |

Before starting: reset the database, seed it, run `ollama serve`, warm up one search, close other tabs.

---

## C) Optional JWT admin login prompt (Antigravity)

```
Approved. Phase 3B only: admin login with JWT. Do not break existing behavior for
reads. Tests must pass.

1. Table users(id, username UNIQUE, password_hash, role default 'admin', created_at).
   Hash passwords with passlib[bcrypt] (or bcrypt directly). Never store plain text.
2. Endpoints: POST /api/v1/auth/login (form or JSON, returns access_token + token_type),
   GET /api/v1/auth/me. Token via PyJWT, HS256, expiry 60 minutes, SECRET_KEY and
   ADMIN_USERNAME / ADMIN_PASSWORD from .env (add to .env.example). Seed the admin
   user at startup if missing. Reject default or empty SECRET_KEY outside tests with a
   clear warning.
3. Protect all POST, PUT, DELETE endpoints (including auto-shortlist and AI search
   write paths) with a dependency requiring a valid token. GET endpoints and the
   static frontend stay public. Return 401 for missing/invalid token.
4. Frontend: add login.html (username + password), store the token in sessionStorage,
   send Authorization: Bearer in apiRequest(), show Login/Logout in the nav, redirect
   to login on 401, and hide edit/delete buttons when logged out.
5. Tests: login success/failure, protected endpoint without token returns 401, with
   token succeeds, expired token rejected. Update existing tests to authenticate via a
   fixture.
6. Add an "Authentication" section to DECISIONS.md and README (leave "My note" fields).

When done: run pytest, explain each new or changed file in 5 lines, and stop.
```

---

## D) Final checklist prompt (after the UI redesign)

```
Final verification. Do not add features.
1. Run pytest and report the result.
2. Search app/static for innerHTML that includes user data and fix any.
3. Confirm no external network requests are needed (fonts, charts, scripts all local).
4. Confirm README commands match what actually works, including the port.
5. Run seed.py twice and confirm counts do not change.
6. List any TODO or leftover debug code.
Report findings as a short list and stop.
```

---

## E) Submission report outline

1. Title page: project name, your name, internship details
2. Abstract (5 lines)
3. Problem statement and objectives
4. Technology stack and why
5. System architecture (layers diagram)
6. Database design (ER diagram, table list, constraints)
7. API design (endpoint table, status codes)
8. Matching algorithm (formula, worked example)
9. AI module (design, fallback, privacy)
10. User interface (screenshots)
11. Testing (test list and results)
12. Limitations and future work
13. Conclusion
14. References (FastAPI, SQLAlchemy, Pydantic, Ollama docs)
