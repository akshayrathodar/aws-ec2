import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);
const AUTH_TOKEN_KEY = 'todo-app-auth-token';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const apiUrl = (path) => `${API_BASE_URL}${path}`;

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const json = await response.json().catch(() => null);
  return { response, json };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setAuthLoading(false);
        return;
      }

      const { response, json } = await fetchJson(apiUrl('/me'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok && json?.username) {
        setUser({ username: json.username });
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }

      setAuthLoading(false);
    }

    restoreSession();
  }, []);

  const login = async ({ username, password }) => {
    const body = new URLSearchParams();
    body.append('username', username);
    body.append('password', password);

    const { response, json } = await fetchJson(apiUrl('/auth/token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok || !json?.access_token) {
      throw new Error(json?.detail || 'Login failed');
    }

    localStorage.setItem(AUTH_TOKEN_KEY, json.access_token);

    const { response: meResponse, json: meJson } = await fetchJson(apiUrl('/me'), {
      headers: {
        Authorization: `Bearer ${json.access_token}`,
      },
    });

    if (!meResponse.ok || !meJson?.username) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      throw new Error('Unable to validate session');
    }

    setUser({ username: meJson.username });
  };

  const register = async ({ username, password }) => {
    const { response, json } = await fetchJson(apiUrl('/auth/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok || !json?.username) {
      throw new Error(json?.detail || 'Registration failed');
    }

    await login({ username, password });
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  };

  const fetchWithAuth = async (path, options = {}) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const headers = {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : undefined,
    };
    const response = await fetch(apiUrl(path), { ...options, headers });
    if (response.status === 401) {
      logout();
    }
    return response;
  };

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout, register, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
