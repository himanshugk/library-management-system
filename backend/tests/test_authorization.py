from tests.conftest import auth


def test_admin_can_manage_staff(client, seed_basic, admin_token):
    r = client.post(
        "/api/staff",
        headers=auth(admin_token),
        json={
            "name": "New Staff",
            "email": "newstaff@library.com",
            "username": "newstaff",
            "password": "Password@123",
        },
    )
    assert r.status_code == 201
    assert r.json()["staff_id"].startswith("STAFF-")
    assert r.json()["role"] == "STAFF"


def test_staff_cannot_manage_staff(client, seed_basic, staff_token):
    r = client.post(
        "/api/staff",
        headers=auth(staff_token),
        json={
            "name": "Intruder",
            "email": "intruder@library.test",
            "username": "intruder",
            "password": "Password@123",
        },
    )
    assert r.status_code == 403
    assert "permission" in r.json()["detail"].lower()


def test_staff_cannot_edit_or_disable_staff(client, seed_basic, staff_token):
    r = client.patch(
        "/api/staff/STAFF-0002/status",
        headers=auth(staff_token),
        json={"is_active": False},
    )
    assert r.status_code == 403


def test_staff_cannot_create_admin_account(client, seed_basic, admin_token):
    r = client.post(
        "/api/staff",
        headers=auth(admin_token),
        json={
            "name": "Fake Admin",
            "email": "fakeadmin@library.com",
            "username": "fakeadmin",
            "password": "Password@123",
            "role": "ADMIN",
        },
    )
    assert r.status_code == 403


def test_staff_can_manage_students(client, seed_basic, staff_token):
    r = client.post(
        "/api/students",
        headers=auth(staff_token),
        json={"name": "Demo Student", "phone": "9000000001"},
    )
    assert r.status_code == 201
    assert r.json()["student_id"].startswith("STU-")


def test_staff_can_manage_books(client, seed_basic, staff_token):
    r = client.post(
        "/api/books",
        headers=auth(staff_token),
        json={
            "title": "Staff Book",
            "author": "Anyone",
            "isbn": "9788888888888",
            "category_id": seed_basic["category"].id,
            "total_copies": 2,
        },
    )
    assert r.status_code == 201


def test_staff_can_issue_and_return(client, seed_basic, staff_token):
    r = client.post(
        "/api/transactions/issue",
        headers=auth(staff_token),
        json={
            "student_id": seed_basic["student"].student_id,
            "book_id": seed_basic["book"].book_id,
        },
    )
    assert r.status_code == 201
    txn_id = r.json()["txn_id"]
    r2 = client.post(
        f"/api/transactions/{txn_id}/return", headers=auth(staff_token)
    )
    assert r2.status_code == 200
    assert r2.json()["fine"] == 0


def test_main_admin_cannot_be_disabled(client, seed_basic, admin_token):
    r = client.patch(
        "/api/staff/STAFF-0001/status",
        headers=auth(admin_token),
        json={"is_active": False},
    )
    assert r.status_code == 400


def test_audit_logs_lists_actions(client, seed_basic, admin_token):
    client.post(
        "/api/students",
        headers=auth(admin_token),
        json={"name": "Audit Subject", "phone": "9111111111"},
    )
    r = client.get("/api/audit-logs", headers=auth(admin_token))
    assert r.status_code == 200
    actions = [log["action"] for log in r.json()]
    assert "login" in actions
    assert "create_student" in actions
