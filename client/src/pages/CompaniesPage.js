import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { FaPen, FaTrash } from 'react-icons/fa';
import { FaPlus } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
const emptyCompany = {
    type: 'company',
    name: '',
    address: '',
    phone: '',
    fax: '',
    taxId: '',
    branchName: '',
    branchNumber: '',
    billingDate: '',
    notificationDate: '',
    billingCycle: 'monthly',
    contacts: [],
};
const withBase = (path) => `${API_BASE_URL}${path}`;
export const CompaniesPage = () => {
    const { token, user, logout } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [formData, setFormData] = useState(emptyCompany);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [contacts, setContacts] = useState([]);
    const [showContactsModal, setShowContactsModal] = useState(false);
    const [activeCompany, setActiveCompany] = useState(null);
    const [selectedContactIds, setSelectedContactIds] = useState([]);
    const performLogout = () => {
        setCompanies([]);
        logout();
    };
    const handleUnauthorized = () => {
        setError('Session expired. Please log in again');
        performLogout();
    };
    const fetchCompanies = useCallback(async () => {
        if (!token)
            return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(withBase('/companies'), {
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
            setCompanies(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }, [token]);
    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);
    // fetch contacts list for use in adding contacts to a company
    const fetchContacts = useCallback(async () => {
        if (!token)
            return;
        try {
            const res = await fetch(withBase('/cruds'), { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setContacts(Array.isArray(data) ? data : []);
            }
        }
        catch (err) {
            console.error('Error fetching contacts:', err);
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
        setFormData(emptyCompany);
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
            type: formData.type,
            name: formData.name.trim(),
            address: formData.address?.trim() || undefined,
            phone: formData.phone?.trim() || undefined,
            fax: formData.fax?.trim() || undefined,
            taxId: formData.taxId?.trim() || undefined,
            billingDate: formData.billingDate?.trim() || undefined,
            notificationDate: formData.notificationDate?.trim() || undefined,
            billingCycle: formData.billingCycle || undefined,
        };
        // เพิ่ม branch fields เฉพาะเมื่อเป็น company
        if (formData.type === 'company') {
            payload.branchName = formData.branchName?.trim() || undefined;
            payload.branchNumber = formData.branchNumber?.trim() || undefined;
        }
        if (!payload.name) {
            setError('Please enter company name');
            setSubmitting(false);
            return;
        }
        try {
            const isEdit = Boolean(editingId);
            const response = await fetch(withBase(`/companies${isEdit ? `/${editingId}` : ''}`), {
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
                throw new Error('You do not have permission to edit this data');
            }
            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                const body = contentType.includes('application/json') ? await response.json() : await response.text();
                throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
            }
            const saved = (await response.json());
            if (isEdit) {
                setCompanies((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
            }
            else {
                setCompanies((prev) => [saved, ...prev]);
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
    const handleEdit = (company) => {
        setEditingId(company.id ?? null);
        setFormData({
            type: company.type || 'company',
            name: company.name,
            address: company.address || '',
            phone: company.phone || '',
            fax: company.fax || '',
            taxId: company.taxId || '',
            branchName: company.branchName || '',
            branchNumber: company.branchNumber || '',
            id: company.id,
        });
        setShowModal(true);
    };
    const handleDelete = async (id) => {
        if (!token || !id)
            return;
        const confirmed = window.confirm('Are you sure you want to delete this company?');
        if (!confirmed)
            return;
        try {
            const response = await fetch(withBase(`/companies/${id}`), {
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
                throw new Error('You do not have permission to delete this data');
            }
            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                const body = contentType.includes('application/json') ? await response.json() : await response.text();
                throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
            }
            setCompanies((prev) => prev.filter((item) => item.id !== id));
            if (editingId === id) {
                resetForm();
            }
        }
        catch (err) {
            setError(err.message);
        }
    };
    // Contacts modal handlers
    const closeContactsModal = () => {
        setShowContactsModal(false);
        setActiveCompany(null);
        setSelectedContactIds([]);
    };
    const toggleContactSelection = (contactId) => {
        setSelectedContactIds((prev) => {
            if (prev.includes(contactId))
                return prev.filter((id) => id !== contactId);
            return [...prev, contactId];
        });
    };
    const saveCompanyContacts = async () => {
        if (!activeCompany || !token)
            return;
        try {
            const res = await fetch(withBase(`/companies/${activeCompany.id}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ contacts: selectedContactIds }),
            });
            if (res.status === 401) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) {
                const contentType = res.headers.get('content-type') || '';
                const body = contentType.includes('application/json') ? await res.json() : await res.text();
                throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
            }
            const updated = await res.json();
            setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            closeContactsModal();
        }
        catch (err) {
            console.error('Error saving company contacts:', err);
            setError(err.message);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "container-fluid", children: [_jsx("div", { className: "d-sm-flex align-items-center justify-content-between mb-4", children: _jsx("h1", { className: "h3 mb-0 text-gray-800", children: "Companies" }) }), _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex justify-content-between align-items-center", children: [_jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Companies List" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-add me-2", onClick: openAddModal, children: "Add New Company" }), _jsx("button", { style: { color: '#ffff' }, className: "btn btn-sm btn-info shadow-sm", onClick: fetchCompanies, disabled: loading, children: loading ? 'Loading...' : 'Refresh' })] })] }), _jsxs("div", { className: "card-body", children: [error && _jsx("div", { className: "alert alert-danger", children: error }), companies.length === 0 && !loading ? (_jsx("p", { className: "text-center", children: "There is no company information yet. Try adding new information." })) : (_jsx("div", { className: "row gx-3 gy-4", children: companies
                                            .filter((company) => {
                                            if (searchTerm) {
                                                const searchLower = searchTerm.toLowerCase();
                                                const matchesSearch = company.name?.toLowerCase().includes(searchLower) ||
                                                    company.address?.toLowerCase().includes(searchLower);
                                                if (!matchesSearch)
                                                    return false;
                                            }
                                            if (filterType !== 'all' && company.type !== filterType)
                                                return false;
                                            return true;
                                        })
                                            .map((company) => {
                                            const canModify = user?.role === 'admin' ||
                                                user?.role === 'superadmin' ||
                                                company.ownerUserId === user?.userId;
                                            const relatedContacts = Array.isArray(company.contacts) ? company.contacts : [];
                                            return (_jsx("div", { className: "col-sm-6 col-md-4 col-lg-3", children: _jsxs("div", { className: "card h-100 shadow-sm", children: [_jsxs("div", { className: "card-body d-flex flex-column", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-3", children: [_jsxs("div", { children: [_jsx("h6", { className: "card-title mb-1", children: company.name }), _jsx("div", { className: "text-muted small", children: "Open deals amount" }), _jsx("div", { className: "h5 mt-1", children: "$0.00" })] }), _jsx("div", { children: _jsx("div", { style: { width: 48, height: 48, borderRadius: 8, background: '#f4f6f8' } }) })] }), _jsxs("div", { className: "mt-auto d-flex justify-content-between align-items-center", children: [_jsxs("div", { className: "d-flex align-items-center", children: [_jsxs("div", { style: { display: 'flex', gap: -8 }, children: [relatedContacts.slice(0, 4).map((cid, idx) => {
                                                                                            const c = contacts.find((x) => x.id === cid);
                                                                                            return (_jsx("img", { src: c?.avatarUrl || c?.photo || '/default-avatar.png', alt: c?.firstName || c?.email || 'contact', style: { width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', marginLeft: idx === 0 ? 0 : -8 } }, cid));
                                                                                        }), relatedContacts.length > 4 && (_jsxs("div", { className: "badge bg-secondary ms-2", children: ["+", relatedContacts.length - 4] }))] }), _jsx("div", { className: "small ms-2 text-muted", children: "Related contacts" })] }), _jsx("div", { className: "small text-muted", children: "Sales owner" })] })] }), _jsxs("div", { className: "card-footer d-flex justify-content-between", children: [_jsx("div", { children: _jsxs("button", { className: "btn btn-sm btn-outline-primary", onClick: () => { setActiveCompany(company); setSelectedContactIds(Array.isArray(company.contacts) ? company.contacts : []); setShowContactsModal(true); }, children: [_jsx(FaPlus, {}), " Add contacts"] }) }), _jsx("div", { children: canModify ? (_jsxs(_Fragment, { children: [_jsx("button", { className: "icon-btn edit me-2", onClick: () => handleEdit(company), title: "Edit", children: _jsx(FaPen, {}) }), _jsx("button", { className: "icon-btn delete", onClick: () => handleDelete(company.id), title: "Delete", children: _jsx(FaTrash, {}) })] })) : (_jsx("span", { className: "badge bg-secondary", children: "No Permission" })) })] })] }) }, company.id));
                                        }) }))] })] })] }), showModal && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: editingId ? 'Edit Company' : 'Add New Company' }), _jsx("button", { type: "button", className: "btn-close", onClick: closeModal })] }), _jsx("div", { className: "modal-body", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-12 mb-3", children: [_jsxs("label", { className: "form-label", children: ["Type ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { className: "form-select", value: formData.type, onChange: (e) => handleChange('type', e.target.value), required: true, children: [_jsx("option", { value: "company", children: "Company (\u0E19\u0E34\u0E15\u0E34\u0E1A\u0E38\u0E04\u0E04\u0E25)" }), _jsx("option", { value: "individual", children: "Individual (\u0E1A\u0E38\u0E04\u0E04\u0E25)" })] })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsxs("label", { className: "form-label", children: [formData.type === 'company' ? 'Company Name' : 'Name', " ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "text", className: "form-control", value: formData.name, onChange: (e) => handleChange('name', e.target.value), required: true })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("label", { className: "form-label", children: "Address" }), _jsx("textarea", { className: "form-control", value: formData.address || '', onChange: (e) => handleChange('address', e.target.value), rows: 3 })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Phone" }), _jsx("input", { type: "tel", className: "form-control", value: formData.phone || '', onChange: (e) => handleChange('phone', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Fax" }), _jsx("input", { type: "tel", className: "form-control", value: formData.fax || '', onChange: (e) => handleChange('fax', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Tax ID" }), _jsx("input", { type: "text", className: "form-control", value: formData.taxId || '', onChange: (e) => handleChange('taxId', e.target.value) })] }), formData.type === 'company' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Branch Name" }), _jsx("input", { type: "text", className: "form-control", value: formData.branchName || '', onChange: (e) => handleChange('branchName', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Branch Number" }), _jsx("input", { type: "text", className: "form-control", value: formData.branchNumber || '', onChange: (e) => handleChange('branchNumber', e.target.value) })] })] })), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("hr", {}), _jsx("h6", { className: "mb-3", children: "Billing Information" })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Billing Cycle" }), _jsxs("select", { className: "form-select", value: formData.billingCycle || 'monthly', onChange: (e) => handleChange('billingCycle', e.target.value), children: [_jsx("option", { value: "monthly", children: "Monthly" }), _jsx("option", { value: "quarterly", children: "Quarterly" }), _jsx("option", { value: "yearly", children: "Yearly" })] })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Billing Date (Day of month)" }), _jsx("input", { type: "number", className: "form-control", min: "1", max: "31", placeholder: "e.g., 5", value: formData.billingDate || '', onChange: (e) => handleChange('billingDate', e.target.value) }), _jsx("small", { className: "form-text text-muted", children: "Day of month to bill (1-31)" })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Notification Date (Day of month)" }), _jsx("input", { type: "number", className: "form-control", min: "1", max: "31", placeholder: "e.g., 1", value: formData.notificationDate || '', onChange: (e) => handleChange('notificationDate', e.target.value) }), _jsx("small", { className: "form-text text-muted", children: "Day to send notification (1-31)" })] })] }), error && _jsx("div", { className: "alert alert-danger", children: error }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { type: "submit", className: "btn btn-primary", disabled: submitting, children: submitting
                                                        ? 'Saving...'
                                                        : editingId
                                                            ? 'Save Changes'
                                                            : 'Add Company' }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: closeModal, disabled: submitting, children: "Cancel" })] })] }) })] }) }) })), showContactsModal && activeCompany && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: ["Add contacts to ", activeCompany.name] }), _jsx("button", { type: "button", className: "btn-close", onClick: closeContactsModal })] }), _jsxs("div", { className: "modal-body", children: [_jsx("div", { className: "mb-3", children: _jsx("input", { className: "form-control", placeholder: "Search contacts", onChange: (e) => { } }) }), _jsx("div", { style: { maxHeight: 360, overflow: 'auto' }, children: contacts.map((c) => (_jsxs("div", { className: "form-check d-flex align-items-center mb-2", children: [_jsx("input", { className: "form-check-input", type: "checkbox", checked: selectedContactIds.includes(c.id), onChange: () => toggleContactSelection(c.id), id: `contact_${c.id}` }), _jsxs("label", { className: "form-check-label ms-2", htmlFor: `contact_${c.id}`, children: [_jsx("img", { src: c.avatarUrl || c.photo || '/default-avatar.png', alt: c.firstName || c.email, style: { width: 28, height: 28, borderRadius: '50%', marginRight: 8 } }), c.firstName ? `${c.firstName} ${c.lastName || ''}` : c.email] })] }, c.id))) })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-primary", onClick: saveCompanyContacts, children: "Save" }), _jsx("button", { className: "btn btn-secondary", onClick: closeContactsModal, children: "Cancel" })] })] }) }) }))] }));
};
