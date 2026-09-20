from tests.conftest import auth


def test_create_category(client, seed_basic, staff_token):
    r = client.post(
        "/api/categories",
        headers=auth(staff_token),
        json={"name": "Networking", "description": "Networking books"},
    )
    assert r.status_code == 201
    assert r.json()["category_id"].startswith("CAT-")


def test_duplicate_category_name(client, seed_basic, staff_token):
    r = client.post(
        "/api/categories",
        headers=auth(staff_token),
        json={"name": "Programming"},
    )
    assert r.status_code == 409


def test_edit_category(client, seed_basic, staff_token):
    r = client.put(
        "/api/categories/CAT-000001",
        headers=auth(staff_token),
        json={"description": "Updated description"},
    )
    assert r.status_code == 200
    assert r.json()["description"] == "Updated description"


def test_cannot_delete_category_with_books(client, seed_basic, staff_token):
    r = client.delete("/api/categories/CAT-000001", headers=auth(staff_token))
    assert r.status_code == 409
    assert "books are assigned" in r.json()["detail"]


def test_can_delete_empty_category(client, seed_basic, staff_token):
    r = client.post(
        "/api/categories",
        headers=auth(staff_token),
        json={"name": "Empty Category"},
    )
    cid = r.json()["category_id"]
    assert r.status_code == 201
    r2 = client.delete(f"/api/categories/{cid}", headers=auth(staff_token))
    assert r2.status_code == 204
    r3 = client.get(f"/api/categories/{cid}", headers=auth(staff_token))
    assert r3.status_code == 404


def test_disable_category(client, seed_basic, staff_token):
    r = client.patch(
        "/api/categories",
        headers=auth(staff_token),
        json={"is_active": False},
    )
    # PATCH is not a route; use PUT for updates.
    r = client.put(
        "/api/categories/CAT-000001",
        headers=auth(staff_token),
        json={"is_active": False},
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is False
    # Books cannot be created in an inactive category.
    r2 = client.post(
        "/api/books",
        headers=auth(staff_token),
        json={
            "title": "New Book",
            "author": "Author",
            "isbn": "9786666666666",
            "category_id": seed_basic["category"].id,
            "total_copies": 1,
        },
    )
    assert r2.status_code == 400