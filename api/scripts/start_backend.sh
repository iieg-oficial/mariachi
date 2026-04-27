#!/usr/bin/env bash
set -euo pipefail

cd /app

echo "▶️ Running database bootstrap (scripts/init_db.py)..."
python scripts/init_db.py
echo "✅ Database bootstrap completed."

if [ "${ENV:-production}" = "development" ]; then
    echo "🚀 Launching Uvicorn (development)..."
    exec uvicorn app.main:app \
        --host 0.0.0.0 --port 8000 --reload \
        --proxy-headers \
        --forwarded-allow-ips='*'
else
    echo "🚀 Launching Gunicorn + Uvicorn workers (production)..."
    exec gunicorn app.main:app \
        --bind 0.0.0.0:8000 \
        --workers "${GUNICORN_WORKERS:-2}" \
        --worker-class uvicorn.workers.UvicornWorker \
        --forwarded-allow-ips='*' \
        --access-logfile - \
        --error-logfile - \
        --timeout 120 \
        --graceful-timeout 30 \
        --keep-alive 5
fi

