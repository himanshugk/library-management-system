#!/bin/sh
set -e

echo "Waiting for database at $DATABASE_URL ..."
# Extract host/port for pg_isready when using the default compose URL.
DB_HOST=$(python -c "from urllib.parse import urlparse; u=urlparse('${DATABASE_URL}'); print(u.hostname or 'db')" 2>/dev/null || echo db)
DB_PORT=$(python -c "from urllib.parse import urlparse; u=urlparse('${DATABASE_URL}'); print(u.port or 5432)" 2>/dev/null || echo 5432)
DB_USER=$(python -c "from urllib.parse import urlparse; u=urlparse('${DATABASE_URL}'); print(u.username or 'lms_user')" 2>/dev/null || echo lms_user)

until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
  echo "database not ready, retrying in 2s..."
  sleep 2
done

echo "Running database migrations..."
alembic upgrade head

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding development data..."
  python -m app.seed || echo "Seed skipped/failed (may already exist)."
fi

echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1