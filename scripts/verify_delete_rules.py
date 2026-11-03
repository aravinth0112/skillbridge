"""
scripts/test_delete_rules.py
Verifies API delete restrictions (409 Conflict) and cascades.
"""
import urllib.request
import urllib.error
import json
import sys

BASE = "http://127.0.0.1:8000/api/v1"

def test_delete(url):
    req = urllib.request.Request(url, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def main():
    print("Testing delete restrictions...")

    # 1. Department with courses
    status, body = test_delete(f"{BASE}/departments/1")
    print(f"Delete Department with courses: HTTP {status} (expected 409)")
    assert status == 409, f"Expected 409, got {status}: {body}"

    # 2. Course with students
    status, body = test_delete(f"{BASE}/courses/1")
    print(f"Delete Course with students: HTTP {status} (expected 409)")
    assert status == 409, f"Expected 409, got {status}: {body}"

    # 3. Skill in use
    status, body = test_delete(f"{BASE}/skills/1")
    print(f"Delete Skill in use: HTTP {status} (expected 409)")
    assert status == 409, f"Expected 409, got {status}: {body}"

    # 4. Student cascade
    # Create temp student
    req = urllib.request.Request(
        f"{BASE}/students/",
        data=json.dumps({
            "full_name": "Cascade Student",
            "email": "cascade.student@campus.edu",
            "reg_no": "2024CAS01",
            "course_id": 1,
            "year_of_study": 1,
            "available": True
        }).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        stu_id = json.loads(resp.read().decode())["id"]

    # Assign a skill to the student
    req_sk = urllib.request.Request(
        f"{BASE}/student-skills/",
        data=json.dumps({"student_id": stu_id, "skill_id": 1, "proficiency": 4, "verified": True}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req_sk) as resp:
        map_id = json.loads(resp.read().decode())["id"]

    # Delete student
    del_status, _ = test_delete(f"{BASE}/students/{stu_id}")
    assert del_status == 204 or del_status == 200, f"Expected 204/200, got {del_status}"

    # Confirm student-skill is cascaded (gone)
    try:
        check_sk = urllib.request.Request(f"{BASE}/student-skills/{map_id}")
        with urllib.request.urlopen(check_sk) as resp:
            print("ERROR: student_skill still exists after student deletion!")
            sys.exit(1)
    except urllib.error.HTTPError as e:
        assert e.code == 404, f"Expected 404 for cascaded skill mapping, got {e.code}"
        print(f"Student delete cascade confirmed: student #{stu_id} and skill map #{map_id} deleted.")

    # 5. Project cascade
    # Create temp project
    req_p = urllib.request.Request(
        f"{BASE}/projects/",
        data=json.dumps({
            "title": "Cascade Project",
            "description": "To test cascade deletion",
            "status": "open",
            "contact_email": "faculty@campus.edu"
        }).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req_p) as resp:
        proj_id = json.loads(resp.read().decode())["id"]

    # Add requirement
    req_ps = urllib.request.Request(
        f"{BASE}/project-skills/",
        data=json.dumps({"project_id": proj_id, "skill_id": 1, "min_proficiency": 3, "weight": 4}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req_ps) as resp:
        ps_id = json.loads(resp.read().decode())["id"]

    # Delete project
    del_p_status, _ = test_delete(f"{BASE}/projects/{proj_id}")
    assert del_p_status == 204 or del_p_status == 200

    # Confirm requirement is gone
    try:
        check_ps = urllib.request.Request(f"{BASE}/project-skills/{ps_id}")
        with urllib.request.urlopen(check_ps) as resp:
            print("ERROR: project_skill still exists after project deletion!")
            sys.exit(1)
    except urllib.error.HTTPError as e:
        assert e.code == 404, f"Expected 404 for cascaded project requirement, got {e.code}"
        print(f"Project delete cascade confirmed: project #{proj_id} and requirement #{ps_id} deleted.")

    print("SUCCESS: All delete rules and cascade tests passed completely.")

if __name__ == "__main__":
    main()
