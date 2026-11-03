import pytest

def test_root_health(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

def test_department_crud_and_conflict(client):
    # 1. Create department
    res = client.post("/api/v1/departments/", json={"name": "Computer Science", "code": "CSE"})
    assert res.status_code == 201
    dept_id = res.json()["id"]
    assert res.json()["name"] == "Computer Science"
    assert res.json()["code"] == "CSE"

    # 2. Duplicate unique-constraint returns 409 (Rule #7)
    res_dup = client.post("/api/v1/departments/", json={"name": "Computer Science", "code": "CSE"})
    assert res_dup.status_code == 409

    # 3. Read single & list
    res_get = client.get(f"/api/v1/departments/{dept_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == dept_id

    res_list = client.get("/api/v1/departments/")
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1

    # 4. Update
    res_update = client.put(f"/api/v1/departments/{dept_id}", json={"name": "Computer Science & Eng"})
    assert res_update.status_code == 200
    assert res_update.json()["name"] == "Computer Science & Eng"

    # 5. Delete empty department
    res_del = client.delete(f"/api/v1/departments/{dept_id}")
    assert res_del.status_code == 204

def test_course_crud_and_department_delete_restriction(client):
    # Setup department
    res_dept = client.post("/api/v1/departments/", json={"name": "Electronics", "code": "ECE"})
    dept_id = res_dept.json()["id"]

    # Create Course under department
    res_course = client.post("/api/v1/courses/", json={
        "name": "B.Tech Electronics & Comm",
        "code": "BT-ECE",
        "department_id": dept_id
    })
    assert res_course.status_code == 201
    course_id = res_course.json()["id"]
    assert res_course.json()["department_name"] == "Electronics"

    # Rule #1: Department with courses CANNOT be deleted (returns 409 Conflict)
    res_del_dept = client.delete(f"/api/v1/departments/{dept_id}")
    assert res_del_dept.status_code == 409
    assert "associated course" in res_del_dept.json()["detail"]

    # Delete course first, then delete department
    res_del_course = client.delete(f"/api/v1/courses/{course_id}")
    assert res_del_course.status_code == 204

    res_del_dept_ok = client.delete(f"/api/v1/departments/{dept_id}")
    assert res_del_dept_ok.status_code == 204

def test_student_crud_cascade_and_course_restriction(client):
    # Setup department & course
    dept_res = client.post("/api/v1/departments/", json={"name": "Information Tech", "code": "IT"})
    dept_id = dept_res.json()["id"]
    course_res = client.post("/api/v1/courses/", json={
        "name": "B.Tech Information Technology",
        "code": "BT-IT",
        "department_id": dept_id
    })
    course_id = course_res.json()["id"]

    # Create student
    res_student = client.post("/api/v1/students/", json={
        "full_name": "Alice Johnson",
        "email": "alice@university.edu",
        "reg_no": "2024IT001",
        "course_id": course_id,
        "year_of_study": 3,
        "available": True,
        "bio": "Enthusiastic full-stack learner"
    })
    assert res_student.status_code == 201
    student_id = res_student.json()["id"]
    assert res_student.json()["department_name"] == "Information Tech"
    assert res_student.json()["course_name"] == "B.Tech Information Technology"

    # Test Rule #7: duplicate email returns 409
    res_dup_email = client.post("/api/v1/students/", json={
        "full_name": "Alice Two",
        "email": "alice@university.edu",
        "reg_no": "2024IT999",
        "course_id": course_id,
        "year_of_study": 2
    })
    assert res_dup_email.status_code == 409

    # Test Rule #9: CHECK constraint year_of_study 1-4 (year 5 should fail with 422)
    res_bad_year = client.post("/api/v1/students/", json={
        "full_name": "Bob Out of Bounds",
        "email": "bob@university.edu",
        "reg_no": "2024IT002",
        "course_id": course_id,
        "year_of_study": 5
    })
    assert res_bad_year.status_code == 422

    # Test Rule #1: Course with enrolled students cannot be deleted (returns 409 Conflict)
    res_del_course = client.delete(f"/api/v1/courses/{course_id}")
    assert res_del_course.status_code == 409
    assert "enrolled student" in res_del_course.json()["detail"]

    # Create a skill and map to student
    skill_res = client.post("/api/v1/skills/", json={"name": "FastAPI", "category": "Backend"})
    skill_id = skill_res.json()["id"]

    res_ss = client.post("/api/v1/student-skills/", json={
        "student_id": student_id,
        "skill_id": skill_id,
        "proficiency": 4,
        "verified": True
    })
    assert res_ss.status_code == 201
    assert res_ss.json()["proficiency_label"] == "Advanced"

    # Rule #7: Delete student cascades to student_skills
    res_del_student = client.delete(f"/api/v1/students/{student_id}")
    assert res_del_student.status_code == 204

    # Verify student skill was cascaded and removed
    res_check_ss = client.get(f"/api/v1/student-skills/?student_id={student_id}")
    assert len(res_check_ss.json()) == 0

def test_skills_crud_and_delete_in_use_restriction(client):
    # Create skill
    skill_res = client.post("/api/v1/skills/", json={"name": "Python", "category": "Programming"})
    assert skill_res.status_code == 201
    skill_id = skill_res.json()["id"]

    # Duplicate skill name returns 409
    res_dup = client.post("/api/v1/skills/", json={"name": "Python", "category": "Other"})
    assert res_dup.status_code == 409

    # Setup student and attach skill
    dept_res = client.post("/api/v1/departments/", json={"name": "Mechanical", "code": "MECH"})
    course_res = client.post("/api/v1/courses/", json={
        "name": "B.Tech Mechanical",
        "code": "BT-ME",
        "department_id": dept_res.json()["id"]
    })
    stu_res = client.post("/api/v1/students/", json={
        "full_name": "Charlie Day",
        "email": "charlie@university.edu",
        "reg_no": "2024ME001",
        "course_id": course_res.json()["id"],
        "year_of_study": 2
    })
    stu_id = stu_res.json()["id"]

    client.post("/api/v1/student-skills/", json={
        "student_id": stu_id,
        "skill_id": skill_id,
        "proficiency": 3
    })

    # Rule #7: skill in use cannot be deleted (returns 409 Conflict)
    del_skill_res = client.delete(f"/api/v1/skills/{skill_id}")
    assert del_skill_res.status_code == 409
    assert "Cannot delete skill" in del_skill_res.json()["detail"]

def test_project_crud_and_cascade(client):
    # Create project
    proj_res = client.post("/api/v1/projects/", json={
        "title": "Smart Campus Navigator",
        "description": "Indoor GPS tracking for university campus",
        "status": "open",
        "deadline": "2026-12-31",
        "contact_email": "faculty@university.edu"
    })
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]
    assert proj_res.json()["deadline"] == "2026-12-31"

    # Create skill and attach to project
    skill_res = client.post("/api/v1/skills/", json={"name": "Flutter", "category": "Mobile"})
    skill_id = skill_res.json()["id"]

    ps_res = client.post("/api/v1/project-skills/", json={
        "project_id": proj_id,
        "skill_id": skill_id,
        "min_proficiency": 3,
        "weight": 5
    })
    assert ps_res.status_code == 201
    assert ps_res.json()["weight"] == 5

    # Duplicate project_skill returns 409
    ps_dup = client.post("/api/v1/project-skills/", json={
        "project_id": proj_id,
        "skill_id": skill_id,
        "min_proficiency": 2,
        "weight": 3
    })
    assert ps_dup.status_code == 409

    # Rule #7: Deleting project cascades to project_skills
    del_proj = client.delete(f"/api/v1/projects/{proj_id}")
    assert del_proj.status_code == 204

    # Verify project skill was removed
    ps_check = client.get(f"/api/v1/project-skills/?project_id={proj_id}")
    assert len(ps_check.json()) == 0

def test_shortlist_crud(client):
    # Setup student and project
    dept = client.post("/api/v1/departments/", json={"name": "Civil", "code": "CIVIL"}).json()
    course = client.post("/api/v1/courses/", json={
        "name": "B.Tech Civil", "code": "BT-CE", "department_id": dept["id"]
    }).json()
    student = client.post("/api/v1/students/", json={
        "full_name": "Diana Prince",
        "email": "diana@university.edu",
        "reg_no": "2024CE001",
        "course_id": course["id"],
        "year_of_study": 4
    }).json()
    project = client.post("/api/v1/projects/", json={
        "title": "Bridge Sensor Analytics",
        "description": "IoT vibration analysis",
        "contact_email": "civil_lab@university.edu"
    }).json()

    # Create shortlist entry
    res = client.post("/api/v1/shortlists/", json={
        "project_id": project["id"],
        "student_id": student["id"],
        "match_score": 92.5,
        "status": "shortlisted",
        "notes": "Excellent structural analytics background"
    })
    assert res.status_code == 201
    sl_id = res.json()["id"]
    assert res.json()["match_score"] == 92.5

    # Update shortlist status
    up_res = client.put(f"/api/v1/shortlists/{sl_id}", json={"status": "contacted"})
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "contacted"

    # Duplicate shortlist entry returns 409
    dup_res = client.post("/api/v1/shortlists/", json={
        "project_id": project["id"],
        "student_id": student["id"],
        "match_score": 90.0
    })
    assert dup_res.status_code == 409

def test_students_search_endpoint(client):
    # Setup data
    dept = client.post("/api/v1/departments/", json={"name": "Data Science", "code": "DS"}).json()
    course = client.post("/api/v1/courses/", json={
        "name": "B.Tech Data Science", "code": "BT-DS", "department_id": dept["id"]
    }).json()
    s1 = client.post("/api/v1/students/", json={
        "full_name": "Eve Adams", "email": "eve@university.edu", "reg_no": "2024DS001",
        "course_id": course["id"], "year_of_study": 3, "available": True
    }).json()
    s2 = client.post("/api/v1/students/", json={
        "full_name": "Frank Castle", "email": "frank@university.edu", "reg_no": "2024DS002",
        "course_id": course["id"], "year_of_study": 2, "available": False
    }).json()

    sk1 = client.post("/api/v1/skills/", json={"name": "PyTorch", "category": "AI"}).json()
    sk2 = client.post("/api/v1/skills/", json={"name": "SQL", "category": "Database"}).json()

    # Eve has PyTorch and SQL
    client.post("/api/v1/student-skills/", json={"student_id": s1["id"], "skill_id": sk1["id"], "proficiency": 4})
    client.post("/api/v1/student-skills/", json={"student_id": s1["id"], "skill_id": sk2["id"], "proficiency": 3})
    # Frank has only SQL
    client.post("/api/v1/student-skills/", json={"student_id": s2["id"], "skill_id": sk2["id"], "proficiency": 2})

    # 1. Search OR mode for sk1 & sk2 -> returns both
    res_or = client.get(f"/api/v1/students/search?skill_ids={sk1['id']}&skill_ids={sk2['id']}&skill_match_mode=OR")
    assert res_or.status_code == 200
    or_ids = [r["id"] for r in res_or.json()]
    assert s1["id"] in or_ids
    assert s2["id"] in or_ids

    # 2. Search AND mode for sk1 & sk2 -> returns only Eve
    res_and = client.get(f"/api/v1/students/search?skill_ids={sk1['id']}&skill_ids={sk2['id']}&skill_match_mode=AND")
    assert res_and.status_code == 200
    and_ids = [r["id"] for r in res_and.json()]
    assert s1["id"] in and_ids
    assert s2["id"] not in and_ids

    # 3. Filter by available=True -> returns only Eve
    res_avail = client.get("/api/v1/students/search?available=true")
    assert res_avail.status_code == 200
    avail_ids = [r["id"] for r in res_avail.json()]
    assert s1["id"] in avail_ids
    assert s2["id"] not in avail_ids

def test_dashboard_stats_endpoint(client):
    # Setup sample records to verify stats calculation
    dept = client.post("/api/v1/departments/", json={"name": "BioTech", "code": "BT"}).json()
    course = client.post("/api/v1/courses/", json={
        "name": "B.Tech Biotechnology", "code": "BT-BT", "department_id": dept["id"]
    }).json()
    client.post("/api/v1/students/", json={
        "full_name": "Grace Hopper", "email": "grace@university.edu", "reg_no": "2024BT001",
        "course_id": course["id"], "year_of_study": 1, "available": True
    })

    res = client.get("/api/v1/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert "totals" in data
    assert "students_per_department" in data
    assert "top_skills" in data
    assert "proficiency_distribution" in data
    assert data["totals"]["students"] >= 1

def test_frontend_static_pages_served(client):
    res_index = client.get("/app/index.html")
    assert res_index.status_code == 200
    assert "SkillBridge" in res_index.text

    res_students = client.get("/app/students.html")
    assert res_students.status_code == 200

    res_projects = client.get("/app/projects.html")
    assert res_projects.status_code == 200
