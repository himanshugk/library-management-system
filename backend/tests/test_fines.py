from datetime import date

from tests.conftest import auth


def _issue(client, token, student_id, book_id):
    return client.post(
        "/api/transactions/issue",
        headers=auth(token),
        json={"student_id": student_id, "book_id": book_id},
    ).json()


def test_fine_zero_days_late(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 21))  # due date, 0 overdue
    r = client.post(f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token))
    assert r.json()["fine"] == 0


def test_fine_one_day_late(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 22))  # 1 day overdue
    r = client.post(f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token))
    assert r.json()["fine"] == 10


def test_fine_four_days_late(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 25))  # 4 days overdue
    r = client.post(f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token))
    assert r.json()["fine"] == 40


def test_fine_recorded_as_unpaid(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 25))
    client.post(f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token))
    fines = client.get("/api/fines", headers=auth(staff_token)).json()
    assert len(fines) == 1
    assert fines[0]["amount"] == 40
    assert fines[0]["status"] == "UNPAID"
    assert fines[0]["remaining_amount"] == 40


def test_fines_listed_per_student(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 23))
    client.post(f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token))
    r = client.get(
        f"/api/students/{seed_basic['student'].student_id}/fines",
        headers=auth(staff_token),
    )
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["amount"] == 20


def test_payment_updates_fine_status(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 25))
    client.post(f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token))
    fine = client.get("/api/fines", headers=auth(staff_token)).json()[0]

    # Partial payment
    r = client.post(
        f"/api/fines/{fine['id']}/payment",
        headers=auth(staff_token),
        json={"amount": 25, "method": "UPI"},
    )
    assert r.status_code == 201
    fine2 = client.get(f"/api/fines/{fine['id']}", headers=auth(staff_token)).json()
    assert fine2["status"] == "PARTIALLY_PAID"
    assert fine2["paid_amount"] == 25
    assert fine2["remaining_amount"] == 15

    # Rest of the payment
    r = client.post(
        f"/api/fines/{fine['id']}/payment",
        headers=auth(staff_token),
        json={"amount": 15, "method": "CASH"},
    )
    assert r.status_code == 201
    fine3 = client.get(f"/api/fines/{fine['id']}", headers=auth(staff_token)).json()
    assert fine3["status"] == "PAID"
    assert fine3["remaining_amount"] == 0


def test_payment_cannot_exceed_outstanding(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 25))
    client.post(f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token))
    fine = client.get("/api/fines", headers=auth(staff_token)).json()[0]
    r = client.post(
        f"/api/fines/{fine['id']}/payment",
        headers=auth(staff_token),
        json={"amount": 1000, "method": "CASH"},
    )
    assert r.status_code == 400
    assert "cannot exceed" in r.json()["detail"]


def test_pay_in_full(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 25))
    client.post(f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token))
    fine = client.get("/api/fines", headers=auth(staff_token)).json()[0]
    r = client.post(
        f"/api/fines/{fine['id']}/pay-in-full", headers=auth(staff_token)
    )
    assert r.status_code == 200
    assert r.json()["status"] == "PAID"