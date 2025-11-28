import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
const withBase = (path) => `${API_BASE_URL}${path}`;
export const AuthPage = ({ mode }) => {
    const navigate = useNavigate();
    const { login, token } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (token) {
            navigate('/');
        }
    }, [token, navigate]);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        if (!formData.email || !formData.password) {
            setError('Please enter email and password');
            return;
        }
        if (mode === 'register' && formData.password !== formData.confirmPassword) {
            setError('Password confirmation does not match');
            return;
        }
        setSubmitting(true);
        try {
            const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
            const response = await fetch(withBase(endpoint), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email.trim(),
                    password: formData.password,
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                const message = payload?.message ?? 'Unable to complete request';
                throw new Error(Array.isArray(message) ? message[0] : message);
            }
            const data = payload;
            if (!data?.token) {
                throw new Error('No token received from server');
            }
            login(data.token);
            navigate('/');
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsx("main", { className: "auth-container", children: _jsxs("section", { className: "card auth-card", children: [_jsx("h1", { children: mode === 'login' ? 'Login' : 'Register' }), _jsx("p", { className: "auth-description", children: mode === 'login'
                        ? 'Enter your email and password to manage contacts'
                        : 'Create a new account to start using the contact book' }), _jsxs("form", { className: "form", onSubmit: handleSubmit, children: [_jsxs("label", { children: ["Email", _jsx("input", { type: "email", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }) })] }), _jsxs("label", { children: ["Password", _jsx("input", { type: "password", value: formData.password, onChange: (e) => setFormData({ ...formData, password: e.target.value }) })] }), mode === 'register' && (_jsxs("label", { children: ["Confirm Password", _jsx("input", { type: "password", value: formData.confirmPassword, onChange: (e) => setFormData({ ...formData, confirmPassword: e.target.value }) })] })), error && _jsx("p", { className: "error", children: error }), _jsx("button", { type: "submit", disabled: submitting, children: submitting
                                ? 'Submitting...'
                                : mode === 'login'
                                    ? 'Login'
                                    : 'Register' })] }), _jsx("p", { className: "auth-toggle", children: mode === 'login' ? (_jsxs(_Fragment, { children: ["No account? ", _jsx(Link, { to: "/register", children: "Register" })] })) : (_jsxs(_Fragment, { children: ["Already have an account? ", _jsx(Link, { to: "/login", children: "Login" })] })) })] }) }));
};
