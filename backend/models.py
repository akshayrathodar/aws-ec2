"""
Step 2 — map Python class ⇔ `todos` table.

Subclass `Base` so metadata knows every table. Columns mirror fields you already use in Pydantic.
"""
from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
