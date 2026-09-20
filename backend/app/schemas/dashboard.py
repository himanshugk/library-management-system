from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_books: int
    available_books: int
    issued_books: int
    total_students: int
    active_students: int
    total_staff: int
    overdue_books: int
    outstanding_fines: int
    books_returned_today: int
    books_issued_today: int
    loan_period_days: int
    fine_per_day: int