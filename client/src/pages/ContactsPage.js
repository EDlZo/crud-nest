import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { FaPen, FaTrash } from 'react-icons/fa';
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
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const performLogout = () => {
        setContacts([]);
        logout();
    };
    const handleUnauthorized = () => {
        setError('Session expired. Please log in again');
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
                throw new Error('You do not have permission to access this resource');
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
    const openAddModal = () => {
        resetForm();
        setShowModal(true);
    };
    const closeModal = () => {
        setShowModal(false);
        resetForm();
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
            setError('Please fill out all fields');
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
                throw new Error('You do not have permission to edit this record');
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
            setShowModal(false);
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
        setShowModal(true);
    };
    const handleDelete = async (id) => {
        if (!token || !id)
            return;
        const confirmed = window.confirm('Are you sure you want to delete this record?');
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
                throw new Error('You do not have permission to delete this record');
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
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "container-fluid", children: [_jsx("div", { className: "d-sm-flex align-items-center justify-content-between mb-4", children: _jsx("h1", { className: "h3 mb-0 text-gray-800", children: "Contacts" }) }), _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex justify-content-between align-items-center", children: [_jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Contact List" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-primary me-2", onClick: openAddModal, children: "Add New Contect" }), _jsx("button", { style: { color: '#ffff' }, className: "btn btn-sm btn-info shadow-sm", onClick: fetchContacts, disabled: loading, children: loading ? 'Loading...' : 'Refresh' })] })] }), _jsx("div", { className: "card-body", children: contacts.length === 0 && !loading ? (_jsx("p", { className: "text-center", children: "No contacts yet. Try adding a new one." })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-bordered", width: "100%", cellSpacing: 0, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Phone" }), _jsx("th", { children: "Address" }), _jsx("th", { children: "Created By (email)" }), _jsx("th", { children: "Last Updated By (email)" }), _jsx("th", { children: "Last Updated" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: contacts.map((contact) => {
                                                    const canModify = user?.role === 'admin' || user?.role === 'superadmin' || contact.userId === user?.userId;
                                                    return (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("strong", { children: [contact.firstName, " ", contact.lastName] }) }), _jsx("td", { children: contact.phone }), _jsx("td", { children: contact.address }), _jsx("td", { children: contact.userEmail ?? '-' }), _jsx("td", { children: contact.updatedByEmail ?? '-' }), _jsx("td", { children: contact.updatedAt ? new Date(contact.updatedAt).toLocaleString() : '-' }), _jsx("td", { children: canModify ? (_jsxs("div", { className: "btn-group", children: [_jsx("button", { className: "icon-btn edit", "aria-label": "edit", title: "Edit", onClick: () => handleEdit(contact), children: _jsx(FaPen, {}) }), _jsx("button", { className: "icon-btn delete", "aria-label": "delete", title: "Delete", onClick: () => handleDelete(contact.id), children: _jsx(FaTrash, {}) })] })) : (_jsx("span", { className: "badge bg-secondary", children: "No permission" })) })] }, contact.id));
                                                }) })] }) })) })] })] }), showModal && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: editingId ? 'Edit Contact' : 'Add New Contact' }), _jsx("button", { type: "button", className: "btn-close", onClick: closeModal })] }), _jsx("div", { className: "modal-body", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "First Name" }), _jsx("input", { type: "text", className: "form-control", value: formData.firstName, onChange: (e) => handleChange('firstName', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Last Name" }), _jsx("input", { type: "text", className: "form-control", value: formData.lastName, onChange: (e) => handleChange('lastName', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Phone" }), _jsx("input", { type: "tel", className: "form-control", value: formData.phone, onChange: (e) => handleChange('phone', e.target.value) })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("label", { className: "form-label", children: "Address" }), _jsx("textarea", { className: "form-control", value: formData.address, onChange: (e) => handleChange('address', e.target.value), rows: 3 })] })] }), error && _jsx("div", { className: "alert alert-danger", children: error }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { type: "submit", className: "btn btn-primary", disabled: submitting, children: submitting ? 'Saving...' : editingId ? 'Save changes' : 'Add contact' }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: closeModal, disabled: submitting, children: "Cancel" })] })] }) })] }) }) }))] }));
};
