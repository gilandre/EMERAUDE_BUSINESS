import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken, setToken, clearToken, getStoredUser, setStoredUser } from '../api/client';

interface User {
  id: string;
  email: string;
  name?: string;
  nom?: string;
  prenom?: string;
  permissions: string[];
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      setTokenState(t);
      if (t) {
        const u = await getStoredUser();
        setUser(u as User | null);
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await setToken(newToken);
    await setStoredUser(newUser);
    setTokenState(newToken);
    setUser(newUser);
    setIsLoading(false);
  };

  const logout = async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
