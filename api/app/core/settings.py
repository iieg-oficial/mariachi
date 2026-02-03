import json
from functools import lru_cache
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str
    version: str
    database_url: str
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    redis_url: str
    minio_endpoint: str
    minio_public_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket_name: str
    minio_use_ssl: bool
    cors_origins: list[str]
    admin_prefix: str
    web_prefix: str
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
    openapi_url: str

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    model_config = SettingsConfigDict(env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()

