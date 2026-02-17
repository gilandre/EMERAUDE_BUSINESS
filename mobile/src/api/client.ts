import * as SecureStore from 'expo-secure-store';

// API unifiée Next.js sur port 3000
// Émulateur Android AVD: 10.0.2.2 redirige vers localhost de la machine hôte
// Appareil physique: utiliser l'IP locale du PC via EXPO_PUBLIC_API_URL
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function getStoredUser(): Promise<object | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setStoredUser(user: object): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

// In-memory cache with TTL for GET requests
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30_000; // 30 seconds

export function clearApiCache(): void {
  cache.clear();
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();

  // Cache only GET requests
  if (method === 'GET') {
    const cached = cache.get(path);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T;
    }
  }

  const token = await getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as { error?: string }).error || `Erreur serveur (${res.status})`;
    throw new Error(msg);
  }

  // Cache GET responses
  if (method === 'GET') {
    cache.set(path, { data, timestamp: Date.now() });
  } else {
    // Invalidate cache on mutations
    cache.clear();
  }

  return data as T;
}

export function setApiBase(url: string): void {
  (global as unknown as { __API_BASE__: string }).__API_BASE__ = url;
}
