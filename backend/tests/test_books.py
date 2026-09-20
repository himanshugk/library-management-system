from tests.conftest import auth


def test_create_book(client, seed_basic, staff_token):
    r = client.post(
        "/api/books",
        headers=auth(staff_token),
        json={
            "title": "Test Book",
            "author": "John Doe",
            "isbn": "9781234567890",
            "category_id": seed_basic["category"].id,
            "total_copies": 2,
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["book_id"].startswith("BOOK-")
    assert body["available_copies"] == 2
    assert body["status"] == "AVAILABLE"


def test_duplicate_isbn_rejected(client, seed_basic, staff_token):
    r = client.post(
        "/api/books",
        headers=auth(staff_token),
        json={
            "title": "Duplicate",
            "author": "John Doe",
            "isbn": "9780134658341",  # same as seeded book
            "category_id": seed_basic["category"].id,
            "total_copies": 1,
        },
    )
    assert r.status_code == 409
    assert "ISBN" in r.json()["detail"]


def test_invalid_isbn_rejected(client, seed_basic, staff_token):
    # 5 printable chars pass schema min_length but fail the ISBN format check.
    r = client.post(
        "/api/books",
        headers=auth(staff_token),
        json={
            "title": "Bad ISBN",
            "author": "John Doe",
            "isbn": "abcde",
            "category_id": seed_basic["category"].id,
            "total_copies": 1,
        },
    )
    assert r.status_code == 400
    assert "ISBN" in r.json()["detail"]


def test_invalid_copies_rejected(client, seed_basic, staff_token):
    # Negative copies are rejected by schema validation.
    r = client.post(
        "/api/books",
        headers=auth(staff_token),
        json={
            "title": "Bad Copies",
            "author": "John Doe",
            "isbn": "9789999999999",
            "category_id": seed_basic["category"].id,
            "total_copies": -1,
        },
    )
    assert r.status_code == 422


def test_missing_required_fields(client, seed_basic, staff_token):
    r = client.post(
        "/api/books",
        headers=auth(staff_token),
        json={"author": "No Title", "isbn": "9781111111111"},
    )
    assert r.status_code == 422


def test_edit_book(client, seed_basic, staff_token):
    r = client.put(
        "/api/books/BOOK-000001",
        headers=auth(staff_token),
        json={"title": "Python Basics Revised", "total_copies": 5},
    )
    assert r.status_code == 200
    assert r.json()["title"] == "Python Basics Revised"
    assert r.json()["total_copies"] == 5


def test_delete_book_disables(client, seed_basic, staff_token):
    r = client.delete("/api/books/BOOK-000001", headers=auth(staff_token))
    assert r.status_code == 204
    r2 = client.get("/api/books/BOOK-000001", headers=auth(staff_token))
    assert r2.status_code == 200
    assert r2.json()["is_active"] is False
    assert r2.json()["status"] == "INACTIVE"


def test_book_unknown_category_rejected(client, seed_basic, staff_token):
    r = client.post(
        "/api/books",
        headers=auth(staff_token),
        json={
            "title": "Orphan",
            "author": "John Doe",
            "isbn": "9787777777777",
            "category_id": 999999,
            "total_copies": 1,
        },
    )
    assert r.status_code == 404