import {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { fetchProfile } from '../utils/fetchProfile';

export type AuthUser = {
  userId: string;
  email: string;
  role?: 'admin' | 'superadmin';
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  login: (token: string) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = 'crud-token';

const decodeToken = (jwt: string | null): AuthUser | null => {
  if (!jwt) return null;
  try {
    const [, payload] = jwt.split('.');
    if (!payload) return null;
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { sub?: string; email?: string; role?: string };
    if (typeof decoded.sub === 'string' && typeof decoded.email === 'string') {
      return { userId: decoded.sub, email: decoded.email, role: decoded.role as any };
    }
    return null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isMounted = true;
    const updateUser = async () => {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        // fetch profile from API for avatarUrl
        const profile = await fetchProfile(token);
        if (isMounted) {
          setUser(profile || decodeToken(token));
        }
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      }
    };
    updateUser();
    return () => { isMounted = false; };
  }, [token]);

  const login = (nextToken: string) => setToken(nextToken);
  const logout = () => setToken(null);

  const value = useMemo(() => ({ token, user, login, logout, setUser }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

