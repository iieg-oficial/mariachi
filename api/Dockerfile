# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore

RUN apt-get update && apt-get install -y --no-install-recommends \
        postgresql-client \
        libpango-1.0-0 \
        libpangoft2-1.0-0 \
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

FROM development AS test
ENV ENV=test
CMD ["pytest", "-q"]

FROM base AS production
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -e "."
COPY . .
RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home-dir /home/app --create-home app \
    && mkdir -p /var/tmp/geoserver-uploads \
    && chown app:app /var/tmp/geoserver-uploads
USER app
EXPOSE 8000
ENV ENV=production
CMD ["./scripts/start_backend.sh"]
