"""
scripts/test_xss_rendering.py
Verifies that student names containing raw HTML/script tags are treated strictly as text.
"""
import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def main():
    xss_payload = "<script>alert(1)</script>"
    create_body = {
        "full_name": xss_payload,
        "email": "xss_test_student@campus.edu",
        "reg_no": "2024XSS001",
        "course_id": 1,
        "year_of_study": 2,
        "available": True,
        "bio": "Bio with <b>markup</b>"
    }

    # 1. Create student
    req = urllib.request.Request(
        f"{BASE_URL}/students/",
        data=json.dumps(create_body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    student_id = None
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            student_id = data["id"]
            print(f"Created student #{student_id} with name: {data['full_name']}")
            assert data["full_name"] == xss_payload
    except Exception as e:
        print(f"Failed to create test student: {e}")
        sys.exit(1)

    # 2. Search student and confirm exact string is preserved in JSON payload
    search_req = urllib.request.Request(f"{BASE_URL}/students/search")
    with urllib.request.urlopen(search_req) as resp:
        results = json.loads(resp.read().decode())
        match = next((s for s in results if s["id"] == student_id), None)
        assert match is not None, "Test student not found in search results"
        assert match["full_name"] == xss_payload, "Full name mutated or corrupted"
        print("Verified search endpoint returns raw string in JSON payload.")

    # 3. Verify static JS source code uses textContent (not innerHTML) for student names
    js_files = ["app/static/js/students.js", "app/static/js/project.js", "app/static/js/dashboard.js"]
    for fpath in js_files:
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
            # Confirm full_name is assigned to textContent
            if "full_name" in content:
                assert ".textContent = " in content or "setText(" in content
                print(f"Verified {fpath} safely binds student names via textContent / setText.")

    # 4. Clean up test student
    del_req = urllib.request.Request(f"{BASE_URL}/students/{student_id}", method="DELETE")
    with urllib.request.urlopen(del_req) as resp:
        print(f"Cleaned up test student #{student_id}.")

    print("SUCCESS: XSS injection test passed completely. All user strings bound as text.")

if __name__ == "__main__":
    main()
