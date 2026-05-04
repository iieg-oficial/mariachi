import json
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.version import get_app_version


class Settings(BaseSettings):
    environment: Literal["development", "staging", "production"] = "development"
    project_name: str = "Mariachi"
    version: str = Field(default_factory=get_app_version)
    database_url: str
    dataengine_database_url: str | None = None
    dataengine_pool_size: int = 5
    dataengine_max_overflow: int = 5
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    redis_url: str
    acervo_endpoint: str
    acervo_public_endpoint: str
    acervo_use_ssl: bool = False
    acervo_verify_ssl: bool = True
    cors_origins: list[str]
    admin_prefix: str = "/api/administrador"
    web_prefix: str = "/api/portal"
    mapalab_public_prefix: str = "/api/mapalab"
    public_prefix: str = "/api/public"
    cookie_name: str = "access_token"
    cookie_max_age: int = 1800
    cookie_domain: str | None = None
    cookie_secure: bool = False
    cookie_httponly: bool = True
    cookie_samesite: str = "lax"
    csrf_secret_key: str
    csrf_token_expire_minutes: int = 60
    docs_url: str | None = None
    redoc_url: str | None = None
    openapi_url: str | None = None

    geoserver_url: str | None = None
    geoserver_user: str | None = None
    geoserver_password: str | None = None
    geoserver_timeout: float = 10.0

    mapalab_backend_url: str | None = None
    mapalab_internal_token: str | None = None
    sieej_url: str | None = None
    sieej_ontoy_url: str | None = None
    acervo_ontoy_url: str | None = None
    dataengine_ontoy_url: str | None = None
    geoserver_ontoy_url: str | None = None
    gateway_hub_ontoy_url: str | None = None
    huachicol_ontoy_url: str | None = None

    sentry_dsn: str | None = None
    sentry_traces_sample_rate: float = 0.1

    discord_webhook_mapalab: str | None = None
    discord_webhook_sieej: str | None = None
    discord_webhook_portal: str | None = None

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

