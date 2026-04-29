# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN mkdir -p app && touch app/__init__.py

FROM base AS development
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -e ".[dev]"
COPY . .
EXPOSE 8000
ENV ENV=development
CMD ["./scripts/start_backend.sh"]

FROM base AS production
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -e "."
COPY . .
EXPOSE 8000
ENV ENV=production
CMD ["./scripts/start_backend.sh"]
