import json
from functools import lru_cache
from typing import Literal
from urllib.parse import quote, urlsplit, urlunsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.version import get_app_version


class Settings(BaseSettings):
    environment: Literal["development", "production"] = "development"
    project_name: str = "Mariachi"
    version: str = Field(default_factory=get_app_version)
    database_url: str | None = None
    postgres_user: str | None = None
    postgres_password: str | None = None
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_db: str | None = None
    dataengine_database_url: str | None = None
    dataengine_pool_size: int = 5
    dataengine_max_overflow: int = 5
    dataengine_connect_timeout: int = 3
    dataengine_pool_recycle: int = 1800
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    redis_url: str
    redis_password: str | None = None
    acervo_endpoint: str
    acervo_public_endpoint: str
    acervo_use_ssl: bool = False
    acervo_verify_ssl: bool = True
    cors_origins: list[str]
    admin_prefix: str = "/api/mariachi"
    admin_prefix_legacy: str = "/api/administrador"
    web_prefix: str = "/api/portal"
    mapalab_public_prefix: str = "/api/mapalab"
    public_prefix: str = "/api/public"
    cookie_name: str = "access_token"
    cookie_max_age: int = 1800
    cookie_domain: str | None = None
    cookie_secure: bool = False
    cookie_httponly: bool = True
    cookie_samesite: str = "lax"
    refresh_cookie_name: str = "refresh_token"
    refresh_token_expire_minutes: int = 480
    csrf_secret_key: str
    csrf_token_expire_minutes: int = 60

    minerva_issuer_url: str
    minerva_public_url: str = ""
    minerva_application_code: str = "mariachi"
    minerva_client_id: str
    minerva_client_secret: str
    minerva_redirect_uri: str
    minerva_login_url: str = ""
    minerva_sieej_branding_client_id: str = ""
    minerva_scopes: str = "openid profile email"
    minerva_post_login_url: str = "/"

    @property
    def refresh_cookie_max_age(self) -> int:
        return self.refresh_token_expire_minutes * 60

    @property
    def minerva_public_base(self) -> str:
        return (self.minerva_public_url or self.minerva_issuer_url).rstrip("/")

    @property
    def minerva_logout_base(self) -> str:
        return (self.minerva_login_url or self.minerva_public_base).rstrip("/")

    docs_url: str | None = None
    redoc_url: str | None = None
    openapi_url: str | None = None

    geoserver_url: str | None = None
    geoserver_user: str | None = None
    geoserver_password: str | None = None
    geoserver_timeout: float = 10.0
    geoserver_upload_staging_dir: str = "/var/tmp/geoserver-uploads"
    geoserver_upload_max_bytes: int = 0
    geoserver_installed_font_families: str = "Garet"

    mapalab_backend_url: str | None = None
    mapalab_internal_token: str | None = None
    acervo_internal_token: str | None = None
    sieej_url: str | None = None
    sieej_edicion_deshabilitada: bool = False
    huachicol_monitor_url: str | None = None

    frames_enabled: bool = False
    frames_api_url: str | None = None
    frames_timeout: float = 10.0
    frames_rtsp_username: str | None = None
    frames_detect_fps: int = 15

    intranet_cliente_sha256: str | None = None
    sieej_documentacion_sync_sha256: str | None = None

    intranet_enabled: bool = False
    intranet_api_url: str | None = None
    intranet_api_key: str | None = None
    intranet_timeout: float = 20.0

    vine_enabled: bool = False
    vine_biometrico_url: str | None = None
    vine_biometrico_timeout: int = 5

    colibri_api_key_mariachi: str | None = None

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
    def compose_database_url(self):
        if self.database_url:
            return self
        if not (self.postgres_user and self.postgres_password and self.postgres_db):
            raise ValueError(
                "Falta DATABASE_URL, o POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB para componerla"
            )
        self.database_url = (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
        return self

    @model_validator(mode="after")
    def compose_redis_url(self):
        if not self.redis_password:
            return self
        partes = urlsplit(self.redis_url)
        if "@" in partes.netloc:
            return self
        credencial = quote(self.redis_password.strip(), safe="")
        self.redis_url = urlunsplit(partes._replace(netloc=f":{credencial}@{partes.netloc}"))
        return self

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

    model_config = SettingsConfigDict(env_file_encoding="utf-8", secrets_dir="/run/secrets")


@lru_cache
def get_settings() -> Settings:
    return Settings()
