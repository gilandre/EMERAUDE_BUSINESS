"use client";

import { useCallback, useState } from "react";

export function useAuth() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  const login = useCallback(async (_email: string, _password: string) => {
    // À implémenter
    setUser({ id: "1", email: _email });
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
  }, []);

  return { user, login, logout, isAuthenticated: !!user };
}
