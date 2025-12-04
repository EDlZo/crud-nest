import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { FaPen, FaTrash } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
const emptyContact = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    photo: '',
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
    const [searchTerm, setSearchTerm] = useState('');
    const [photoPreview, setPhotoPreview] = useState('');
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
        setPhotoPreview('');
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
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            photo: formData.photo || '',
        };
        if (!payload.firstName || !payload.lastName || !payload.email || !payload.phone || !payload.address) {
            setError('Please fill out all fields');
            setSubmitting(false);
            return;
        }
        console.log('Submitting payload:', { ...payload, photo: payload.photo ? `[base64 ${payload.photo.length} chars]` : 'empty' });
        // If photo is present, check approximate size to avoid exceeding server body limits
        if (payload.photo) {
            // base64 string like 'data:image/jpeg;base64,/9j/...' -> estimate bytes from length
            const base64data = payload.photo.split(',')[1] ?? payload.photo;
            const approxBytes = Math.ceil((base64data.length * 3) / 4);
            const approxKB = Math.round(approxBytes / 1024);
            console.log(`Photo approx size: ${approxKB} KB`);
            const MAX_KB = 300; // client-side limit to avoid large payloads
            if (approxKB > MAX_KB) {
                const proceed = window.confirm(`The selected photo is large (~${approxKB} KB). Sending it may fail. Continue without photo? (OK = yes, Cancel = keep photo)`);
                if (proceed) {
                    delete payload.photo;
                    setPhotoPreview('');
                }
            }
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
            console.log('Response status:', response.status);
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
                console.error('Error response:', body);
                throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
            }
            const saved = (await response.json());
            console.log('Saved contact:', saved);
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
            console.error('Submit error:', err);
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
            email: contact.email,
            phone: contact.phone,
            address: contact.address,
            photo: contact.photo,
            id: contact.id,
        });
        setPhotoPreview(contact.photo || '');
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
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "container-fluid", children: [_jsx("div", { className: "d-sm-flex align-items-center justify-content-between mb-4", children: _jsx("h1", { className: "h3 mb-0 text-gray-800", children: "Contacts" }) }), _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex justify-content-between align-items-center", children: [_jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Contact List" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-add me-2", onClick: openAddModal, children: "Add New Contect" }), _jsx("button", { style: { color: '#ffff' }, className: "btn btn-sm btn-info shadow-sm", onClick: fetchContacts, disabled: loading, children: loading ? 'Loading...' : 'Refresh' })] })] }), _jsxs("div", { className: "card-body", children: [_jsx("div", { className: "row mb-3", children: _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Search" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Search by name, phone, address...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value) })] }) }), contacts.length === 0 && !loading ? (_jsx("p", { className: "text-center", children: "No contacts yet. Try adding a new one." })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-bordered", width: "100%", cellSpacing: 0, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Phone" }), _jsx("th", { children: "Address" }), _jsx("th", { children: "Created By (email)" }), _jsx("th", { children: "Last Updated By (email)" }), _jsx("th", { children: "Last Updated" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: contacts
                                                        .filter((contact) => {
                                                        if (!searchTerm)
                                                            return true;
                                                        const searchLower = searchTerm.toLowerCase();
                                                        return (`${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchLower) ||
                                                            contact.phone?.toLowerCase().includes(searchLower) ||
                                                            contact.address?.toLowerCase().includes(searchLower));
                                                    })
                                                        .map((contact) => {
                                                        const canModify = user?.role === 'admin' || user?.role === 'superadmin' || contact.userId === user?.userId;
                                                        return (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("strong", { children: [contact.firstName, " ", contact.lastName] }) }), _jsx("td", { children: contact.phone }), _jsx("td", { children: contact.address }), _jsx("td", { children: contact.userEmail ?? '-' }), _jsx("td", { children: contact.updatedByEmail ?? '-' }), _jsx("td", { children: contact.updatedAt ? new Date(contact.updatedAt).toLocaleString() : '-' }), _jsx("td", { children: canModify ? (_jsxs("div", { className: "btn-group", children: [_jsx("button", { className: "icon-btn edit", "aria-label": "edit", title: "Edit", onClick: () => handleEdit(contact), children: _jsx(FaPen, {}) }), _jsx("button", { className: "icon-btn delete", "aria-label": "delete", title: "Delete", onClick: () => handleDelete(contact.id), children: _jsx(FaTrash, {}) })] })) : (_jsx("span", { className: "badge bg-secondary", children: "No permission" })) })] }, contact.id));
                                                    }) })] }) }))] })] })] }), showModal && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: editingId ? 'Edit Contact' : 'Add New Contact' }), _jsx("button", { type: "button", className: "btn-close", onClick: closeModal })] }), _jsx("div", { className: "modal-body", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-12 mb-4 text-center", children: [_jsx("label", { className: "form-label d-block", children: "Profile Photo" }), _jsx("div", { className: "mb-3", children: _jsx("img", { src: photoPreview || '/default-avatar.png', alt: "Preview", className: "rounded-circle", style: { width: 100, height: 100, objectFit: 'cover', border: '2px solid #ddd' } }) }), _jsx("input", { type: "file", className: "form-control", accept: "image/*", onChange: (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    // Compress and convert to base64
                                                                    const reader = new FileReader();
                                                                    reader.onload = (event) => {
                                                                        const img = new Image();
                                                                        img.onload = () => {
                                                                            // Create canvas to resize image
                                                                            const canvas = document.createElement('canvas');
                                                                            const MAX_WIDTH = 400;
                                                                            const MAX_HEIGHT = 400;
                                                                            let width = img.width;
                                                                            let height = img.height;
                                                                            // Calculate new dimensions
                                                                            if (width > height) {
                                                                                if (width > MAX_WIDTH) {
                                                                                    height *= MAX_WIDTH / width;
                                                                                    width = MAX_WIDTH;
                                                                                }
                                                                            }
                                                                            else {
                                                                                if (height > MAX_HEIGHT) {
                                                                                    width *= MAX_HEIGHT / height;
                                                                                    height = MAX_HEIGHT;
                                                                                }
                                                                            }
                                                                            canvas.width = width;
                                                                            canvas.height = height;
                                                                            const ctx = canvas.getContext('2d');
                                                                            ctx?.drawImage(img, 0, 0, width, height);
                                                                            // Convert to base64 with compression
                                                                            const base64String = canvas.toDataURL('image/jpeg', 0.7);
                                                                            handleChange('photo', base64String);
                                                                            setPhotoPreview(base64String);
                                                                        };
                                                                        img.src = event.target?.result;
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            } }), _jsx("small", { className: "text-muted", children: "Upload a photo from your device (JPG, PNG, etc.)" })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "First Name" }), _jsx("input", { type: "text", className: "form-control", value: formData.firstName, onChange: (e) => handleChange('firstName', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Last Name" }), _jsx("input", { type: "text", className: "form-control", value: formData.lastName, onChange: (e) => handleChange('lastName', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Email" }), _jsx("input", { type: "email", className: "form-control", value: formData.email, onChange: (e) => handleChange('email', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Phone" }), _jsx("input", { type: "tel", className: "form-control", value: formData.phone, onChange: (e) => handleChange('phone', e.target.value) })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("label", { className: "form-label", children: "Address" }), _jsx("textarea", { className: "form-control", value: formData.address, onChange: (e) => handleChange('address', e.target.value), rows: 3 })] })] }), error && _jsx("div", { className: "alert alert-danger", children: error }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { type: "submit", className: "btn btn-primary", disabled: submitting, children: submitting ? 'Saving...' : editingId ? 'Save changes' : 'Add contact' }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: closeModal, disabled: submitting, children: "Cancel" })] })] }) })] }) }) }))] }));
};
