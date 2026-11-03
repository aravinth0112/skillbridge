"""
Pure scoring functions for SkillBridge Project Matching.
No database queries or side effects occur inside calculate_match_score.
"""

from typing import Dict, List, Any

def calculate_match_score(
    required_skills: List[Dict[str, Any]],
    student_skills: Dict[int, Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Scores a single student against a project's required skills.

    Formula:
        base = sum(weight * min(student_level / min_proficiency, 1)) / sum(weight) * 100

    Rules:
        - Missing skill contributes 0.
        - Over-qualified is capped at 1.0 (no extra points above requirement).
        - Verified bonus: up to +5.0 points, proportional to the share of the student's
          matched required skills that are verified.
        - Final score is capped at 100.0, rounded to 1 decimal place.

    Returns:
        {
            "score": float,
            "base_score": float,
            "verified_bonus": float,
            "matched_skills": list,
            "missing_skills": list
        }
    """
    if not required_skills:
        return {
            "score": 0.0,
            "base_score": 0.0,
            "verified_bonus": 0.0,
            "matched_skills": [],
            "missing_skills": []
        }

    total_weight = sum(req["weight"] for req in required_skills)
    weighted_sum = 0.0

    matched_skills = []
    missing_skills = []

    matched_required_count = 0
    verified_matched_count = 0

    for req in required_skills:
        skill_id = req["skill_id"]
        skill_name = req["skill_name"]
        req_level = req["min_proficiency"]
        weight = req["weight"]

        if skill_id in student_skills:
            stu_skill = student_skills[skill_id]
            stu_level = stu_skill["proficiency"]
            is_verified = stu_skill.get("verified", False)

            # Cap ratio at 1.0 so over-qualification gives no extra credit
            ratio = min(stu_level / req_level, 1.0)
            weighted_sum += weight * ratio

            matched_skills.append({
                "skill_id": skill_id,
                "skill": skill_name,
                "student_level": stu_level,
                "required_level": req_level,
                "weight": weight,
                "verified": is_verified
            })
            matched_required_count += 1
            if is_verified:
                verified_matched_count += 1
        else:
            missing_skills.append({
                "skill_id": skill_id,
                "skill": skill_name,
                "required_level": req_level,
                "student_level": None
            })

    base_score = (weighted_sum / total_weight) * 100.0 if total_weight > 0 else 0.0

    # Verified bonus: up to +5 points proportional to verified share among matched required skills
    verified_bonus = 0.0
    if matched_required_count > 0:
        verified_bonus = 5.0 * (verified_matched_count / matched_required_count)

    # Final score capped at 100, rounded to 1 decimal place
    final_score = min(100.0, base_score + verified_bonus)
    final_score = round(final_score, 1)

    return {
        "score": final_score,
        "base_score": round(base_score, 1),
        "verified_bonus": round(verified_bonus, 1),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills
    }
