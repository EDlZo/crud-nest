import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo, useState, useEffect, } from 'react';
const AuthContext = createContext(undefined);
const TOKEN_KEY = 'crud-token';
export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    useEffect(() => {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        }
        else {
            localStorage.removeItem(TOKEN_KEY);
        }
    }, [token]);
    const login = (nextToken) => setToken(nextToken);
    const logout = () => setToken(null);
    const value = useMemo(() => ({ token, login, logout }), [token]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
};
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth ต้องถูกเรียกภายใน AuthProvider เท่านั้น');
    }
    return ctx;
};
