import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { FaPen, FaTrash } from 'react-icons/fa';
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
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "container-fluid", children: [_jsx("div", { className: "d-sm-flex align-items-center justify-content-between mb-4", children: _jsx("h1", { className: "h3 mb-0 text-gray-800", children: "Companies" }) }), _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex justify-content-between align-items-center", children: [_jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Companies List" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-add me-2", onClick: openAddModal, children: "Add New Company" }), _jsx("button", { style: { color: '#ffff' }, className: "btn btn-sm btn-info shadow-sm", onClick: fetchCompanies, disabled: loading, children: loading ? 'Loading...' : 'Refresh' })] })] }), _jsxs("div", { className: "card-body", children: [error && _jsx("div", { className: "alert alert-danger", children: error }), companies.length === 0 && !loading ? (_jsx("p", { className: "text-center", children: "There is no company information yet. Try adding new information." })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-bordered", width: "100%", cellSpacing: 0, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Type" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "Address" }), _jsx("th", { children: "Phone" }), _jsx("th", { children: "Tax ID" }), _jsx("th", { children: "Branch" }), _jsx("th", { children: "Billing Cycle" }), _jsx("th", { children: "Billing Date" }), _jsx("th", { children: "Notification Date" }), _jsx("th", { children: "Created By" }), _jsx("th", { children: "Last Updated" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: companies
                                                        .filter((company) => {
                                                        // Search filter
                                                        if (searchTerm) {
                                                            const searchLower = searchTerm.toLowerCase();
                                                            const matchesSearch = company.name?.toLowerCase().includes(searchLower) ||
                                                                company.address?.toLowerCase().includes(searchLower) ||
                                                                company.phone?.toLowerCase().includes(searchLower) ||
                                                                company.taxId?.toLowerCase().includes(searchLower);
                                                            if (!matchesSearch)
                                                                return false;
                                                        }
                                                        // Type filter
                                                        if (filterType !== 'all' && company.type !== filterType) {
                                                            return false;
                                                        }
                                                        return true;
                                                    })
                                                        .map((company) => {
                                                        const canModify = user?.role === 'admin' ||
                                                            user?.role === 'superadmin' ||
                                                            company.ownerUserId === user?.userId;
                                                        const getBillingCycleLabel = (cycle) => {
                                                            switch (cycle) {
                                                                case 'monthly': return 'Monthly';
                                                                case 'yearly': return 'Yearly';
                                                                case 'quarterly': return 'Quarterly';
                                                                default: return '-';
                                                            }
                                                        };
                                                        return (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: `badge ${company.type === 'company' ? 'bg-primary' : 'bg-info'}`, children: company.type === 'company' ? 'Company' : 'Individual' }) }), _jsx("td", { children: _jsx("strong", { children: company.name }) }), _jsx("td", { children: company.address || '-' }), _jsx("td", { children: company.phone || '-' }), _jsx("td", { children: company.taxId || '-' }), _jsx("td", { children: company.type === 'company'
                                                                        ? `${company.branchName || '-'}${company.branchNumber ? ` (${company.branchNumber})` : ''}`
                                                                        : '-' }), _jsx("td", { children: getBillingCycleLabel(company.billingCycle) }), _jsx("td", { children: company.billingDate ? `Day ${company.billingDate}` : '-' }), _jsx("td", { children: company.notificationDate ? `Day ${company.notificationDate}` : '-' }), _jsx("td", { children: company.ownerEmail || '-' }), _jsx("td", { children: company.updatedAt
                                                                        ? new Date(company.updatedAt).toLocaleString('th-TH')
                                                                        : '-' }), _jsx("td", { children: canModify ? (_jsxs("div", { className: "btn-group", children: [_jsx("button", { className: "icon-btn edit", "aria-label": "edit", title: "Edit", onClick: () => handleEdit(company), children: _jsx(FaPen, {}) }), _jsx("button", { className: "icon-btn delete", "aria-label": "delete", title: "Delete", onClick: () => handleDelete(company.id), children: _jsx(FaTrash, {}) })] })) : (_jsx("span", { className: "badge bg-secondary", children: "No Permission" })) })] }, company.id));
                                                    }) })] }) }))] })] })] }), showModal && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: editingId ? 'Edit Company' : 'Add New Company' }), _jsx("button", { type: "button", className: "btn-close", onClick: closeModal })] }), _jsx("div", { className: "modal-body", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-12 mb-3", children: [_jsxs("label", { className: "form-label", children: ["Type ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { className: "form-select", value: formData.type, onChange: (e) => handleChange('type', e.target.value), required: true, children: [_jsx("option", { value: "company", children: "Company (\u0E19\u0E34\u0E15\u0E34\u0E1A\u0E38\u0E04\u0E04\u0E25)" }), _jsx("option", { value: "individual", children: "Individual (\u0E1A\u0E38\u0E04\u0E04\u0E25)" })] })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsxs("label", { className: "form-label", children: [formData.type === 'company' ? 'Company Name' : 'Name', " ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "text", className: "form-control", value: formData.name, onChange: (e) => handleChange('name', e.target.value), required: true })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("label", { className: "form-label", children: "Address" }), _jsx("textarea", { className: "form-control", value: formData.address || '', onChange: (e) => handleChange('address', e.target.value), rows: 3 })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Phone" }), _jsx("input", { type: "tel", className: "form-control", value: formData.phone || '', onChange: (e) => handleChange('phone', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Fax" }), _jsx("input", { type: "tel", className: "form-control", value: formData.fax || '', onChange: (e) => handleChange('fax', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Tax ID" }), _jsx("input", { type: "text", className: "form-control", value: formData.taxId || '', onChange: (e) => handleChange('taxId', e.target.value) })] }), formData.type === 'company' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Branch Name" }), _jsx("input", { type: "text", className: "form-control", value: formData.branchName || '', onChange: (e) => handleChange('branchName', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Branch Number" }), _jsx("input", { type: "text", className: "form-control", value: formData.branchNumber || '', onChange: (e) => handleChange('branchNumber', e.target.value) })] })] })), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("hr", {}), _jsx("h6", { className: "mb-3", children: "Billing Information" })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Billing Cycle" }), _jsxs("select", { className: "form-select", value: formData.billingCycle || 'monthly', onChange: (e) => handleChange('billingCycle', e.target.value), children: [_jsx("option", { value: "monthly", children: "Monthly" }), _jsx("option", { value: "quarterly", children: "Quarterly" }), _jsx("option", { value: "yearly", children: "Yearly" })] })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Billing Date (Day of month)" }), _jsx("input", { type: "number", className: "form-control", min: "1", max: "31", placeholder: "e.g., 5", value: formData.billingDate || '', onChange: (e) => handleChange('billingDate', e.target.value) }), _jsx("small", { className: "form-text text-muted", children: "Day of month to bill (1-31)" })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Notification Date (Day of month)" }), _jsx("input", { type: "number", className: "form-control", min: "1", max: "31", placeholder: "e.g., 1", value: formData.notificationDate || '', onChange: (e) => handleChange('notificationDate', e.target.value) }), _jsx("small", { className: "form-text text-muted", children: "Day to send notification (1-31)" })] })] }), error && _jsx("div", { className: "alert alert-danger", children: error }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { type: "submit", className: "btn btn-primary", disabled: submitting, children: submitting
                                                        ? 'Saving...'
                                                        : editingId
                                                            ? 'Save Changes'
                                                            : 'Add Company' }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: closeModal, disabled: submitting, children: "Cancel" })] })] }) })] }) }) }))] }));
};
