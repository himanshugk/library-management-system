from datetime import date

from tests.conftest import auth


def _issue(client, token, student_id, book_id):
    return client.post(
        "/api/transactions/issue",
        headers=auth(token),
        json={"student_id": student_id, "book_id": book_id},
    ).json()


def test_first_overdue_notice_sent(client, seed_basic, staff_token, clock):
    from app.jobs.overdue_job import run_overdue_check

    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 25))  # overdue
    checked, sent = run_overdue_check(db_for(client))
    assert checked == 1
    assert sent == 1

    notifications = client.get("/api/notifications", headers=auth(staff_token)).json()
    assert len(notifications) == 1
    n = notifications[0]
    assert n["ntype"] == "OVERDUE_FIRST_NOTICE"
    assert n["status"] == "SENT"
    assert n["txn_id"] == txn["txn_id"]
    assert n["phone"] == seed_basic["student"].phone
    assert "Python Basics" in n["message"]
    assert "Rs 10 per day" in n["message"]


def test_duplicate_overdue_notice_prevented(client, seed_basic, staff_token, clock):
    from app.jobs.overdue_job import run_overdue_check

    clock.set(date(2026, 9, 1))
    _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 25))
    run_overdue_check(db_for(client))
    run_overdue_check(db_for(client))  # second run must not re-send
    notifications = client.get("/api/notifications", headers=auth(staff_token)).json()
    assert len(notifications) == 1


def test_send_test_notification(client, seed_basic, staff_token):
    r = client.post(
        "/api/notifications/test",
        headers=auth(staff_token),
        json={"student_id": seed_basic["student"].student_id},
    )
    assert r.status_code == 201
    assert r.json()["ntype"] == "TEST"
    assert r.json()["status"] == "SENT"


def test_dynamic_fine_from_overdue_job(client, seed_basic, staff_token, clock):
    """Overdue fine grows with each day without storing anything."""
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 25))
    r = client.get("/api/transactions/overdue", headers=auth(staff_token))
    assert r.json()[0]["current_fine"] == 40


def test_student_page_shows_overdue_and_fine(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 25))
    r = client.get("/api/students/STU-000001", headers=auth(staff_token))
    assert r.json()["issued_book_count"] == 1
    assert r.json()["outstanding_fine"] == 40

    hist = client.get(
        "/api/students/STU-000001/history", headers=auth(staff_token)
    ).json()
    assert hist[0]["status"] == "ISSUED"
    assert hist[0]["overdue_days"] == 4
    assert hist[0]["current_fine"] == 40


def db_for(client):
    """The shared test session that the client dependency yields."""
    for key, override in client.app.dependency_overrides.items():
        gen = override()
        session = next(gen)
        gen.close()
        return session
    raise RuntimeError("no override")