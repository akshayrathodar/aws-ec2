import './App.css';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './auth';

function LoginPage({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ username, password });
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <section className="todo-card">
        <h1>Login</h1>
        <form className="todo-input-row" onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ marginTop: '16px' }}>
          Don&apos;t have an account?{' '}
          <button type="button" className="link-button" onClick={onSwitchToRegister}>
            Register here
          </button>
        </p>
        {error && <p className="auth-error">{error}</p>}
      </section>
    </main>
  );
}

function RegisterPage({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register({ username, password });
    } catch (err) {
      setError(err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <section className="todo-card">
        <h1>Register</h1>
        <form className="todo-input-row" onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Create account'}
          </button>
        </form>
        <p style={{ marginTop: '16px' }}>
          Already have an account?{' '}
          <button type="button" className="link-button" onClick={onSwitchToLogin}>
            Sign in
          </button>
        </p>
        {error && <p className="auth-error">{error}</p>}
      </section>
    </main>
  );
}

function AppContent() {
  const { user, logout, authLoading, fetchWithAuth } = useAuth();
  const [view, setView] = useState('login');
  const [todos, setTodos] = useState([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setTodos([]);
      return;
    }

    async function loadTodos() {
      setLoading(true);
      setError('');
      try {
        const response = await fetchWithAuth('/');
        if (!response.ok) {
          if (response.status === 401) return;
          const json = await response.json().catch(() => ({}));
          throw new Error(json.detail || 'Unable to load todos');
        }
        const data = await response.json();
        setTodos(data.todos || []);
      } catch (err) {
        setError(err?.message || 'Error loading todos');
      } finally {
        setLoading(false);
      }
    }

    loadTodos();
  }, [user, fetchWithAuth]);

  const handleApiJSON = async (response) => {
    if (response.status === 401) {
      return null;
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || 'Server error');
    }
    return data;
  };

  const handleAddTodo = async () => {
    const title = newTodoTitle.trim();
    if (!title) return;

    try {
      const response = await fetchWithAuth('/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: title }),
      });
      const data = await handleApiJSON(response);
      if (!data) return;
      setTodos((prevTodos) => [...prevTodos, data.todo]);
      setNewTodoTitle('');
    } catch (err) {
      setError(err?.message || 'Could not add todo');
    }
  };

  const handleSaveEdit = async () => {
    const name = editingTitle.trim();
    if (!name) return;

    try {
      const response = await fetchWithAuth(`/update/${editingTodoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      const data = await handleApiJSON(response);
      if (!data) return;
      setTodos((prevTodos) =>
        prevTodos.map((todo) => (todo.id === editingTodoId ? data.todo : todo))
      );
      setEditingTodoId(null);
      setEditingTitle('');
    } catch (err) {
      setError(err?.message || 'Could not update todo');
    }
  };

  const handleDeleteTodo = async (todoId) => {
    try {
      const response = await fetchWithAuth(`/delete/${todoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      await handleApiJSON(response);
      setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== todoId));
    } catch (err) {
      setError(err?.message || 'Could not delete todo');
    }
  };

  const handleToggleComplete = async (todoId, completed) => {
    try {
      const response = await fetchWithAuth(`/update/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      });
      const data = await handleApiJSON(response);
      if (!data) return;
      setTodos((prevTodos) =>
        prevTodos.map((todo) => (todo.id === todoId ? data.todo : todo))
      );
    } catch (err) {
      setError(err?.message || 'Could not update todo');
    }
  };

  const handleStartEdit = (todo) => {
    setEditingTodoId(todo.id);
    setEditingTitle(todo.name);
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setEditingTitle('');
  };

  if (authLoading) {
    return (
      <main className="app">
        <section className="todo-card">
          <h1>Loading…</h1>
        </section>
      </main>
    );
  }

  if (!user) {
    return view === 'register' ? (
      <RegisterPage onSwitchToLogin={() => setView('login')} />
    ) : (
      <LoginPage onSwitchToRegister={() => setView('register')} />
    );
  }

  return (
    <main className="app">
      <section className="todo-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1>Todo App</h1>
          <div>
            <span style={{ marginRight: '12px', color: '#4b5563' }}>Signed in as {user.username}</span>
            <button type="button" onClick={logout} style={{ background: '#9ca3af' }}>
              Logout
            </button>
          </div>
        </div>

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

        {error && <p className="auth-error" style={{ color: '#dc2626' }}>{error}</p>}

        {loading ? (
          <p>Loading todos…</p>
        ) : (
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
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={(event) => handleToggleComplete(todo.id, event.target.checked)}
                        style={{ width: '20px' }}
                      />
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
        )}
      </section>
    </main>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
