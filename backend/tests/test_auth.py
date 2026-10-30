"""
Authentication & Profile Management Integration Tests
=====================================================
Tests login with username/email, PBKDF2 hash verification, session validation,
profile updates, and logout invalidation against SQLite.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.src.db import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def ensure_db():
    init_db()

def test_login_success_username():
    res = client.post("/api/auth/login", json={
        "username_or_email": "operator",
        "password": "pvmonitor2026"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "operator"
    assert data["user"]["email"] == "operator@pvmonitor.io"
    assert data["user"]["initials"] == "PO"

def test_login_success_email():
    res = client.post("/api/auth/login", json={
        "username_or_email": "operator@pvmonitor.io",
        "password": "pvmonitor2026"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["username"] == "operator"

def test_login_invalid_password():
    res = client.post("/api/auth/login", json={
        "username_or_email": "operator",
        "password": "wrong_password_123"
    })
    assert res.status_code == 401
    assert "Invalid username/email or password" in res.json()["detail"]

def test_login_unknown_user():
    res = client.post("/api/auth/login", json={
        "username_or_email": "non_existent_operator",
        "password": "pvmonitor2026"
    })
    assert res.status_code == 401

def test_auth_me_unauthorized():
    res = client.get("/api/auth/me")
    assert res.status_code == 401

def test_auth_me_authorized():
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "operator",
        "password": "pvmonitor2026"
    })
    token = login_res.json()["access_token"]

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    user = res.json()["user"]
    assert user["username"] == "operator"
    assert user["full_name"] == "Plant Operator"

def test_profile_update():
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "operator",
        "password": "pvmonitor2026"
    })
    token = login_res.json()["access_token"]

    update_res = client.put(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Chief Solar Engineer",
            "email": "chief.engineer@pvmonitor.io",
            "role": "Lead PV Diagnostician"
        }
    )
    assert update_res.status_code == 200
    updated_user = update_res.json()["user"]
    assert updated_user["full_name"] == "Chief Solar Engineer"
    assert updated_user["email"] == "chief.engineer@pvmonitor.io"
    assert updated_user["initials"] == "CE"

    # Reset back to default for idempotency
    client.put(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Plant Operator",
            "email": "operator@pvmonitor.io",
            "role": "Solar PV Systems Specialist"
        }
    )

def test_logout_invalidation():
    login_res = client.post("/api/auth/login", json={
        "username_or_email": "operator",
        "password": "pvmonitor2026"
    })
    token = login_res.json()["access_token"]

    # Verify token works
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200

    # Logout
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # Token must now be rejected
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
