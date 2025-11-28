import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo, useState, useEffect, } from 'react';
const AuthContext = createContext(undefined);
const TOKEN_KEY = 'crud-token';
const decodeToken = (jwt) => {
    if (!jwt)
        return null;
    try {
        const [, payload] = jwt.split('.');
        if (!payload)
            return null;
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        if (typeof decoded.sub === 'string' && typeof decoded.email === 'string') {
            return { userId: decoded.sub, email: decoded.email, role: decoded.role };
        }
        return null;
    }
    catch {
        return null;
    }
};
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(() => decodeToken(localStorage.getItem(TOKEN_KEY)));
    useEffect(() => {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        }
        else {
            localStorage.removeItem(TOKEN_KEY);
        }
        setUser(decodeToken(token));
    }, [token]);
    const login = (nextToken) => setToken(nextToken);
    const logout = () => setToken(null);
    const value = useMemo(() => ({ token, user, login, logout }), [token, user]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
};
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth ต้องถูกเรียกภายใน AuthProvider เท่านั้น');
    }
    return ctx;
};
