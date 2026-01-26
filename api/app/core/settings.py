from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = Field(default="Backend Portal IIEG")
    version: str = Field(default="1.0.0")

    database_url: str = Field(
        default="postgresql://iieg_user:iieg_password@localhost:5432/iieg_portal"
    )
    secret_key: str = Field(default="dev-secret-key-change-in-production")
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=30)

    redis_url: str = Field(default="redis://localhost:6379/0")

    minio_endpoint: str = Field(default="localhost:9000")
    minio_public_endpoint: str = Field(default="localhost:9000")  # URL pública accesible desde navegador
    minio_access_key: str = Field(default="minio_admin")
    minio_secret_key: str = Field(default="minio_password")
    minio_bucket_name: str = Field(default="iieg-media")
    minio_use_ssl: bool = Field(default=False)

    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:5174"]
    )

    cms_prefix: str = Field(default="/api/cms")
    portal_prefix: str = Field(default="/api/portal")

    cookie_name: str = Field(default="access_token")
    cookie_max_age: int = Field(default=1800)
    cookie_domain: str | None = Field(default=None)
    cookie_secure: bool = Field(default=False)
    cookie_httponly: bool = Field(default=True)
    cookie_samesite: str = Field(default="lax")

    csrf_secret_key: str = Field(default="csrf-dev-secret-key-change-in-production")
    csrf_token_expire_minutes: int = Field(default=60)

    docs_url: str | None = Field(default="/docs")
    redoc_url: str | None = Field(default="/redoc")
    openapi_url: str = Field(default="/openapi.json")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()

