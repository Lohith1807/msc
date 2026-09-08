import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const DEMO_ACCOUNTS = {
  admin: {
    id: 'demo-admin-id',
    name: 'MindLab Administrator',
    email: 'lohithreddy1819@gmail.com',
    role: 'admin',
  },
  psychiatrist: {
    id: 'demo-psych-id',
    name: 'Dr. Sarah Jenkins',
    email: 'lohithreddy18april@gmail.com',
    role: 'psychiatrist',
  },
  user: {
    id: 'demo-user-id',
    name: 'Alex Chen',
    email: 'lohithreddy18k@gmail.com',
    role: 'user',
  },
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('mindlab_token') || 'demo_token_admin';
  });

  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('mindlab_user');
      return stored ? JSON.parse(stored) : DEMO_ACCOUNTS.admin;
    } catch {
      return DEMO_ACCOUNTS.admin;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Validate existing token on mount and sync user directly from database
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = sessionStorage.getItem('mindlab_token') || 'demo_token_admin';
      try {
        const res = await authAPI.getMe(storedToken);
        if (res.success && res.user) {
          setUser(res.user);
          sessionStorage.setItem('mindlab_user', JSON.stringify(res.user));
          if (!sessionStorage.getItem('mindlab_token')) {
            sessionStorage.setItem('mindlab_token', storedToken);
          }
        }
      } catch (err) {
        console.warn('Session sync with DB:', err.message);
      }
      setInitialLoading(false);
    };

    verifyToken();
  }, []);

  const saveAuthSession = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    try {
      sessionStorage.setItem('mindlab_token', newToken);
      sessionStorage.setItem('mindlab_user', JSON.stringify(newUser));
      if (newUser?.role) {
        sessionStorage.setItem('mindlab_simulated_role', newUser.role);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  const switchRole = useCallback(async (targetRole) => {
    const fallback = DEMO_ACCOUNTS[targetRole] || DEMO_ACCOUNTS.user;
    const token = `demo_token_${targetRole}`;
    try {
      const res = await authAPI.getMe(token);
      if (res.success && res.user) {
        saveAuthSession(token, res.user);
        return;
      }
    } catch (e) {
      // fallback
    }
    saveAuthSession(token, fallback);
  }, [saveAuthSession]);

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

  const register = useCallback(async (name, email, password) => {
    setIsLoading(true);
    try {
      const data = await authAPI.register({ name, email, password });
      saveAuthSession(data.token, data.user);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, [saveAuthSession]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      // ignore network errors
    }
    setToken(null);
    setUser(null);
    try {
      sessionStorage.removeItem('mindlab_token');
      sessionStorage.removeItem('mindlab_user');
      sessionStorage.removeItem('mindlab_simulated_role');
    } catch {
      // ignore
    }
  }, []);

  const updateUserData = useCallback((updatedUser) => {
    setUser(updatedUser);
    try {
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
    isAuthenticated: Boolean(token && user),
    isLoading,
    initialLoading,
    login,
    register,
    logout,
    switchRole,
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
