from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db
from models import Todo as TodoRow


# Pydantic = API contract. ORM model is `TodoRow` in `models.py` (same fields, different role).
class TodoBody(BaseModel):
    id: int | None = None
    name: str | None = None
    completed: bool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
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


@app.get("/")
def get_todos(db: Session = Depends(get_db)):
    """Step 4 — read: `Session` + `select` returns rows from MySQL."""
    rows = db.scalars(select(TodoRow).order_by(TodoRow.id)).all()
    return {
        "todos": [
            {"id": r.id, "name": r.name, "completed": r.completed} for r in rows
        ],
    }


@app.post("/delete/{id}")
def delete(id: int,db: Session = Depends(get_db)):
    row = db.get(TodoRow, id)
    db.delete(row)
    db.commit()
    return {"message": f"Todo {row.id} deleted"}


@app.post("/add")
def add(todo: TodoBody, db: Session = Depends(get_db)):
    row = TodoRow(name=todo.name, completed=todo.completed)
    print(row)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"todo": {"id": row.id, "name": row.name, "completed": row.completed}}


@app.put("/update/{todo_id}")
def update(todo_id: int, todo: TodoBody, db: Session = Depends(get_db)):
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
