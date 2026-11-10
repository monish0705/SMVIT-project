import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, setAuthToken, clearAuthToken, getAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  switchDemoRole: (targetRole: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string; title: string }> = {
  admin: {
    email: 'admin@civicpulse.ai',
    pass: 'Admin@CivicPulse2026!',
    title: 'Dr. Monish Kumar (Admin)'
  },
  operator: {
    email: 'operator@civicpulse.ai',
    pass: 'Operator@CivicPulse2026!',
    title: 'Priya Sharma (Operator)'
  },
  field_inspector: {
    email: 'inspector.kumar@bbmp.gov.in',
    pass: 'Inspector@CivicPulse2026!',
    title: 'Ramesh Babu (BBMP Inspector)'
  },
  citizen: {
    email: 'citizen@gmail.com',
    pass: 'Citizen@CivicPulse2026!',
    title: 'Sunita Rao (Citizen)'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api.getMe()
        .then(u => setUser(u))
        .catch(() => {
          clearAuthToken();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      // Auto-login as Operator for seamless demo evaluation
      switchDemoRole('operator').finally(() => setIsLoading(false));
    }
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass);
      setAuthToken(res.access_token);
      const profile = await api.getMe();
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoRole = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const creds = DEMO_CREDENTIALS[targetRole];
      const res = await api.login(creds.email, creds.pass);
      setAuthToken(res.access_token);
      const profile = await api.getMe();
      setUser(profile);
    } catch (err) {
      console.error('Role switch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'citizen',
        isAuthenticated: !!user,
        isLoading,
        login,
        switchDemoRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

