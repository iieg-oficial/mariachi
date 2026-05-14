from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context
from app.core.settings import get_settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()

# Politica (ecosystem §7.3 v2, 2026-04-24): mariachi gestiona unicamente su
# propio schema 'mariachi'. Las migraciones del schema 'mapalab' viven en
# dataengine/jobs/alembic/ y se aplican vía `make migrate` desde
# ese repo. Si necesitas correrlas en dev local: cd ../dataengine && make migrate
from app.models import Base as target_base
target_url = settings.database_url
version_table = "alembic_version"

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
