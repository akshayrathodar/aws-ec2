"""
Connection + sessions for MySQL (via PyMySQL driver).

Set `DATABASE_URL` or `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_DATABASE`.
Example:
  export DATABASE_URL="mysql+pymysql://user:pass@127.0.0.1:3306/todo"

Create the database once in MySQL:
  CREATE DATABASE todo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"""
import os
import time
from collections.abc import Generator
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


def _database_url() -> str:
    explicit = os.getenv("DATABASE_URL")
    print("DATABASE_URL", explicit)
    if explicit:
        return explicit
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    port = os.getenv("MYSQL_PORT", "3309")
    database = os.getenv("MYSQL_DATABASE", "todo")
    safe_password = quote_plus(password)
    return f"mysql+pymysql://{user}:{safe_password}@{host}:{port}/{database}"


SQLALCHEMY_DATABASE_URL = _database_url()

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
)


def wait_for_db(timeout_seconds: int = 30, interval_seconds: float = 1.0) -> None:
    """Wait until the MySQL database is reachable before continuing startup."""
    start_time = time.monotonic()
    while True:
        try:
            with engine.connect():
                return
        except OperationalError:
            if time.monotonic() - start_time >= timeout_seconds:
                raise
            time.sleep(interval_seconds)


class Base(DeclarativeBase):
    """Subclass this in `models.py` for each table."""

    pass


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
