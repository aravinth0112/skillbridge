import json
from unittest.mock import patch, MagicMock
import httpx
import pytest

def test_ai_status_endpoint(client):
    with patch("app.routers.ai.check_ollama_reachable", return_value=True):
        res = client.get("/api/v1/ai/status")
        assert res.status_code == 200
        data = res.json()
        assert data["ollama_reachable"] is True
        assert "model" in data
        assert "url" in data

    with patch("app.routers.ai.check_ollama_reachable", return_value=False):
        res_off = client.get("/api/v1/ai/status")
        assert res_off.status_code == 200
        assert res_off.json()["ollama_reachable"] is False

def test_ai_search_with_mocked_ollama_valid_json(client):
    dept = client.post("/api/v1/departments/", json={"name": "Computer Science", "code": "CS"}).json()
    course = client.post("/api/v1/courses/", json={
        "name": "B.Tech CSE", "code": "BT-CS", "department_id": dept["id"]
    }).json()
    sk1 = client.post("/api/v1/skills/", json={"name": "Python", "category": "Backend"}).json()
    sk2 = client.post("/api/v1/skills/", json={"name": "FastAPI", "category": "Backend"}).json()

    stu = client.post("/api/v1/students/", json={
        "full_name": "Aditi Rao", "email": "aditi@cs.edu", "reg_no": "2024CS088",
        "course_id": course["id"], "year_of_study": 3, "available": True
    }).json()

    client.post("/api/v1/student-skills/", json={"student_id": stu["id"], "skill_id": sk1["id"], "proficiency": 4})
    client.post("/api/v1/student-skills/", json={"student_id": stu["id"], "skill_id": sk2["id"], "proficiency": 4})

    mock_ollama_json = json.dumps({
        "skills": ["Python", "FastAPI"],
        "mode": "and",
        "course": "B.Tech CSE",
        "department": None,
        "year": 3,
        "available": True
    })

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"response": mock_ollama_json}

    mock_client = MagicMock()
    mock_client.__enter__.return_value.post.return_value = mock_resp

    with patch("app.services.ai_service.httpx.Client", return_value=mock_client):
        res = client.post("/api/v1/ai/search", json={
            "query": "3rd year students who know Python and FastAPI"
        })

        assert res.status_code == 200
        data = res.json()
        assert data["used_ai"] is True
        assert data["interpreted_filters"]["skills"] == ["Python", "FastAPI"]
        assert data["interpreted_filters"]["mode"] == "and"
        assert data["interpreted_filters"]["year"] == 3
        assert data["interpreted_filters"]["available"] is True
        assert len(data["results"]) == 1
        assert data["results"][0]["id"] == stu["id"]

def test_ai_search_drops_unknown_skills_and_entities(client):
    dept = client.post("/api/v1/departments/", json={"name": "Electronics", "code": "EC"}).json()
    client.post("/api/v1/skills/", json={"name": "Python", "category": "Programming"})

    mock_ollama_json = json.dumps({
        "skills": ["Python", "QuantumTeleportation999"],
        "mode": "or",
        "course": "Ph.D. Martian Engineering",
        "department": None,
        "year": None,
        "available": None
    })

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"response": mock_ollama_json}

    mock_client = MagicMock()
    mock_client.__enter__.return_value.post.return_value = mock_resp

    with patch("app.services.ai_service.httpx.Client", return_value=mock_client):
        res = client.post("/api/v1/ai/search", json={
            "query": "Find candidates with QuantumTeleportation999 or Python"
        })

        assert res.status_code == 200
        data = res.json()
        assert data["used_ai"] is True
        assert "Python" in data["interpreted_filters"]["skills"]
        assert "QuantumTeleportation999" not in data["interpreted_filters"]["skills"]
        assert data["interpreted_filters"]["course"] is None

def test_ai_search_invalid_json_triggers_keyword_fallback(client):
    client.post("/api/v1/departments/", json={"name": "IT", "code": "IT"})
    client.post("/api/v1/skills/", json={"name": "Docker", "category": "DevOps"})

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"response": "Here are some 3rd year students skilled in Docker available for projects."}

    mock_client = MagicMock()
    mock_client.__enter__.return_value.post.return_value = mock_resp

    with patch("app.services.ai_service.httpx.Client", return_value=mock_client):
        res = client.post("/api/v1/ai/search", json={
            "query": "3rd year students with Docker available"
        })

        assert res.status_code == 200
        data = res.json()
        assert data["used_ai"] is False
        assert "Docker" in data["interpreted_filters"]["skills"]
        assert data["interpreted_filters"]["year"] == 3
        assert data["interpreted_filters"]["available"] is True

def test_ai_search_unreachable_triggers_fallback(client):
    client.post("/api/v1/skills/", json={"name": "SQL", "category": "Database"})

    mock_client = MagicMock()
    mock_client.__enter__.return_value.post.side_effect = httpx.ConnectError("Connection refused")

    with patch("app.services.ai_service.httpx.Client", return_value=mock_client):
        res = client.post("/api/v1/ai/search", json={
            "query": "2nd year students with SQL"
        })

        assert res.status_code == 200
        data = res.json()
        assert data["used_ai"] is False
        assert "SQL" in data["interpreted_filters"]["skills"]
        assert data["interpreted_filters"]["year"] == 2

def test_ai_search_query_validation_422(client):
    res_empty = client.post("/api/v1/ai/search", json={"query": ""})
    assert res_empty.status_code == 422

    res_long = client.post("/api/v1/ai/search", json={"query": "x" * 501})
    assert res_long.status_code == 422
