import pytest
from app.services.matching_service import calculate_match_score

# ==============================================================================
# Pure Function Tests (no DB dependencies)
# ==============================================================================

def test_pure_function_perfect_match():
    # Student meets exact minimum proficiency on all required skills
    req_skills = [
        {"skill_id": 1, "skill_name": "Python", "min_proficiency": 3, "weight": 5},
        {"skill_id": 2, "skill_name": "FastAPI", "min_proficiency": 4, "weight": 3},
    ]
    student_skills = {
        1: {"proficiency": 3, "verified": False},
        2: {"proficiency": 4, "verified": False},
    }

    res = calculate_match_score(req_skills, student_skills)
    assert res["score"] == 100.0
    assert len(res["matched_skills"]) == 2
    assert len(res["missing_skills"]) == 0

def test_pure_function_no_matching_skills():
    # Student has skills, but none overlap with project requirements
    req_skills = [
        {"skill_id": 1, "skill_name": "Python", "min_proficiency": 3, "weight": 4},
        {"skill_id": 2, "skill_name": "Docker", "min_proficiency": 2, "weight": 2},
    ]
    student_skills = {
        3: {"proficiency": 5, "verified": True},
        4: {"proficiency": 4, "verified": True},
    }

    res = calculate_match_score(req_skills, student_skills)
    assert res["score"] == 0.0
    assert len(res["matched_skills"]) == 0
    assert len(res["missing_skills"]) == 2

def test_pure_function_partial_match_hand_calculated():
    """
    Hand Calculation:
    Required skills:
      1. Python: min_proficiency = 4, weight = 3
      2. FastAPI: min_proficiency = 2, weight = 1
      3. Docker: min_proficiency = 3, weight = 2
    Total weight = 3 + 1 + 2 = 6

    Student has:
      - Python: level = 2 (unverified) -> ratio = min(2/4, 1) = 0.5 -> weighted = 3 * 0.5 = 1.5
      - FastAPI: level = 2 (unverified) -> ratio = min(2/2, 1) = 1.0 -> weighted = 1 * 1.0 = 1.0
      - Docker: missing -> ratio = 0.0 -> weighted = 2 * 0 = 0.0

    Weighted sum = 1.5 + 1.0 + 0.0 = 2.5
    Base score = (2.5 / 6) * 100 = 41.6666...%
    Verified bonus = 0 (0 verified out of 2 matched skills)
    Final score = round(41.6666..., 1) = 41.7
    """
    req_skills = [
        {"skill_id": 1, "skill_name": "Python", "min_proficiency": 4, "weight": 3},
        {"skill_id": 2, "skill_name": "FastAPI", "min_proficiency": 2, "weight": 1},
        {"skill_id": 3, "skill_name": "Docker", "min_proficiency": 3, "weight": 2},
    ]
    student_skills = {
        1: {"proficiency": 2, "verified": False},
        2: {"proficiency": 2, "verified": False},
    }

    res = calculate_match_score(req_skills, student_skills)
    assert res["score"] == 41.7
    assert res["base_score"] == 41.7
    assert res["verified_bonus"] == 0.0
    assert len(res["matched_skills"]) == 2
    assert len(res["missing_skills"]) == 1
    assert res["missing_skills"][0]["skill_id"] == 3

def test_pure_function_overqualified_is_capped():
    # Student has level 5 for a skill requiring level 2
    # min(5/2, 1.0) must cap at 1.0 and give no extra points beyond 100%
    req_skills = [
        {"skill_id": 1, "skill_name": "Python", "min_proficiency": 2, "weight": 5}
    ]
    student_skills = {
        1: {"proficiency": 5, "verified": False}
    }

    res = calculate_match_score(req_skills, student_skills)
    assert res["score"] == 100.0

