import pytest

from tests.conftest import auth


def test_login_success(client, seed_basic):
    r = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "Admin@123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["user"]["role"] == "ADMIN"
    assert body["user"]["staff_id"] == "STAFF-0001"


def test_login_staff_success(client, seed_basic):
    r = client.post(
        "/api/auth/login",
        json={"username": "staff", "password": "Staff@123"},
    )
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "STAFF"


def test_login_wrong_password(client, seed_basic):
    r = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "wrong-password"},
    )
    assert r.status_code == 401
    # Generic message: never reveal which part was wrong.
    assert r.json()["detail"] == "Invalid credentials."


def test_login_unknown_user(client):
    r = client.post(
        "/api/auth/login",
        json={"username": "nobody", "password": "whatever123"},
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid credentials."


def test_login_inactive_user(client, seed_basic):
    r = client.post(
        "/api/auth/login",
        json={"username": "deactivated", "password": "Password@123"},
    )
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid credentials."


def test_me_endpoint(client, seed_basic, admin_token):
    r = client.get("/api/auth/me", headers=auth(admin_token))
    assert r.status_code == 200
    assert r.json()["username"] == "admin"
    assert r.json()["role"] == "ADMIN"


def test_unprotected_api_rejected(client):
    r = client.get("/api/students")
    assert r.status_code == 401


def test_invalid_token_rejected(client):
    r = client.get("/api/students", headers=auth("not-a-real-token"))
    assert r.status_code == 401


def test_change_password(client, seed_basic, admin_token):
    r = client.post(
        "/api/auth/change-password",
        headers=auth(admin_token),
        json={"old_password": "Admin@123", "new_password": "NewPass@123"},
    )
    assert r.status_code == 204
    # Old password no longer works.
    old = client.post(
        "/api/auth/login", json={"username": "admin", "password": "Admin@123"}
    )
    assert old.status_code == 401
    new = client.post(
        "/api/auth/login", json={"username": "admin", "password": "NewPass@123"}
    )
    assert new.status_code == 200


def test_change_password_wrong_old(client, seed_basic, admin_token):
    r = client.post(
        "/api/auth/change-password",
        headers=auth(admin_token),
        json={"old_password": "nope", "new_password": "NewPass@123"},
    )
    assert r.status_code == 400