import json
from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: Literal["development", "staging", "production"] = "development"
    project_name: str
    version: str
    database_url: str
    dataengine_database_url: str | None = None
    dataengine_pool_size: int = 5
    dataengine_max_overflow: int = 5
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    redis_url: str
    acervo_endpoint: str
    acervo_public_endpoint: str
    acervo_access_key: str
    acervo_secret_key: str
    acervo_bucket_name: str
    acervo_use_ssl: bool
    acervo_verify_ssl: bool = True
    cors_origins: list[str]
    admin_prefix: str
    web_prefix: str
    mapalab_public_prefix: str = "/api/mapalab"
    cookie_name: str
    cookie_max_age: int
    cookie_domain: str | None = None
    cookie_secure: bool
    cookie_httponly: bool
    cookie_samesite: str
    csrf_secret_key: str
    csrf_token_expire_minutes: int
    docs_url: str | None = None
    redoc_url: str | None = None
    openapi_url: str | None = None

    geoserver_url: str | None = None
    geoserver_user: str | None = None
    geoserver_password: str | None = None
    geoserver_timeout: float = 10.0

    mapalab_backend_url: str | None = None
    mapalab_internal_token: str | None = None

    sentry_dsn: str | None = None
    sentry_traces_sample_rate: float = 0.1

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    @model_validator(mode="after")
    def enforce_production_defaults(self):
        if self.environment == "production":
            self.docs_url = None
            self.redoc_url = None
            self.openapi_url = None
            self.cookie_secure = True
            if "*" in self.cors_origins:
                raise ValueError("CORS_ORIGINS no puede contener '*' en production")
        return self

    model_config = SettingsConfigDict(env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()

