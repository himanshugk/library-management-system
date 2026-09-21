#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set!"
  echo "On Render, attach a Postgres DB or set DATABASE_URL manually."
  echo "Example: postgresql+psycopg://user:pass@host:5432/db"
  echo "If you used 'render.yaml' Blueprint, the DB is created automatically."
  exit 1
fi

# Mask password for logs
MASKED_URL=$(python -c "import os, urllib.parse; u=urllib.parse.urlparse(os.environ.get('DATABASE_URL','')); print(f\"{u.scheme}://{u.username}:***@{u.hostname}:{u.port or 5432}{u.path}\")" 2>/dev/null || echo "***")
echo "Waiting for database at $MASKED_URL ..."

# Parse host/port/user via Python (handles postgres:// and special chars)
DB_HOST=$(python -c "import os, urllib.parse; u=urllib.parse.urlparse(os.environ.get('DATABASE_URL','')); print(u.hostname or 'db')" 2>/dev/null || echo db)
DB_PORT=$(python -c "import os, urllib.parse; u=urllib.parse.urlparse(os.environ.get('DATABASE_URL','')); print(u.port or 5432)" 2>/dev/null || echo 5432)
DB_USER=$(python -c "import os, urllib.parse; u=urllib.parse.urlparse(os.environ.get('DATABASE_URL','')); print(u.username or 'lms_user')" 2>/dev/null || echo lms_user)

# Wait up to ~60s, then fail fast with a clear message
TRIES=0
MAX_TRIES=30
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
  TRIES=$((TRIES+1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "ERROR: database at $DB_HOST:$DB_PORT not reachable after $MAX_TRIES tries."
    echo "Check that DATABASE_URL host is correct and the DB is running."
    echo "On Render, ensure the Postgres service is in the same region and linked."
    exit 1
  fi
  echo "database not ready ($TRIES/$MAX_TRIES), retrying in 2s..."
  sleep 2
done

echo "Database is ready."

echo "Running database migrations..."
alembic upgrade head

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding development data..."
  python -m app.seed || echo "Seed skipped/failed (may already exist)."
fi

echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1