def test_pure_function_verified_bonus_and_capped_at_100():
    # 1. Test proportional verified bonus:
    # 2 required skills (total weight = 4):
    #   - Skill 1 (weight 2, required 4): student has 2 (verified) -> ratio 0.5 -> weighted 1.0
    #   - Skill 2 (weight 2, required 2): student has 2 (unverified) -> ratio 1.0 -> weighted 2.0
    # Base score = (3.0 / 4.0) * 100 = 75.0
    # Verified share = 1 verified / 2 matched required = 0.5
    # Verified bonus = 5.0 * 0.5 = 2.5
    # Expected final score = 75.0 + 2.5 = 77.5
    req_skills = [
        {"skill_id": 1, "skill_name": "React", "min_proficiency": 4, "weight": 2},
        {"skill_id": 2, "skill_name": "TypeScript", "min_proficiency": 2, "weight": 2},
    ]
    student_skills = {
        1: {"proficiency": 2, "verified": True},
        2: {"proficiency": 2, "verified": False},
    }

    res = calculate_match_score(req_skills, student_skills)
    assert res["base_score"] == 75.0
    assert res["verified_bonus"] == 2.5
    assert res["score"] == 77.5

    # 2. Test verified bonus never exceeds 100.0:
    # Base score = 100.0, both verified -> bonus = 5.0 -> min(100.0, 105.0) = 100.0
    student_perfect_verified = {
        1: {"proficiency": 4, "verified": True},
        2: {"proficiency": 2, "verified": True},
    }
    res_capped = calculate_match_score(req_skills, student_perfect_verified)
    assert res_capped["base_score"] == 100.0
    assert res_capped["verified_bonus"] == 5.0
    assert res_capped["score"] == 100.0

# ==============================================================================
# API Endpoint Integration Tests
# ==============================================================================

def test_api_project_with_no_skills_returns_400(client):
    # Create project without requirements
    proj = client.post("/api/v1/projects/", json={
        "title": "Empty Project",
        "description": "Has no skill requirements yet",
        "contact_email": "test@university.edu"
    }).json()

    # Rule 1: Project with no required skills returns HTTP 400
    res_get = client.get(f"/api/v1/matching/projects/{proj['id']}/students")
    assert res_get.status_code == 400
    assert res_get.json()["detail"] == "project has no required skills"

    # Auto-shortlist on empty project also returns HTTP 400
    res_auto = client.post(f"/api/v1/matching/projects/{proj['id']}/auto-shortlist")
    assert res_auto.status_code == 400
    assert res_auto.json()["detail"] == "project has no required skills"

