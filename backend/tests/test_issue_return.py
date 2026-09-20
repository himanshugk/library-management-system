from datetime import date

from tests.conftest import auth, days_from


def _issue(client, token, student_id, book_id):
    return client.post(
        "/api/transactions/issue",
        headers=auth(token),
        json={"student_id": student_id, "book_id": book_id},
    )


def _new_book(client, token, category_id, isbn, copies):
    return client.post(
        "/api/books",
        headers=auth(token),
        json={
            "title": f"Book {isbn}",
            "author": "Author",
            "isbn": isbn,
            "category_id": category_id,
            "total_copies": copies,
        },
    ).json()


def test_issue_available_book(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    r = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["txn_id"].startswith("TXN-")
    # Core rule: due date = issue date + 20 days
    assert body["issue_date"] == "2026-09-01"
    assert body["due_date"] == "2026-09-21"
    assert body["status"] == "ISSUED"


def test_available_copies_decrease(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    before = seed_basic["book"].available_copies
    _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    r = client.get("/api/books/BOOK-000001", headers=auth(staff_token))
    assert r.json()["available_copies"] == before - 1


def test_reject_unavailable_book(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    # A book with zero copies cannot be issued.
    book = _new_book(client, staff_token, seed_basic["category"].id, "9780000000001", 0)
    r = _issue(client, staff_token, seed_basic["student"].student_id, book["book_id"])
    assert r.status_code == 409
    assert "No available copies" in r.json()["detail"]


def test_reject_inactive_student(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    client.patch(
        "/api/students/STU-000001/status",
        headers=auth(staff_token),
        json={"is_active": False},
    )
    r = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    assert r.status_code == 400
    assert "inactive" in r.json()["detail"].lower()


def test_reject_invalid_student(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    r = _issue(client, staff_token, "STU-999999", seed_basic["book"].book_id)
    assert r.status_code == 404
    assert "Student not found" in r.json()["detail"]


def test_reject_invalid_book(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    r = _issue(client, staff_token, seed_basic["student"].student_id, "BOOK-999999")
    assert r.status_code == 404
    assert "Book not found" in r.json()["detail"]


def test_reject_duplicate_issue_same_book(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    payload = {
        "student_id": seed_basic["student"].student_id,
        "book_id": seed_basic["book"].book_id,
    }
    first = client.post("/api/transactions/issue", headers=auth(staff_token), json=payload)
    assert first.status_code == 201
    second = client.post("/api/transactions/issue", headers=auth(staff_token), json=payload)
    assert second.status_code == 409
    assert "already holds an active issue" in second.json()["detail"]


def test_borrowing_limit(client, seed_basic, staff_token, clock):
    """A student cannot exceed MAX_BOOKS_PER_STUDENT (5) active issues."""
    clock.set(date(2026, 9, 1))
    book_ids = [
        _new_book(client, staff_token, seed_basic["category"].id, f"97800000000{i:02d}", 2)[
            "book_id"
        ]
        for i in range(6)
    ]
    results = []
    for bid in book_ids:
        r = _issue(client, staff_token, seed_basic["student"].student_id, bid)
        results.append(r.status_code)
    assert results.count(201) == 5
    assert results.count(400) == 1


def test_return_with_fine(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    ).json()

    clock.set(date(2026, 9, 25))  # 4 days overdue
    r = client.post(
        f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token)
    )
    assert r.status_code == 200
    body = r.json()
    assert body["overdue_days"] == 4
    assert body["fine"] == 40
    assert body["transaction"]["status"] == "RETURNED"


def test_return_on_time_zero_fine(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    ).json()
    clock.set(date(2026, 9, 21))  # exactly on due date
    r = client.post(
        f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token)
    )
    assert r.status_code == 200
    assert r.json()["fine"] == 0


def test_duplicate_return_rejected(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    ).json()
    clock.set(date(2026, 9, 10))
    first = client.post(
        f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token)
    )
    assert first.status_code == 200
    second = client.post(
        f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token)
    )
    assert second.status_code == 409


def test_available_copies_increase_after_return(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    before = seed_basic["book"].available_copies
    txn = _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    ).json()
    client.post(f"/api/transactions/{txn['txn_id']}/return", headers=auth(staff_token))
    r = client.get("/api/books/BOOK-000001", headers=auth(staff_token))
    assert r.json()["available_copies"] == before


def test_overdue_listing(client, seed_basic, staff_token, clock):
    clock.set(date(2026, 9, 1))
    _issue(
        client, staff_token, seed_basic["student"].student_id, seed_basic["book"].book_id
    )
    clock.set(date(2026, 9, 25))
    r = client.get("/api/transactions/overdue", headers=auth(staff_token))
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["overdue_days"] == 4
    assert r.json()[0]["current_fine"] == 40