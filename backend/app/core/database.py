import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL or ""

# Filter out unconfigured password placeholders
if "[YOUR-PASSWORD]" in db_url or "YOUR-PASSWORD" in db_url:
    db_url = "sqlite:///./gold_business.db"

# Normalize PostgreSQL scheme
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Normalize MySQL scheme to use pymysql driver
if db_url.startswith("mysql://"):
    db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)

# Check driver availability
if db_url.startswith("postgresql"):
    try:
        import psycopg2
    except ImportError:
        logger.warning("psycopg2 not installed, falling back to SQLite")
        db_url = "sqlite:///./gold_business.db"
elif db_url.startswith("mysql"):
    try:
        import pymysql
    except ImportError:
        logger.warning("pymysql not installed, falling back to SQLite")
        db_url = "sqlite:///./gold_business.db"
elif not db_url.startswith("sqlite"):
    db_url = "sqlite:///./gold_business.db"

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
