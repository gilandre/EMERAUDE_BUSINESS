import React, { createContext, useContext, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { getToken, setToken, clearToken, getStoredUser, setStoredUser, API_BASE } from '../api/client';

const BIOMETRIC_CREDS_KEY = 'biometric_credentials';

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
  hasBiometricCredentials: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  saveBiometricCredentials: (email: string, password: string) => Promise<void>;
  loginWithBiometrics: () => Promise<boolean>;
  checkBiometricAvailability: () => Promise<{ available: boolean; type: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      setTokenState(t);
      if (t) {
        const u = await getStoredUser();
        setUser(u as User | null);
      }
      // Check if biometric credentials are stored
      const creds = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY);
      setHasBiometricCredentials(!!creds);
      setIsLoading(false);
    })();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await setToken(newToken);
    await setStoredUser(newUser);
    setTokenState(newToken);
    setUser(newUser as User);
    setIsLoading(false);
  };

  const logout = async () => {
    await clearToken();
    setTokenState(null);
    setUser(null);
  };

  const saveBiometricCredentials = async (email: string, password: string) => {
    await SecureStore.setItemAsync(
      BIOMETRIC_CREDS_KEY,
      JSON.stringify({ email, password })
    );
    setHasBiometricCredentials(true);
  };

  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return { available: false, type: 'none' };

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { available: false, type: 'none' };

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    let type = 'Biométrie';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      type = 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      type = 'Empreinte digitale';
    }

    return { available: true, type };
  };

  const loginWithBiometrics = async (): Promise<boolean> => {
    const credsRaw = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY);
    if (!credsRaw) return false;

    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouillez pour vous connecter',
      cancelLabel: 'Annuler',
      disableDeviceFallback: false,
      fallbackLabel: 'Utiliser le code PIN',
    });

    if (!authResult.success) return false;

    const { email, password } = JSON.parse(credsRaw);

    try {
      const res = await fetch(`${API_BASE}/api/auth/mobile/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.token || !data.user) return false;

      await login(data.token, data.user);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isAuthenticated: !!token && !!user,
        hasBiometricCredentials,
        login,
        logout,
        saveBiometricCredentials,
        loginWithBiometrics,
        checkBiometricAvailability,
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
