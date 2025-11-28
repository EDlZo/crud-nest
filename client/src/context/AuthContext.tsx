import {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
  useEffect,
} from 'react';

type AuthUser = {
  userId: string;
  email: string;
  role?: 'admin' | 'superadmin';
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  login: (token: string) => void;
  logout: () => void;
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
  const [user, setUser] = useState<AuthUser | null>(() => decodeToken(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setUser(decodeToken(token));
  }, [token]);

  const login = (nextToken: string) => setToken(nextToken);
  const logout = () => setToken(null);

  const value = useMemo(() => ({ token, user, login, logout }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

