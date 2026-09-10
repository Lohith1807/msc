import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

// 7-day session duration in milliseconds (7 days = 604,800,000 ms)
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function clearStoredSession() {
  try {
    localStorage.removeItem('mindlab_token');
    localStorage.removeItem('mindlab_user');
    localStorage.removeItem('mindlab_session_start');
    sessionStorage.removeItem('mindlab_token');
    sessionStorage.removeItem('mindlab_user');
    sessionStorage.removeItem('mindlab_simulated_role');
  } catch {
    // ignore
  }
}

function getValidStoredSession() {
  try {
    const token = localStorage.getItem('mindlab_token') || sessionStorage.getItem('mindlab_token');
    const userStr = localStorage.getItem('mindlab_user') || sessionStorage.getItem('mindlab_user');
    const sessionCreatedAt = localStorage.getItem('mindlab_session_start');

    // If no token or user, no active session
    if (!token || !userStr) {
      clearStoredSession();
      return null;
    }

    // Check 7-day expiration if timestamp exists
    if (sessionCreatedAt) {
      const elapsed = Date.now() - Number(sessionCreatedAt);
      if (elapsed > SEVEN_DAYS_MS || isNaN(elapsed)) {
        // Expired (> 7 days) -> clean out
        clearStoredSession();
        return null;
      }
    }

    const user = JSON.parse(userStr);
    return { token, user, sessionCreatedAt: sessionCreatedAt ? Number(sessionCreatedAt) : Date.now() };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function AuthProvider({ children }) {
  // Never default to admin or demo accounts: start clean
  const [token, setToken] = useState(() => {
    const session = getValidStoredSession();
    return session ? session.token : null;
  });

  const [user, setUser] = useState(() => {
    const session = getValidStoredSession();
    return session ? session.user : null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Validate existing token on mount and sync user directly from database
  useEffect(() => {
    const verifyToken = async () => {
      const stored = getValidStoredSession();
      if (!stored) {
        setToken(null);
        setUser(null);
        setInitialLoading(false);
        return;
      }

      // Check remaining time before 7-day expiration
      const remainingTime = SEVEN_DAYS_MS - (Date.now() - stored.sessionCreatedAt);
      if (remainingTime <= 0) {
        clearStoredSession();
        setToken(null);
        setUser(null);
        setInitialLoading(false);
        return;
      }

      try {
        const res = await authAPI.getMe(stored.token);
        if (res.success && res.user) {
          setUser(res.user);
          localStorage.setItem('mindlab_user', JSON.stringify(res.user));
          sessionStorage.setItem('mindlab_user', JSON.stringify(res.user));
        } else {
          // Token invalid or user no longer exists
          clearStoredSession();
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          clearStoredSession();
          setToken(null);
          setUser(null);
        }
      }
      setInitialLoading(false);
    };

    verifyToken();
  }, []);

  // Set automatic logout timer for remaining time within 7 days
  useEffect(() => {
    if (!token) return;
    const sessionStart = Number(localStorage.getItem('mindlab_session_start'));
    if (!sessionStart) return;

    const remaining = SEVEN_DAYS_MS - (Date.now() - sessionStart);
    if (remaining <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(() => {
      logout();
    }, remaining);

    return () => clearTimeout(timer);
  }, [token]);

  const saveAuthSession = useCallback((newToken, newUser) => {
    const now = Date.now();
    setToken(newToken);
    setUser(newUser);
    try {
      localStorage.setItem('mindlab_token', newToken);
      localStorage.setItem('mindlab_user', JSON.stringify(newUser));
      localStorage.setItem('mindlab_session_start', String(now));
      sessionStorage.setItem('mindlab_token', newToken);
      sessionStorage.setItem('mindlab_user', JSON.stringify(newUser));
      if (newUser?.role) {
        sessionStorage.setItem('mindlab_simulated_role', newUser.role);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const data = await authAPI.login({ email, password });
      saveAuthSession(data.token, data.user);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, [saveAuthSession]);

  const register = useCallback(async (name, email, password, dob) => {
    setIsLoading(true);
    try {
      const data = await authAPI.register({ name, email, password, dob });
      saveAuthSession(data.token, data.user);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, [saveAuthSession]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore network errors
    }
    setToken(null);
    setUser(null);
    clearStoredSession();
  }, []);

  const updateUserData = useCallback((updatedUser) => {
    setUser(updatedUser);
    try {
      localStorage.setItem('mindlab_user', JSON.stringify(updatedUser));
      sessionStorage.setItem('mindlab_user', JSON.stringify(updatedUser));
    } catch {
      // ignore
    }
  }, []);

  const value = {
    user,
    token,
    role: user?.role || 'user',
    isAdmin: user?.role === 'admin',
    isPsychiatrist: user?.role === 'psychiatrist',
    isDev: user?.role === 'dev',
    isAuthenticated: Boolean(token && user),
    isLoading,
    initialLoading,
    login,
    register,
    logout,
    saveAuthSession,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
