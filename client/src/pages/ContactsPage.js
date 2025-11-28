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
    const { token, user, logout } = useAuth();
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
            if (response.status === 403) {
                throw new Error('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
            }
            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                const body = contentType.includes('application/json') ? await response.json() : await response.text();
                throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
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
            if (response.status === 403) {
                throw new Error('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้');
            }
            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                const body = contentType.includes('application/json') ? await response.json() : await response.text();
                throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
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
            if (response.status === 403) {
                throw new Error('คุณไม่มีสิทธิ์ลบข้อมูลนี้');
            }
            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                const body = contentType.includes('application/json') ? await response.json() : await response.text();
                throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
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
    return (_jsxs("div", { className: "container-fluid", children: [_jsxs("div", { className: "d-sm-flex align-items-center justify-content-between mb-4", children: [_jsx("h1", { className: "h3 mb-0 text-gray-800", children: "\u0E2A\u0E21\u0E38\u0E14\u0E23\u0E32\u0E22\u0E0A\u0E37\u0E48\u0E2D" }), _jsxs("button", { className: "btn btn-sm btn-secondary shadow-sm", onClick: performLogout, children: [_jsx("i", { className: "fas fa-sign-out-alt fa-sm text-white-50" }), " \u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A"] })] }), _jsxs("div", { className: "card shadow mb-4", children: [_jsx("div", { className: "card-header py-3", children: _jsx("h6", { className: "m-0 font-weight-bold text-primary", children: editingId ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่' }) }), _jsx("div", { className: "card-body", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E0A\u0E37\u0E48\u0E2D" }), _jsx("input", { type: "text", className: "form-control", value: formData.firstName, onChange: (e) => handleChange('firstName', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25" }), _jsx("input", { type: "text", className: "form-control", value: formData.lastName, onChange: (e) => handleChange('lastName', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23" }), _jsx("input", { type: "tel", className: "form-control", value: formData.phone, onChange: (e) => handleChange('phone', e.target.value) })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48" }), _jsx("textarea", { className: "form-control", value: formData.address, onChange: (e) => handleChange('address', e.target.value), rows: 3 })] })] }), error && _jsx("div", { className: "alert alert-danger", children: error }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { type: "submit", className: "btn btn-primary", disabled: submitting, children: submitting ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล' }), editingId && (_jsx("button", { type: "button", className: "btn btn-secondary", onClick: resetForm, children: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02" }))] })] }) })] }), _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex justify-content-between align-items-center", children: [_jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25" }), _jsx("button", { className: "btn btn-sm btn-info shadow-sm", onClick: fetchContacts, disabled: loading, children: loading ? 'กำลังโหลด...' : 'รีเฟรช' })] }), _jsx("div", { className: "card-body", children: contacts.length === 0 && !loading ? (_jsx("p", { className: "text-center", children: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 \u0E25\u0E2D\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48" })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-bordered", width: "100%", cellSpacing: 0, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25" }), _jsx("th", { children: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23" }), _jsx("th", { children: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48" }), _jsx("th", { children: "\u0E1C\u0E39\u0E49\u0E40\u0E1E\u0E34\u0E48\u0E21 (email)" }), _jsx("th", { children: "\u0E1C\u0E39\u0E49\u0E41\u0E01\u0E49\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14 (email)" }), _jsx("th", { children: "\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14" }), _jsx("th", { children: "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23" })] }) }), _jsx("tbody", { children: contacts.map((contact) => {
                                            const canModify = user?.role === 'admin' || user?.role === 'superadmin' || contact.userId === user?.userId;
                                            return (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("strong", { children: [contact.firstName, " ", contact.lastName] }) }), _jsx("td", { children: contact.phone }), _jsx("td", { children: contact.address }), _jsx("td", { children: contact.userEmail ?? '-' }), _jsx("td", { children: contact.updatedByEmail ?? '-' }), _jsx("td", { children: contact.updatedAt ? new Date(contact.updatedAt).toLocaleString() : '-' }), _jsx("td", { children: canModify ? (_jsxs("div", { className: "btn-group", children: [_jsx("button", { className: "btn btn-sm btn-warning", onClick: () => handleEdit(contact), children: "\u0E41\u0E01\u0E49\u0E44\u0E02" }), _jsx("button", { className: "btn btn-sm btn-danger", onClick: () => handleDelete(contact.id), children: "\u0E25\u0E1A" })] })) : (_jsx("span", { className: "badge bg-secondary", children: "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C" })) })] }, contact.id));
                                        }) })] }) })) })] })] }));
};
