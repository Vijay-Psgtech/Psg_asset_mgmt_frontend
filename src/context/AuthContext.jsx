import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import client, { setAccessToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Prevents a duplicate /auth/refresh call from React 18 StrictMode's
  // intentional double-invoke of effects in development.
  const bootstrapped = useRef(false);

  const bootstrap = useCallback(async () => {
    try {
      const { data } = await client.post('/auth/refresh');
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch {
      // No valid session (first visit, or the refresh cookie expired) -
      // this is an expected, silent path, not an error condition to surface.
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    bootstrap();

    const onExpired = () => {
      setAccessToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [bootstrap]);

  const login = useCallback(async (email, password, institution) => {
    const { data } = await client.post('/auth/login', { email: email.trim(), password, institution });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
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