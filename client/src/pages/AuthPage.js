import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaUser, FaUserCircle } from 'react-icons/fa';
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
        firstName: '',
        lastName: '',
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
                    ...(mode === 'register' && {
                        firstName: formData.firstName.trim(),
                        lastName: formData.lastName.trim(),
                    }),
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
    return (_jsxs("main", { className: "auth-container", children: [_jsx("div", { className: "auth-background-decoration" }), _jsxs("section", { className: "card auth-card", children: [_jsxs("div", { className: "auth-header", children: [_jsx("div", { className: "auth-icon-wrapper", children: _jsx(FaUserCircle, { className: "auth-icon" }) }), _jsx("h1", { children: mode === 'login' ? 'Welcome' : 'Create Account' }), _jsx("p", { className: "auth-description", children: mode === 'login'
                                    ? 'Sign in to manage your data'
                                    : 'Fill in your information to create a new account' })] }), _jsxs("form", { className: "form", onSubmit: handleSubmit, children: [mode === 'register' && (_jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsxs("label", { children: [_jsx(FaUser, { className: "input-icon" }), "First Name"] }), _jsx("input", { type: "text", placeholder: "Enter your first name", value: formData.firstName, onChange: (e) => setFormData({ ...formData, firstName: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { children: [_jsx(FaUser, { className: "input-icon" }), "Last Name"] }), _jsx("input", { type: "text", placeholder: "Enter your last name", value: formData.lastName, onChange: (e) => setFormData({ ...formData, lastName: e.target.value }) })] })] })), _jsxs("div", { className: "form-group", children: [_jsxs("label", { children: [_jsx(FaEnvelope, { className: "input-icon" }), "Email"] }), _jsx("input", { type: "email", placeholder: "example@email.com", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { children: [_jsx(FaLock, { className: "input-icon" }), "Password"] }), _jsx("input", { type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: formData.password, onChange: (e) => setFormData({ ...formData, password: e.target.value }) })] }), mode === 'register' && (_jsxs("div", { className: "form-group", children: [_jsxs("label", { children: [_jsx(FaLock, { className: "input-icon" }), "Confirm Password"] }), _jsx("input", { type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: formData.confirmPassword, onChange: (e) => setFormData({ ...formData, confirmPassword: e.target.value }) })] })), error && (_jsxs("div", { className: "error-message", children: [_jsx("span", { className: "error-icon", children: "\u26A0" }), _jsx("span", { children: error })] })), _jsx("button", { type: "submit", className: "auth-submit-btn", disabled: submitting, children: submitting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner" }), _jsx("span", { children: "Processing..." })] })) : (_jsx("span", { children: mode === 'login' ? 'Sign In' : 'Register' })) })] }), _jsx("div", { className: "auth-divider", children: _jsx("span", {}) }), _jsx("p", { className: "auth-toggle", children: mode === 'login' ? (_jsxs(_Fragment, { children: ["Don't have an account? ", _jsx(Link, { to: "/register", children: "Register" })] })) : (_jsxs(_Fragment, { children: ["Already have an account? ", _jsx(Link, { to: "/login", children: "Sign In" })] })) })] })] }));
};
