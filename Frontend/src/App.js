import './App.css';
import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const apiUrl = (path) => `${API_BASE_URL}${path}`;

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    fetch(apiUrl('/'))
      .then(response => response.json())
      .then(data => setTodos(data.todos))
      .catch(error => console.error('Error fetching todos:', error));
  }, []);

  const handleAddTodo = () => {
    const title = newTodoTitle.trim();

    if (!title) {
      return;
    }

    fetch(apiUrl('/add'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: title,
      }),
    })
      .then(response => {
        return response.json().then(data => {
          setTodos((prevTodos) => [...prevTodos, data.todo]);
          setNewTodoTitle('');
        });
      })
  };

  const handleStartEdit = (todo) => {
    setEditingTodoId(todo.id);
    setEditingTitle(todo.name);
  };

  const handleSaveEdit = () => {
    const name = editingTitle.trim();

    if (!name) {
      return;
    }

    fetch(apiUrl(`/update/${editingTodoId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
      }),
    })
      .then(response => {
        return response.json().then(data => {
          setTodos((prevTodos) =>
            prevTodos.map((todo) =>
              todo.id === editingTodoId ? data.todo : todo
            )
          );
        });
      })
      .then(() => {
        setEditingTodoId(null);
        setEditingTitle('');
      }); 
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setEditingTitle('');
  };

  const handleDeleteTodo = (todoId) => {
    fetch(apiUrl(`/delete/${todoId}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then(response => response.json())
      .then(data => {
        setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== todoId));
      })
      .catch(error => console.error('Error deleting todo:', error));

    // TODO: replace with API delete call
    // await deleteTodo(todoId);
  };

  const handleToggleComplete = (todoId, completed) => {
    console.log(todoId, completed);
    fetch(apiUrl(`/update/${todoId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        completed: completed,
      }),
    })
    .then(response => response.json())
    .then(data => {
      setTodos((prevTodos) =>
        prevTodos.map((todo) =>
          todo.id === todoId ? data.todo : todo
        )
      );
    });
  };

  return (
    <main className="app">
      <section className="todo-card">
        <h1>Todo App</h1>

        <div className="todo-input-row">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(event) => setNewTodoTitle(event.target.value)}
            placeholder="Add a new todo"
          />
          <button type="button" onClick={handleAddTodo}>
            Add
          </button>
        </div>

        <ul className="todo-list">
          {todos.length === 0 ? (
            <li className="todo-empty">No todos yet.</li>
          ) : (
            todos.map((todo) => (
              <li key={todo.id} className="todo-item">
                {editingTodoId === todo.id ? (
                  <>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                    />
                    <button type="button" onClick={handleSaveEdit}>
                      Save
                    </button>
                    <button type="button" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                  <input type="checkbox" checked={todo.completed} onChange={(event) => handleToggleComplete(todo.id, event.target.checked)} style={{width: "20px" }}/>
                    <span>{todo.name}</span>
                    <button type="button" onClick={() => handleStartEdit(todo)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => handleDeleteTodo(todo.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}

export default App;
