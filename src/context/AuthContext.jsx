import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import client, { setAccessToken } from '../api/client.js';

const AuthContext = createContext(null);
const SESSION_HINT_KEY = 'assetrak_had_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // If we've never had a session in this browser, skip straight to "logged out"
  // instead of firing a refresh request that we already know will 401.
  const [loading, setLoading] = useState(() => localStorage.getItem(SESSION_HINT_KEY) === '1');
  // Prevents a duplicate /auth/refresh call from React 18 StrictMode's
  // intentional double-invoke of effects in development.
  const bootstrapped = useRef(false);

  const bootstrap = useCallback(async () => {
    try {
      const { data } = await client.post('/auth/refresh');
      setAccessToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem(SESSION_HINT_KEY, '1');
    } catch {
      // No valid session (first visit, or the refresh cookie expired) -
      // this is an expected, silent path, not an error condition to surface.
      setUser(null);
      localStorage.removeItem(SESSION_HINT_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    // Only ping /auth/refresh if this browser has logged in before -
    // otherwise there's no cookie to check and we'd just get a guaranteed 401.
    if (localStorage.getItem(SESSION_HINT_KEY) === '1') {
      bootstrap();
    } else {
      setLoading(false);
    }

    const onExpired = () => {
      setUser(null);
      localStorage.removeItem(SESSION_HINT_KEY);    
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [bootstrap]);

  const login = useCallback(async (email, password) => {
    const { data } = await client.post('/auth/login', { email: email.trim(), password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem(SESSION_HINT_KEY, '1');
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem(SESSION_HINT_KEY);
    }
  }, []);

  const updateUser = useCallback((nextUser) => setUser(nextUser), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}