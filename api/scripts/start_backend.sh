#!/usr/bin/env bash
set -euo pipefail

cd /app

echo "▶️ Running database bootstrap (scripts/init_db.py)..."
python scripts/init_db.py
echo "✅ Database bootstrap completed."

echo "🚀 Launching FastAPI with Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