def test_api_matching_ranking_order_and_candidate_detail(client):
    # Setup department & course
    dept = client.post("/api/v1/departments/", json={"name": "Computer Science", "code": "CS"}).json()
    course = client.post("/api/v1/courses/", json={
        "name": "B.Tech CSE", "code": "BT-CS", "department_id": dept["id"]
    }).json()

    # Create skills
    s_py = client.post("/api/v1/skills/", json={"name": "Python", "category": "Backend"}).json()
    s_fast = client.post("/api/v1/skills/", json={"name": "FastAPI", "category": "Backend"}).json()

    # Create students:
    # Student 1: Top match (Python 4, FastAPI 4, verified)
    stu1 = client.post("/api/v1/students/", json={
        "full_name": "Alice Top", "email": "alice@cs.edu", "reg_no": "2024CS001",
        "course_id": course["id"], "year_of_study": 3, "available": True
    }).json()
    client.post("/api/v1/student-skills/", json={"student_id": stu1["id"], "skill_id": s_py["id"], "proficiency": 4, "verified": True})
    client.post("/api/v1/student-skills/", json={"student_id": stu1["id"], "skill_id": s_fast["id"], "proficiency": 4, "verified": True})

    # Student 2: Medium match (Python 2, FastAPI missing)
    stu2 = client.post("/api/v1/students/", json={
        "full_name": "Bob Mid", "email": "bob@cs.edu", "reg_no": "2024CS002",
        "course_id": course["id"], "year_of_study": 2, "available": True
    }).json()
    client.post("/api/v1/student-skills/", json={"student_id": stu2["id"], "skill_id": s_py["id"], "proficiency": 2, "verified": False})

    # Student 3: Low/Zero match (no skills)
    stu3 = client.post("/api/v1/students/", json={
        "full_name": "Charlie None", "email": "charlie@cs.edu", "reg_no": "2024CS003",
        "course_id": course["id"], "year_of_study": 1, "available": True
    }).json()

    # Create project with requirements: Python (min 3, weight 3), FastAPI (min 3, weight 3)
    proj = client.post("/api/v1/projects/", json={
        "title": "Backend API Service",
        "description": "Production REST API",
        "contact_email": "api@cs.edu"
    }).json()
    client.post("/api/v1/project-skills/", json={"project_id": proj["id"], "skill_id": s_py["id"], "min_proficiency": 3, "weight": 3})
    client.post("/api/v1/project-skills/", json={"project_id": proj["id"], "skill_id": s_fast["id"], "min_proficiency": 3, "weight": 3})

    # 1. Test project candidate ranking endpoint
    res = client.get(f"/api/v1/matching/projects/{proj['id']}/students")
    assert res.status_code == 200
    candidates = res.json()
    assert len(candidates) == 3

    # Ranking order must be: Alice (100.0) > Bob (~33.3) > Charlie (0.0)
    assert candidates[0]["student_id"] == stu1["id"]
    assert candidates[0]["score"] == 100.0
    assert len(candidates[0]["matched_skills"]) == 2
    assert len(candidates[0]["missing_skills"]) == 0

    assert candidates[1]["student_id"] == stu2["id"]
    assert candidates[1]["score"] > 0
    assert len(candidates[1]["matched_skills"]) == 1
    assert len(candidates[1]["missing_skills"]) == 1

    assert candidates[2]["student_id"] == stu3["id"]
    assert candidates[2]["score"] == 0.0

    # 2. Test student matching projects endpoint
    res_stu = client.get(f"/api/v1/matching/students/{stu1['id']}/projects")
    assert res_stu.status_code == 200
    projects_list = res_stu.json()
    assert len(projects_list) >= 1
    assert projects_list[0]["project_id"] == proj["id"]
    assert projects_list[0]["score"] == 100.0

def test_api_auto_shortlist_skips_duplicates(client):
    dept = client.post("/api/v1/departments/", json={"name": "Electrical", "code": "EE"}).json()
    course = client.post("/api/v1/courses/", json={
        "name": "B.Tech EE", "code": "BT-EE", "department_id": dept["id"]
    }).json()
    skill = client.post("/api/v1/skills/", json={"name": "Circuits", "category": "Hardware"}).json()

    s1 = client.post("/api/v1/students/", json={
        "full_name": "Dan Sparks", "email": "dan@ee.edu", "reg_no": "2024EE001",
        "course_id": course["id"], "year_of_study": 3
    }).json()
    client.post("/api/v1/student-skills/", json={"student_id": s1["id"], "skill_id": skill["id"], "proficiency": 4})

    proj = client.post("/api/v1/projects/", json={
        "title": "Circuit Design", "description": "PCB layout", "contact_email": "pcb@ee.edu"
    }).json()
    client.post("/api/v1/project-skills/", json={"project_id": proj["id"], "skill_id": skill["id"], "min_proficiency": 3, "weight": 5})

    # Pre-shortlist Dan manually
    client.post("/api/v1/shortlists/", json={
        "project_id": proj["id"],
        "student_id": s1["id"],
        "match_score": 100.0,
        "status": "shortlisted"
    })

    # Call auto-shortlist
    res_auto = client.post(f"/api/v1/matching/projects/{proj['id']}/auto-shortlist?top_n=5&min_score=50")
    assert res_auto.status_code == 200
    data = res_auto.json()

    # Dan was already shortlisted, so skipped_count must be 1, created_count 0
    assert data["skipped_count"] == 1
    assert data["created_count"] == 0
    assert len(data["shortlisted_students"]) == 0
