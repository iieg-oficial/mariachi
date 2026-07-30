from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .settings import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


dataengine_engine = None
DataEngineSessionLocal = None
DataEngineBase = declarative_base()


def _ensure_dataengine_engine():
    global dataengine_engine, DataEngineSessionLocal
    if dataengine_engine is None:
        if not settings.dataengine_database_url:
            raise RuntimeError("DATAENGINE_DATABASE_URL no esta configurado")
        dataengine_engine = create_engine(
            settings.dataengine_database_url,
            pool_pre_ping=True,
            pool_size=settings.dataengine_pool_size,
            max_overflow=settings.dataengine_max_overflow,
            pool_recycle=settings.dataengine_pool_recycle,
            connect_args={
                "connect_timeout": settings.dataengine_connect_timeout,
                "options": "-c timezone=utc",
            },
        )
        DataEngineSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=dataengine_engine
        )


def get_dataengine_db():
    _ensure_dataengine_engine()
    db = DataEngineSessionLocal()
    try:
        yield db
    finally:
        db.close()
