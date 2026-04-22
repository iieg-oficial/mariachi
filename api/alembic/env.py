from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context
from app.core.settings import get_settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()

db_target = context.get_x_argument(as_dictionary=True).get("db", "mariachi")

if db_target == "mariachi":
    from app.models import Base as target_base
    target_url = settings.database_url
    version_table = "alembic_version"
elif db_target == "dataengine":
    from app.core.database import DataEngineBase as target_base
    if not settings.dataengine_database_url:
        raise RuntimeError(
            "DATAENGINE_DATABASE_URL no esta configurado. "
            "Requerido para migraciones con -x db=dataengine."
        )
    target_url = settings.dataengine_database_url
    version_table = "alembic_version_dataengine"
    import app.models.layer  # noqa: F401 — carga modelos para autogenerate cuando existan
else:
    raise RuntimeError(
        f"db_target invalido: '{db_target}'. Usar -x db=mariachi o -x db=dataengine."
    )

target_metadata = target_base.metadata
config.set_main_option("sqlalchemy.url", target_url)


def run_migrations_offline() -> None:
    context.configure(
        url=target_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table=version_table,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table=version_table,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
