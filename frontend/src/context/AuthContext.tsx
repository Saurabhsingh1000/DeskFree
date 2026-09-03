import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { authApi } from '../api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('deskfree_token');
    const storedUser = localStorage.getItem('deskfree_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as User);
      } catch {
        localStorage.removeItem('deskfree_token');
        localStorage.removeItem('deskfree_user');
      }
    }
    setIsLoading(false);
  }, []);

  const persist = useCallback((t: string, u: User) => {
    setToken(t);
    setUser(u);
    localStorage.setItem('deskfree_token', t);
    localStorage.setItem('deskfree_user', JSON.stringify(u));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token: t, user: u } = await authApi.login({ email, password });
    persist(t, u);
  }, [persist]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const { token: t, user: u } = await authApi.signup({ name, email, password });
    persist(t, u);
  }, [persist]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('deskfree_token');
    localStorage.removeItem('deskfree_user');
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, signup, logout, isAdmin: user?.role === 'ADMIN' }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
