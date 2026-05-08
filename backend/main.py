from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
)
from database import Base, SessionLocal, engine, get_db, wait_for_db
from models import Todo as TodoRow, User as UserRow


# Pydantic = API contract. ORM model is `TodoRow` in `models.py` (same fields, different role).
class TodoBody(BaseModel):
    id: int | None = None
    name: str | None = None
    completed: bool = None


class UserCredentials(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    username: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    wait_for_db()
    # Step 3 — `create_all` makes tables from every model that subclasses `Base` (if imported).
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalars(select(TodoRow).limit(1)).first() is None:
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/auth/register", response_model=UserResponse)
def register(credentials: UserCredentials, db: Session = Depends(get_db)):
    existing = db.scalars(select(UserRow).where(UserRow.username == credentials.username)).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Username already registered")

    user = UserRow(
        username=credentials.username,
        hashed_password=get_password_hash(credentials.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"username": user.username}


@app.post("/auth/token", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token({"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/me", response_model=UserResponse)
def read_me(current_user: UserRow = Depends(get_current_user)):
    return {"username": current_user.username}


@app.get("/")
def get_todos(current_user: UserRow = Depends(get_current_user), db: Session = Depends(get_db)):
    """Step 4 — read: `Session` + `select` returns rows from MySQL."""
    rows = db.scalars(select(TodoRow).order_by(TodoRow.id)).all()
    return {
        "todos": [
            {"id": r.id, "name": r.name, "completed": r.completed} for r in rows
        ],
    }


@app.post("/delete/{id}")
def delete(id: int, current_user: UserRow = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.get(TodoRow, id)
    if row is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(row)
    db.commit()
    return {"message": f"Todo {row.id} deleted"}


@app.post("/add")
def add(todo: TodoBody, current_user: UserRow = Depends(get_current_user), db: Session = Depends(get_db)):
    row = TodoRow(name=todo.name, completed=todo.completed)
    print(row)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"todo": {"id": row.id, "name": row.name, "completed": row.completed}}


@app.put("/update/{todo_id}")
def update(
    todo_id: int,
    todo: TodoBody,
    current_user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.get(TodoRow, todo_id)
    print("todo", todo)
    print("row", row)
    if row is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    print("todo.completed", todo.completed)
    if todo.name is not None:
        row.name = todo.name
    
    if todo.completed is not None:
        row.completed = todo.completed
        
    db.commit()
    db.refresh(row)
    return {"todo": {"id": row.id, "name": row.name, "completed": row.completed}}
