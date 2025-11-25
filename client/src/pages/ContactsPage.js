import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
const emptyContact = {
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
};
const withBase = (path) => `${API_BASE_URL}${path}`;
export const ContactsPage = () => {
    const { token, logout } = useAuth();
    const [contacts, setContacts] = useState([]);
    const [formData, setFormData] = useState(emptyContact);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const performLogout = () => {
        setContacts([]);
        logout();
    };
    const handleUnauthorized = () => {
        setError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
        performLogout();
    };
    const fetchContacts = useCallback(async () => {
        if (!token)
            return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(withBase('/cruds'), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            if (!response.ok) {
                throw new Error('โหลดข้อมูลไม่สำเร็จ');
            }
            const data = await response.json();
            setContacts(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }, [token]);
    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);
    const handleChange = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };
    const resetForm = () => {
        setEditingId(null);
        setFormData(emptyContact);
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!token)
            return;
        setSubmitting(true);
        setError(null);
        const payload = {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
        };
        if (!payload.firstName || !payload.lastName || !payload.phone || !payload.address) {
            setError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
            setSubmitting(false);
            return;
        }
        try {
            const isEdit = Boolean(editingId);
            const response = await fetch(withBase(`/cruds${isEdit ? `/${editingId}` : ''}`), {
                method: isEdit ? 'PATCH' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            if (!response.ok) {
                throw new Error('บันทึกข้อมูลไม่สำเร็จ');
            }
            const saved = (await response.json());
            if (isEdit) {
                setContacts((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
            }
            else {
                setContacts((prev) => [saved, ...prev]);
            }
            resetForm();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleEdit = (contact) => {
        setEditingId(contact.id ?? null);
        setFormData({
            firstName: contact.firstName,
            lastName: contact.lastName,
            phone: contact.phone,
            address: contact.address,
            id: contact.id,
        });
    };
    const handleDelete = async (id) => {
        if (!token || !id)
            return;
        const confirmed = window.confirm('ยืนยันการลบข้อมูลนี้หรือไม่?');
        if (!confirmed)
            return;
        try {
            const response = await fetch(withBase(`/cruds/${id}`), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            if (!response.ok) {
                throw new Error('ลบข้อมูลไม่สำเร็จ');
            }
            setContacts((prev) => prev.filter((item) => item.id !== id));
            if (editingId === id) {
                resetForm();
            }
        }
        catch (err) {
            setError(err.message);
        }
    };
    return (_jsxs("main", { className: "app", children: [_jsxs("header", { className: "app__header", children: [_jsxs("div", { children: [_jsx("h1", { children: "\u0E2A\u0E21\u0E38\u0E14\u0E23\u0E32\u0E22\u0E0A\u0E37\u0E48\u0E2D" }), _jsx("p", { children: "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E43\u0E19\u0E17\u0E35\u0E48\u0E40\u0E14\u0E35\u0E22\u0E27" })] }), _jsx("button", { className: "secondary logout-btn", onClick: performLogout, children: "\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A" })] }), _jsxs("section", { className: "card", children: [_jsx("h2", { children: editingId ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่' }), _jsxs("form", { onSubmit: handleSubmit, className: "form", children: [_jsxs("div", { className: "grid", children: [_jsxs("label", { children: ["\u0E0A\u0E37\u0E48\u0E2D", _jsx("input", { type: "text", value: formData.firstName, onChange: (e) => handleChange('firstName', e.target.value) })] }), _jsxs("label", { children: ["\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25", _jsx("input", { type: "text", value: formData.lastName, onChange: (e) => handleChange('lastName', e.target.value) })] }), _jsxs("label", { children: ["\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23", _jsx("input", { type: "tel", value: formData.phone, onChange: (e) => handleChange('phone', e.target.value) })] }), _jsxs("label", { className: "full", children: ["\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48", _jsx("textarea", { value: formData.address, onChange: (e) => handleChange('address', e.target.value), rows: 3 })] })] }), error && _jsx("p", { className: "error", children: error }), _jsxs("div", { className: "actions", children: [_jsx("button", { type: "submit", disabled: submitting, children: submitting ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล' }), editingId && (_jsx("button", { type: "button", className: "secondary", onClick: resetForm, children: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02" }))] })] })] }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "list-header", children: [_jsx("h2", { children: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25" }), _jsx("button", { className: "secondary", onClick: fetchContacts, disabled: loading, children: loading ? 'กำลังโหลด...' : 'รีเฟรช' })] }), contacts.length === 0 && !loading ? (_jsx("p", { children: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 \u0E25\u0E2D\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48" })) : (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25" }), _jsx("th", { children: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23" }), _jsx("th", { children: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48" }), _jsx("th", { children: "\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14" }), _jsx("th", {})] }) }), _jsx("tbody", { children: contacts.map((contact) => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("strong", { children: [contact.firstName, " ", contact.lastName] }) }), _jsx("td", { children: contact.phone }), _jsx("td", { children: contact.address }), _jsx("td", { children: contact.updatedAt ? new Date(contact.updatedAt).toLocaleString() : '-' }), _jsxs("td", { className: "actions-cell", children: [_jsx("button", { onClick: () => handleEdit(contact), children: "\u0E41\u0E01\u0E49\u0E44\u0E02" }), _jsx("button", { className: "danger", onClick: () => handleDelete(contact.id), children: "\u0E25\u0E1A" })] })] }, contact.id))) })] }) }))] })] }));
};
