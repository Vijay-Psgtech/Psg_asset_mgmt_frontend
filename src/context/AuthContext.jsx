import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import client, { setAccessToken } from '../api/client.js';

const AuthContext = createContext(null);
const SESSION_HINT_KEY = 'assetrak_had_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [bootstrapError, setBootstrapError] = useState('');
  const [loading, setLoading] = useState(() => localStorage.getItem(SESSION_HINT_KEY) === '1');
  const bootstrapped = useRef(false);

  const bootstrap = useCallback(async () => {  
    setBootstrapError('');
    let data;
    try {
      ({ data } = await client.post('/auth/refresh'));
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      setInstitutions([]);
      localStorage.removeItem(SESSION_HINT_KEY);
      if (error.response?.status !== 401) {
        setBootstrapError('Unable to verify your session. Check your connection and sign in again.');
      }
      setLoading(false);
      return;
    }

    setAccessToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem(SESSION_HINT_KEY, '1');
    try {
      const institutionList = await client.get('/auth/institutions');
      setInstitutions(institutionList.data.institutions || []);
    } catch {
      setInstitutions([]);
      setBootstrapError('Your session is active, but the institution list could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    
    if (localStorage.getItem(SESSION_HINT_KEY) === '1') {
      bootstrap();
    } else {
      setLoading(false);
    }

    const onExpired = () => {
      setUser(null);
      setInstitutions([]);
      localStorage.removeItem(SESSION_HINT_KEY);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [bootstrap]);

  const login = useCallback(async (email, password, institutionId = null) => {
    setBootstrapError('');
    const { data } = await client.post('/auth/login', { email: email.trim(), password, institutionId });
    setAccessToken(data.accessToken);
    setUser(data.user);
    const institutionList = await client.get('/auth/institutions');
    setInstitutions(institutionList.data.institutions || []);
    localStorage.setItem(SESSION_HINT_KEY, '1');
    return data.user;
  }, []);

  const switchInstitution = useCallback(async (institutionId) => {
    const { data } = await client.post('/auth/switch-institution', { institutionId });
    setAccessToken(data.accessToken);
    setUser(data.user);
    const institutionList = await client.get('/auth/institutions');
    setInstitutions(institutionList.data.institutions || []);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      setInstitutions([]);
      setBootstrapError('');
      localStorage.removeItem(SESSION_HINT_KEY);
    }
  }, []);

  const updateUser = useCallback((nextUser) => setUser(nextUser), []);

  const clearBootstrapError = useCallback(() => setBootstrapError(''), []);

  return (
    <AuthContext.Provider value={{ user, institutions, loading, bootstrapError, clearBootstrapError, login, logout, switchInstitution, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}