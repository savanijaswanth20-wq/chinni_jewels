from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
if "[YOUR-PASSWORD]" in db_url or "YOUR-PASSWORD" in db_url:
    db_url = "sqlite:///./gold_business.db"

if db_url.startswith("postgresql"):
    try:
        import psycopg2
    except ImportError:
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
