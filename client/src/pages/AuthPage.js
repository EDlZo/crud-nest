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
            setError('กรุณากรอกอีเมลและรหัสผ่าน');
            return;
        }
        if (mode === 'register' && formData.password !== formData.confirmPassword) {
            setError('รหัสผ่านยืนยันไม่ตรงกัน');
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
                const message = payload?.message ?? 'ไม่สามารถดำเนินการได้';
                throw new Error(Array.isArray(message) ? message[0] : message);
            }
            const data = payload;
            if (!data?.token) {
                throw new Error('ไม่พบ token จากเซิร์ฟเวอร์');
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
    return (_jsx("main", { className: "auth-container", children: _jsxs("section", { className: "card auth-card", children: [_jsx("h1", { children: mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก' }), _jsx("p", { className: "auth-description", children: mode === 'login'
                        ? 'กรอกอีเมลและรหัสผ่านเพื่อจัดการข้อมูลติดต่อ'
                        : 'สร้างบัญชีใหม่เพื่อเริ่มใช้งานสมุดรายชื่อ' }), _jsxs("form", { className: "form", onSubmit: handleSubmit, children: [_jsxs("label", { children: ["\u0E2D\u0E35\u0E40\u0E21\u0E25", _jsx("input", { type: "email", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }) })] }), _jsxs("label", { children: ["\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19", _jsx("input", { type: "password", value: formData.password, onChange: (e) => setFormData({ ...formData, password: e.target.value }) })] }), mode === 'register' && (_jsxs("label", { children: ["\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19", _jsx("input", { type: "password", value: formData.confirmPassword, onChange: (e) => setFormData({ ...formData, confirmPassword: e.target.value }) })] })), error && _jsx("p", { className: "error", children: error }), _jsx("button", { type: "submit", disabled: submitting, children: submitting
                                ? 'กำลังดำเนินการ...'
                                : mode === 'login'
                                    ? 'เข้าสู่ระบบ'
                                    : 'สมัครสมาชิก' })] }), _jsx("p", { className: "auth-toggle", children: mode === 'login' ? (_jsxs(_Fragment, { children: ["\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1A\u0E31\u0E0D\u0E0A\u0E35? ", _jsx(Link, { to: "/register", children: "\u0E2A\u0E21\u0E31\u0E04\u0E23\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01" })] })) : (_jsxs(_Fragment, { children: ["\u0E21\u0E35\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E41\u0E25\u0E49\u0E27? ", _jsx(Link, { to: "/login", children: "\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A" })] })) })] }) }));
};
