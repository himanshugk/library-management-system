# Library Management System

A beginner-friendly but production-structured **Library Management System** with a React frontend, FastAPI backend, and PostgreSQL database. It covers authentication, role-based access, book/category/student/staff management, a 20-day issue/return workflow, automatic overdue SMS notices, Rs 10/day fine calculation, fine payments, audit logs, automated tests, and Docker deployment.

## Architecture (beginner-friendly explanation)

```
 Browser (React SPA)
     │  HTTPS / JSON (REST)
     ▼
 FastAPI backend ──► PostgreSQL
     │                    ▲
     │ background job     │ Alembic migrations
     ▼                    │
 Overdue scheduler ──► SMS provider (mock for dev)
```

- **Frontend** (`frontend/`): React + Vite + TypeScript + Tailwind. It only renders UI; every business rule lives in the backend.
- **Backend** (`backend/app/`): FastAPI. Routes are thin; business logic lives in `services/`. Auth is JWT (Bearer token).
- **Database**: PostgreSQL in Docker/production, SQLite allowed for local dev/tests via `DATABASE_URL`.
- **Overdue job**: an APScheduler interval job inside the backend process sends the one-time first-overdue SMS. Fines are *computed from dates on demand* — nothing increments daily, so reruns are safe.

## Technologies

| Layer    | Stack                                                                 |
|----------|-----------------------------------------------------------------------|
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS 3, React Router 6, React Hook Form + Zod, axios, lucide-react |
| Backend  | Python, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic, PyJWT, bcrypt, APScheduler |
| Database | PostgreSQL 16 (Docker), SQLite for local dev/tests                    |
| DevOps   | Docker, Docker Compose, Git/GitHub                                    |

## Features

- Login/logout, current-user endpoint, password change, JWT auth, active/inactive accounts
- Roles: **ADMIN** (can manage staff + everything) and **STAFF** (everything except staff management and admin creation)
- Human-readable IDs everywhere: `STAFF-0001`, `STU-000001`, `BOOK-000001`, `CAT-000001`, `TXN-000001`
- Students, staff, categories, books — full CRUD with search/filter
- Category delete is rejected when books are assigned (409 with a clear message)
- Book validation: required title/author, unique + plausible ISBN, copies ≥ 0, available ≤ total
- Issue workflow with checks: student exists/active, book exists/active, copies available, borrowing limit (default 5), no duplicate active issue
- **Due date = issue date + 20 days** (configurable via `LOAN_PERIOD_DAYS`)
- Overdue detection (`today > due_date`), one-time overdue SMS, notification history, duplicate protection
- **Fine = overdue days × Rs 10** (`FINE_PER_DAY`), computed by the backend, saved on return, never trusted from the frontend
- Fine payments (Cash/UPI/Other), partial + full payments, overpayment rejected
- Student page: current issues, due dates, overdue days, outstanding fines, borrowing + fine history
- Dashboard stats, transactions list, overdue list, notifications, audit logs
- Swagger docs at `/docs`, ReDoc at `/redoc`, OpenAPI at `/openapi.json`

## Database design

Tables: `users`, `staff`, `students`, `categories`, `books`, `book_transactions`, `fines`, `fine_payments`, `notifications`, `audit_logs` (+ `alembic_version`).

Key relationships: categories 1—many books · students 1—many transactions · books 1—many transactions · staff 1—many transactions (issued/collected by) · transaction 1—0/1 fine · fine 1—many payments. Every `User` (admin or staff) has one `Staff` profile row so "who did this" is uniform.

## API overview

Auth: `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` · `POST /api/auth/change-password`

Students: `GET/POST /api/students` · `GET/PUT /api/students/{id}` · `PATCH /api/students/{id}/status` · `GET /api/students/{id}/history` · `GET /api/students/{id}/transactions` · `GET /api/students/{id}/fines`

Staff (admin only): `GET/POST /api/staff` · `GET/PUT /api/staff/{id}` · `PATCH /api/staff/{id}/status` · `POST /api/staff/{id}/reset-password` · `DELETE /api/staff/{id}`

Books: `GET/POST /api/books` · `GET/PUT/DELETE /api/books/{id}` (delete = soft-disable)

Categories: `GET/POST /api/categories` · `GET/PUT/DELETE /api/categories/{id}`

