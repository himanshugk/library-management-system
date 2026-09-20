"""Development seed script.

Creates:
- System Admin (STAFF-0001)
- Demo Staff (STAFF-0002)
- 4 sample students
- 5 categories
- 10+ sample books

Run:  .venv\\Scripts\\python -m app.seed
"""
from sqlalchemy.orm import Session

from app.core.permissions import Role
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.book import Book
from app.models.category import Category
from app.models.staff import Staff
from app.models.user import User

SEED_STAFF_PASSWORD = "Staff@123"


def _seed_admin(db: Session) -> User:
    email = "admin@library.com"
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing
    admin = User(
        username="admin",
        email=email,
        password_hash=hash_password("Admin@123"),
        role=Role.ADMIN.value,
        is_active=True,
    )
    db.add(admin)
    db.flush()
    db.add(Staff(staff_id="STAFF-0001", user_id=admin.id, name="System Admin"))
    print("Created System Admin -> STAFF-0001 / admin@library.com / Admin@123")
    return admin


def _seed_staff(db: Session) -> None:
    email = "staff@library.com"
    if db.query(User).filter(User.email == email).first():
        return
    user = User(
        username="staff",
        email=email,
        password_hash=hash_password(SEED_STAFF_PASSWORD),
        role=Role.STAFF.value,
        is_active=True,
    )
    db.add(user)
    db.flush()
    db.add(Staff(staff_id="STAFF-0002", user_id=user.id, name="Demo Staff"))
    print("Created Demo Staff -> STAFF-0002 / staff@library.com / Staff@123")


def _seed_students(db: Session) -> None:
    from app.models.student import Student

    data = [
        ("STU-000001", "Rahul Sharma", "9876543210", "rahul@example.com", "Computer Science"),
        ("STU-000002", "Priya Patel", "9876501234", "priya@example.com", "Electrical Engg"),
        ("STU-000003", "Arjun Nair", "9876532100", "arjun@example.com", "Mathematics"),
        ("STU-000004", "Sana Khan", "9876540001", "sana@example.com", "Commerce"),
    ]
    for student_id, name, phone, email, dept in data:
        if db.query(Student).filter(Student.student_id == student_id).first():
            continue
        db.add(
            Student(
                student_id=student_id,
                name=name,
                phone=phone,
                email=email,
                department=dept,
                is_active=True,
            )
        )
        print(f"Created Student -> {student_id} {name}")


def _seed_categories(db: Session) -> None:
    categories = [
        ("CAT-000001", "Programming", "Software development titles"),
        ("CAT-000002", "Database", "SQL and data modelling titles"),
        ("CAT-000003", "Networking", "Computer networking titles"),
        ("CAT-000004", "Science", "General science and physics"),
        ("CAT-000005", "Mathematics", "Pure and applied mathematics"),
    ]
    for category_id, name, desc in categories:
        if db.query(Category).filter(Category.category_id == category_id).first():
            continue
        db.add(Category(category_id=category_id, name=name, description=desc))
    db.flush()
    print("Created categories: Programming, Database, Networking, Science, Mathematics")


def _seed_books(db: Session) -> None:
    from app.models.book import Book

    cat = {c.name: c.id for c in db.query(Category).all()}
    books = [
        ("BOOK-000001", "Python Basics", "Guido van Dijk", "9780134658341", "Programming", 5, "A2-01"),
        ("BOOK-000002", "Advanced Python", "Luciano Ramalho", "9781492056355", "Programming", 3, "A2-02"),
        ("BOOK-000003", "Clean Code", "Robert C. Martin", "9780132350884", "Programming", 4, "A2-03"),
        ("BOOK-000004", "SQL Mastery", "C. J. Date", "9780321554778", "Database", 3, "B1-01"),
        ("BOOK-000005", "Database Systems", "Ramez Elmasri", "9780133970777", "Database", 4, "B1-02"),
        ("BOOK-000006", "Computer Networks", "Andrew Tanenbaum", "9780132126953", "Networking", 3, "C1-01"),
        ("BOOK-000007", "TCP/IP Illustrated", "W. Richard Stevens", "9780321336316", "Networking", 2, "C1-02"),
        ("BOOK-000008", "Brief History of Time", "Stephen Hawking", "9780553380163", "Science", 3, "D1-01"),
        ("BOOK-000009", "The Selfish Gene", "Richard Dawkins", "9780199291151", "Science", 2, "D1-02"),
        ("BOOK-000010", "Calculus Made Easy", "Silvanus Thompson", "9780312510789", "Mathematics", 4, "E1-01"),
        ("BOOK-000011", "Linear Algebra Done Right", "Sheldon Axler", "9783319110790", "Mathematics", 3, "E1-02"),
    ]
    for book_id, title, author, isbn, cname, copies, shelf in books:
        if db.query(Book).filter(Book.book_id == book_id).first():
            continue
        db.add(
            Book(
                book_id=book_id,
                title=title,
                author=author,
                isbn=isbn,
                category_id=cat[cname],
                total_copies=copies,
                available_copies=copies,
                shelf_location=shelf,
                is_active=True,
            )
        )
    print("Created 11 sample books (BOOK-000001 .. BOOK-000011)")


def main() -> None:
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _seed_admin(db)
        _seed_staff(db)
        _seed_students(db)
        _seed_categories(db)
        _seed_books(db)
        db.commit()
        print("\nSeed complete.")
        print("Login: admin / Admin@123  |  staff / Staff@123")
    finally:
        db.close()


if __name__ == "__main__":
    main()
