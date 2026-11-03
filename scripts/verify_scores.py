"""
scripts/verify_scores.py
Independent verification of the SkillBridge matching formula against the API.
"""
import sqlite3
import json
import urllib.request
import sys

def independent_calculate_score(requirements, student_skills_map):
    """
    Independent implementation:
    weight * min(student_level / required_level, 1), summed, divided by total weight, times 100,
    plus the verified bonus (up to +5% based on verified proportion of matched required skills).
    """
    if not requirements:
        return 0.0

    total_weight = sum(r["weight"] for r in requirements)
    if total_weight <= 0:
        return 0.0

    weighted_sum = 0.0
    matched_count = 0
    verified_count = 0

    for r in requirements:
        skill_id = r["skill_id"]
        req_level = r["min_proficiency"]
        weight = r["weight"]

        if skill_id in student_skills_map:
            stu_skill = student_skills_map[skill_id]
            stu_level = stu_skill["proficiency"]
            is_verified = bool(stu_skill["verified"])

            ratio = min(stu_level / req_level, 1.0)
            weighted_sum += weight * ratio
            matched_count += 1
            if is_verified:
                verified_count += 1

    base_score = (weighted_sum / total_weight) * 100.0
    bonus = (5.0 * (verified_count / matched_count)) if matched_count > 0 else 0.0
    final = round(min(100.0, base_score + bonus), 1)
    return final

def main():
    conn = sqlite3.connect("skillbridge.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Fetch open projects
    projects = cursor.execute("SELECT id, title, status FROM projects WHERE status = 'open'").fetchall()
    print(f"Found {len(projects)} open project(s) to verify.")

    mismatches = []
    total_checked = 0

    for p in projects:
        project_id = p["id"]
        title = p["title"]

        # Requirements
        req_rows = cursor.execute("""
            SELECT skill_id, min_proficiency, weight
            FROM project_skills
            WHERE project_id = ?
        """, (project_id,)).fetchall()
        requirements = [dict(r) for r in req_rows]

        # Call API for top 10 candidates
        api_url = f"http://127.0.0.1:8000/api/v1/matching/projects/{project_id}/students?min_score=0&limit=10"
        try:
            req = urllib.request.Request(api_url)
            with urllib.request.urlopen(req, timeout=5) as response:
                api_candidates = json.loads(response.read().decode())
        except Exception as e:
            print(f"Error fetching API candidates for project {project_id}: {e}")
            mismatches.append({"project_id": project_id, "error": str(e)})
            continue

        for cand in api_candidates:
            student_id = cand["student_id"]
            api_score = round(float(cand["score"]), 1)

            # Query student's skills
            s_skills_rows = cursor.execute("""
                SELECT skill_id, proficiency, verified
                FROM student_skills
                WHERE student_id = ?
            """, (student_id,)).fetchall()
            s_skills_map = {row["skill_id"]: dict(row) for row in s_skills_rows}

            expected_score = independent_calculate_score(requirements, s_skills_map)

            total_checked += 1
            if abs(api_score - expected_score) > 0.05:
                mismatches.append({
                    "project_id": project_id,
                    "project_title": title,
                    "student_id": student_id,
                    "api_score": api_score,
                    "expected_score": expected_score
                })

    conn.close()

    print(f"Checked {total_checked} candidate scores across {len(projects)} open projects.")
    if mismatches:
        print(f"FAIL: Found {len(mismatches)} score mismatch(es):")
        for m in mismatches:
            print(f"  Project {m['project_id']} ('{m.get('project_title')}') - Student {m.get('student_id')}: API={m.get('api_score')} vs Expected={m.get('expected_score')}")
        sys.exit(1)
    else:
        print("SUCCESS: 0 mismatches found. Independent formula matches API perfectly.")
        sys.exit(0)

if __name__ == "__main__":
    main()