Transactions: `GET /api/transactions` · `POST /api/transactions/issue` · `POST /api/transactions/{id}/return` · `GET /api/transactions/overdue`

Fines: `GET /api/fines` · `GET /api/fines/{id}` · `POST /api/fines/{id}/payment` · `POST /api/fines/{id}/pay-in-full`

Notifications: `GET /api/notifications` · `POST /api/notifications/test`

Misc: `GET /api/dashboard/stats` · `GET /api/audit-logs` · `GET /api/config` · `GET /api/health`

## Local setup (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows — or: source .venv/bin/activate
pip install -r requirements.txt
copy ..\.env.example ..\.env  # then edit values (or set DATABASE_URL directly)
# SQLite quick start:
set DATABASE_URL=sqlite:///./lms.db
python -m app.seed            # creates admin/staff/students/categories/books
uvicorn app.main:app --reload # API at http://localhost:8000, docs at /docs
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                   # app at http://localhost:5173 (proxies /api to :8000)
```

## Docker (one-command startup)

```bash
cp .env.example .env   # review secrets first
docker compose up --build
```

- Frontend: http://localhost:3000 · Backend: http://localhost:8000 · Docs: http://localhost:8000/docs
- The backend waits for Postgres (`pg_isready`), runs `alembic upgrade head`, seeds demo data when `RUN_SEED=true`, then starts uvicorn (single worker so the overdue scheduler runs exactly once).
- Postgres data persists in the `pgdata` volume.

## Environment variables

See `.env.example` (never commit `.env`): `DATABASE_URL`, `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `CORS_ORIGINS`, `LOAN_PERIOD_DAYS` (20), `FINE_PER_DAY` (10), `MAX_BOOKS_PER_STUDENT` (5), `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID`, `AUTO_CREATE_TABLES`, `RUN_SEED`, plus Compose vars (`POSTGRES_*`, ports, `VITE_API_URL`).

## Tests

```bash
cd backend
pytest tests -q     # 59 tests, uses throwaway in-memory SQLite + a frozen clock
```

Covered: login (good/bad/inactive), protected routes, admin-vs-staff permissions, book/category validation, category-delete guard, issue rules, 20-day due date, stock changes, return + duplicate-return guard, fines (0/1/4 days → Rs 0/10/40), payments + overpayment guard, overdue notice sent once, dynamic live fines. Time travel is done through `app/utils/clock.py` (`FrozenClock` in tests) — no waiting 20 real days.

Frontend: `npm run build` runs `tsc --noEmit` + Vite production build.

## Demo credentials (local/dev only)

- Admin: `admin` / `Admin@123` → `STAFF-0001`
- Staff: `staff` / `Staff@123` → `STAFF-0002`

## Mentor demo script (5 minutes)

1. Login as admin → create staff (`STAFF-0003`).
2. Create a student (`STU-000004`-style ID auto-generated).
3. Create a category (e.g. `Programming`), create a book (`BOOK-0000xx`).
4. Login as staff → **Issue** the book: note issue date and due date (+20 days).
5. Overdue: open `/transactions/overdue` after the due date (or run the overdue job / use test data) → see status, SMS row in **Notifications**, live fine Rs 10/day.
6. **Return** the book → fine shown (e.g. Rs 40 for 4 days).
7. **Fines** → record payment (partial, then full) → status `PAID`.
8. **Audit Logs** → complete history of every step. **Docs** → try it live in Swagger.

## Deploying (beta)

- **Backend → Render**: create a Web Service from `backend/` (build: `pip install -r requirements.txt`, start: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`). Add a Render Postgres database, set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS=https://<your-frontend>.vercel.app`, `AUTO_CREATE_TABLES=false`. Note: Render free tier sleeps — the overdue scheduler only runs while the service is awake.
- **Frontend → Vercel**: import `frontend/`, build command `npm run build`, output `dist`, env `VITE_API_URL=https://<your-backend>.onrender.com`. SPA rewrites are in `frontend/vercel.json`.

## Future improvements (not built)

Barcode/QR scanning, email/WhatsApp notices, multi-branch support, reservations/waitlist, Excel/PDF exports, receipts, analytics, backups, admin-configurable loan/fine from the UI.
