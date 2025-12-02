import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { FaPen, FaTrash, FaDollarSign, FaEye, FaClock } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
const emptyDeal = {
    title: '',
    description: '',
    stage: 'lead',
    amount: 0,
    currency: 'THB',
    probability: 0,
};
const withBase = (path) => `${API_BASE_URL}${path}`;
const STAGES = [
    { value: 'lead', label: 'Lead', color: 'bg-secondary' },
    { value: 'qualified', label: 'Qualified', color: 'bg-info' },
    { value: 'proposal', label: 'Proposal', color: 'bg-primary' },
    { value: 'negotiation', label: 'Negotiation', color: 'bg-warning' },
    { value: 'won', label: 'Won', color: 'bg-success' },
    { value: 'lost', label: 'Lost', color: 'bg-danger' },
];
export const DealsPage = () => {
    const { token, user, logout } = useAuth();
    const [deals, setDeals] = useState([]);
    const [formData, setFormData] = useState(emptyDeal);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [filterStage, setFilterStage] = useState('all');
    const [companies, setCompanies] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [users, setUsers] = useState([]);
    const [viewingDeal, setViewingDeal] = useState(null);
    const [relatedContact, setRelatedContact] = useState(null);
    const [relatedCompany, setRelatedCompany] = useState(null);
    const [showRelatedModal, setShowRelatedModal] = useState(false);
    const performLogout = () => {
        setDeals([]);
        logout();
    };
    const handleUnauthorized = () => {
        setError('Session expired. Please log in again');
        performLogout();
    };
    const fetchDeals = useCallback(async () => {
        if (!token)
            return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filterStage !== 'all')
                params.append('stage', filterStage);
            const response = await fetch(withBase(`/deals?${params.toString()}`), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 401) {
                handleUnauthorized();
                return;
            }
            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const body = await response.json();
                    throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
                }
                else {
                    const text = await response.text();
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }
            }
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response. Please check if backend is running.');
            }
            const data = await response.json();
            setDeals(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }, [token, filterStage]);
    useEffect(() => {
        fetchDeals();
    }, [fetchDeals]);
    const handleChange = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };
    const resetForm = () => {
        setEditingId(null);
        setFormData(emptyDeal);
    };
    const fetchCompaniesAndContacts = async () => {
        if (!token)
            return;
        try {
            const [companiesRes, contactsRes, usersRes] = await Promise.all([
                fetch(withBase('/companies'), {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(withBase('/cruds'), {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(withBase('/auth/users/list'), {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            if (companiesRes.ok) {
                const data = await companiesRes.json();
                setCompanies(Array.isArray(data) ? data : []);
            }
            if (contactsRes.ok) {
                const data = await contactsRes.json();
                setContacts(Array.isArray(data) ? data : []);
            }
            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(Array.isArray(data) ? data : []);
            }
        }
        catch (err) {
            console.error('Error fetching companies/contacts/users:', err);
        }
    };
    const openAddModal = () => {
        resetForm();
        setShowModal(true);
        fetchCompaniesAndContacts();
    };
    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };
    const handleEdit = (deal) => {
        setFormData(deal);
        setEditingId(deal.id || null);
        setShowModal(true);
        fetchCompaniesAndContacts();
    };
    const fetchRelatedData = async (relatedTo, relatedId) => {
        if (!token || !relatedTo || !relatedId)
            return;
        try {
            if (relatedTo === 'contact') {
                const response = await fetch(withBase('/cruds'), { headers: { Authorization: `Bearer ${token}` } });
                if (response.ok) {
                    const allContacts = await response.json();
                    const contact = Array.isArray(allContacts) ? allContacts.find((c) => c.id === relatedId) : null;
                    setRelatedContact(contact);
                }
            }
            else if (relatedTo === 'company') {
                const response = await fetch(withBase('/companies'), { headers: { Authorization: `Bearer ${token}` } });
                if (response.ok) {
                    const allCompanies = await response.json();
                    const company = Array.isArray(allCompanies) ? allCompanies.find((c) => c.id === relatedId) : null;
                    setRelatedCompany(company);
                }
            }
        }
        catch (err) {
            console.error('Error fetching related data:', err);
        }
    };
    const handleViewDeal = (deal) => {
        setViewingDeal(deal);
        setRelatedContact(null);
        setRelatedCompany(null);
        if (deal.relatedTo && deal.relatedId) {
            fetchRelatedData(deal.relatedTo, deal.relatedId);
        }
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!token)
            return;
        setSubmitting(true);
        setError(null);
        const payload = {
            title: formData.title.trim(),
            description: formData.description?.trim() || undefined,
            stage: formData.stage,
            amount: formData.amount ? Number(formData.amount) : undefined,
            currency: formData.currency || 'THB',
            probability: formData.probability ? Number(formData.probability) : undefined,
            expectedCloseDate: formData.expectedCloseDate || undefined,
            relatedTo: formData.relatedTo || undefined,
            relatedId: formData.relatedId || undefined,
            assignedTo: formData.assignedTo || undefined,
        };
        if (!payload.title) {
            setError('Please enter deal title');
            setSubmitting(false);
            return;
        }
        try {
            const isEdit = Boolean(editingId);
            const response = await fetch(withBase(`/deals${isEdit ? `/${editingId}` : ''}`), {
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
                const contentType = response.headers.get('content-type') || '';
                const body = contentType.includes('application/json') ? await response.json() : await response.text();
                throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
            }
            await fetchDeals();
            closeModal();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleDelete = async (id) => {
        if (!id || !token)
            return;
        if (!confirm('Are you sure you want to delete this deal?'))
            return;
        try {
            const response = await fetch(withBase(`/deals/${id}`), {
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
                const contentType = response.headers.get('content-type') || '';
                const body = contentType.includes('application/json') ? await response.json() : await response.text();
                throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
            }
            setDeals((prev) => prev.filter((item) => item.id !== id));
            if (editingId === id) {
                resetForm();
            }
        }
        catch (err) {
            setError(err.message);
        }
    };
    const getStageInfo = (stage) => {
        return STAGES.find(s => s.value === stage) || STAGES[0];
    };
    const totalValue = deals
        .filter(d => d.stage !== 'lost')
        .reduce((sum, deal) => sum + (deal.amount || 0), 0);
    const wonValue = deals
        .filter(d => d.stage === 'won')
        .reduce((sum, deal) => sum + (deal.amount || 0), 0);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "container-fluid", children: [_jsx("div", { className: "d-sm-flex align-items-center justify-content-between mb-4", children: _jsx("h1", { className: "h3 mb-0 text-gray-800", children: "Deals Pipeline" }) }), _jsxs("div", { className: "row mb-4", children: [_jsx("div", { className: "col-xl-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-left-primary shadow h-100 py-2", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row no-gutters align-items-center", children: [_jsxs("div", { className: "col mr-2", children: [_jsx("div", { className: "text-xs font-weight-bold text-primary text-uppercase mb-1", children: "Total Pipeline Value" }), _jsx("div", { className: "h5 mb-0 font-weight-bold text-gray-800", children: new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(totalValue) })] }), _jsx("div", { className: "col-auto", children: _jsx(FaDollarSign, { className: "fa-2x text-gray-300" }) })] }) }) }) }), _jsx("div", { className: "col-xl-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-left-success shadow h-100 py-2", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row no-gutters align-items-center", children: [_jsxs("div", { className: "col mr-2", children: [_jsx("div", { className: "text-xs font-weight-bold text-success text-uppercase mb-1", children: "Won Deals" }), _jsx("div", { className: "h5 mb-0 font-weight-bold text-gray-800", children: new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(wonValue) })] }), _jsx("div", { className: "col-auto", children: _jsx(FaDollarSign, { className: "fa-2x text-gray-300" }) })] }) }) }) }), _jsx("div", { className: "col-xl-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-left-info shadow h-100 py-2", children: _jsx("div", { className: "card-body", children: _jsx("div", { className: "row no-gutters align-items-center", children: _jsxs("div", { className: "col mr-2", children: [_jsx("div", { className: "text-xs font-weight-bold text-info text-uppercase mb-1", children: "Total Deals" }), _jsx("div", { className: "h5 mb-0 font-weight-bold text-gray-800", children: deals.length })] }) }) }) }) }), _jsx("div", { className: "col-xl-3 col-md-6 mb-4", children: _jsx("div", { className: "card border-left-warning shadow h-100 py-2", children: _jsx("div", { className: "card-body", children: _jsx("div", { className: "row no-gutters align-items-center", children: _jsxs("div", { className: "col mr-2", children: [_jsx("div", { className: "text-xs font-weight-bold text-warning text-uppercase mb-1", children: "Win Rate" }), _jsxs("div", { className: "h5 mb-0 font-weight-bold text-gray-800", children: [deals.length > 0
                                                                ? Math.round((deals.filter(d => d.stage === 'won').length / deals.length) * 100)
                                                                : 0, "%"] })] }) }) }) }) })] }), _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex justify-content-between align-items-center", children: [_jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Deals List" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-add me-2", onClick: openAddModal, children: "Add New Deal" }), _jsx("button", { className: "btn btn-sm btn-info shadow-sm", onClick: fetchDeals, disabled: loading, children: loading ? 'Loading...' : 'Refresh' })] })] }), _jsxs("div", { className: "card-body", children: [_jsx("div", { className: "row mb-3", children: _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "Filter by Stage" }), _jsxs("select", { className: "form-select form-select-sm", value: filterStage, onChange: (e) => setFilterStage(e.target.value), children: [_jsx("option", { value: "all", children: "All Stages" }), STAGES.map(stage => (_jsx("option", { value: stage.value, children: stage.label }, stage.value)))] })] }) }), error && _jsx("div", { className: "alert alert-danger", children: error }), deals.length === 0 && !loading ? (_jsx("p", { className: "text-center", children: "No deals found. Try adding new deals." })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-bordered", width: "100%", cellSpacing: 0, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Title" }), _jsx("th", { children: "Stage" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Probability" }), _jsx("th", { children: "Expected Close" }), _jsx("th", { children: "Assigned To" }), _jsx("th", { children: "Created" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: deals.map((deal) => {
                                                        const canModify = user?.role === 'admin' ||
                                                            user?.role === 'superadmin' ||
                                                            deal.assignedTo === user?.userId;
                                                        const stageInfo = getStageInfo(deal.stage);
                                                        return (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx("strong", { children: deal.title }), deal.description && (_jsxs("div", { className: "small text-muted", children: [deal.description.substring(0, 50), "..."] }))] }), _jsx("td", { children: _jsx("span", { className: `badge ${stageInfo.color}`, children: stageInfo.label }) }), _jsx("td", { children: deal.amount
                                                                        ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: deal.currency || 'THB' }).format(deal.amount)
                                                                        : '-' }), _jsx("td", { children: deal.probability ? `${deal.probability}%` : '-' }), _jsx("td", { children: deal.expectedCloseDate
                                                                        ? new Date(deal.expectedCloseDate).toLocaleDateString()
                                                                        : '-' }), _jsx("td", { children: deal.assignedToEmail || '-' }), _jsx("td", { children: deal.createdAt
                                                                        ? new Date(deal.createdAt).toLocaleDateString()
                                                                        : '-' }), _jsx("td", { children: canModify ? (_jsxs("div", { className: "btn-group", children: [_jsx("button", { className: "icon-btn view", "aria-label": "view", title: "View Details", onClick: () => handleViewDeal(deal), children: _jsx(FaEye, {}) }), _jsx("button", { className: "icon-btn edit", "aria-label": "edit", title: "Edit", onClick: () => handleEdit(deal), children: _jsx(FaPen, {}) }), _jsx("button", { className: "icon-btn delete", "aria-label": "delete", title: "Delete", onClick: () => handleDelete(deal.id), children: _jsx(FaTrash, {}) })] })) : (_jsx("span", { className: "badge bg-secondary", children: "No Permission" })) })] }, deal.id));
                                                    }) })] }) }))] })] })] }), showModal && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: editingId ? 'Edit Deal' : 'Add New Deal' }), _jsx("button", { type: "button", className: "btn-close", onClick: closeModal })] }), _jsx("div", { className: "modal-body", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-12 mb-3", children: [_jsxs("label", { className: "form-label", children: ["Title ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "text", className: "form-control", value: formData.title, onChange: (e) => handleChange('title', e.target.value), required: true })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("label", { className: "form-label", children: "Description" }), _jsx("textarea", { className: "form-control", value: formData.description || '', onChange: (e) => handleChange('description', e.target.value), rows: 3 })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsxs("label", { className: "form-label", children: ["Stage ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("select", { className: "form-select", value: formData.stage, onChange: (e) => handleChange('stage', e.target.value), required: true, children: STAGES.map(stage => (_jsx("option", { value: stage.value, children: stage.label }, stage.value))) })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Amount" }), _jsx("input", { type: "number", className: "form-control", value: formData.amount || '', onChange: (e) => handleChange('amount', e.target.value ? Number(e.target.value) : 0), min: "0", step: "0.01" })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Currency" }), _jsxs("select", { className: "form-select", value: formData.currency || 'THB', onChange: (e) => handleChange('currency', e.target.value), children: [_jsx("option", { value: "THB", children: "THB" }), _jsx("option", { value: "USD", children: "USD" }), _jsx("option", { value: "EUR", children: "EUR" })] })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Probability (%)" }), _jsx("input", { type: "number", className: "form-control", value: formData.probability || '', onChange: (e) => handleChange('probability', e.target.value ? Number(e.target.value) : 0), min: "0", max: "100" })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Expected Close Date" }), _jsx("input", { type: "date", className: "form-control", value: formData.expectedCloseDate || '', onChange: (e) => handleChange('expectedCloseDate', e.target.value) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Related To" }), _jsxs("select", { className: "form-select", value: formData.relatedTo || '', onChange: (e) => {
                                                                handleChange('relatedTo', e.target.value);
                                                                handleChange('relatedId', ''); // Reset ID when changing type
                                                            }, children: [_jsx("option", { value: "", children: "None" }), _jsx("option", { value: "company", children: "Company" }), _jsx("option", { value: "contact", children: "Contact" })] })] }), formData.relatedTo === 'company' && (_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Select Company" }), _jsxs("select", { className: "form-select", value: formData.relatedId || '', onChange: (e) => handleChange('relatedId', e.target.value), children: [_jsx("option", { value: "", children: "-- Select Company --" }), companies.map((company) => (_jsxs("option", { value: company.id, children: [company.name, " ", company.type === 'individual' ? '(Individual)' : '(Company)'] }, company.id)))] })] })), formData.relatedTo === 'contact' && (_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Select Contact" }), _jsxs("select", { className: "form-select", value: formData.relatedId || '', onChange: (e) => handleChange('relatedId', e.target.value), children: [_jsx("option", { value: "", children: "-- Select Contact --" }), contacts.map((contact) => (_jsxs("option", { value: contact.id, children: [contact.firstName, " ", contact.lastName] }, contact.id)))] })] })), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Assigned To" }), _jsxs("select", { className: "form-select", value: formData.assignedTo || '', onChange: (e) => handleChange('assignedTo', e.target.value), children: [_jsx("option", { value: "", children: "-- Select User --" }), users.map((userItem) => (_jsxs("option", { value: userItem.id || userItem.userId, children: [userItem.email, " ", userItem.firstName || userItem.lastName ? `(${userItem.firstName || ''} ${userItem.lastName || ''})`.trim() : ''] }, userItem.id || userItem.userId)))] })] })] }), error && _jsx("div", { className: "alert alert-danger", children: error }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { type: "submit", className: "btn btn-primary", disabled: submitting, children: submitting
                                                        ? 'Saving...'
                                                        : editingId
                                                            ? 'Save Changes'
                                                            : 'Add Deal' }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: closeModal, disabled: submitting, children: "Cancel" })] })] }) })] }) }) })), viewingDeal && (_jsx("div", { className: "modal show d-block", style: {
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    animation: 'fadeIn 0.2s ease-in'
                }, onClick: (e) => { if (e.target === e.currentTarget)
                    setViewingDeal(null); }, children: _jsx("div", { className: "modal-dialog modal-lg", style: { marginTop: '5vh' }, children: _jsxs("div", { className: "modal-content", style: {
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                            animation: 'slideUp 0.25s ease-out'
                        }, children: [_jsxs("div", { className: "modal-header", style: {
                                    background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)',
                                    color: 'white',
                                    borderRadius: '12px 12px 0 0',
                                    padding: '1rem 1.25rem',
                                    border: 'none'
                                }, children: [_jsxs("h5", { className: "modal-title", style: { display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }, children: [_jsx(FaEye, {}), "Deal Details"] }), _jsx("button", { type: "button", className: "btn-close btn-close-white", onClick: () => setViewingDeal(null), style: { opacity: 0.95 } })] }), _jsxs("div", { className: "modal-body", style: { padding: '1.5rem' }, children: [_jsxs("div", { className: "mb-4", children: [_jsx("h4", { style: { color: '#333', fontWeight: 600, marginBottom: '0.5rem' }, children: viewingDeal.title }), viewingDeal.description && (_jsxs("div", { className: "mb-3 p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #0d6efd' }, children: [_jsx("strong", { style: { color: '#0d6efd', display: 'block', marginBottom: '0.5rem' }, children: "Description" }), _jsx("p", { style: { margin: 0, whiteSpace: 'pre-wrap', color: '#555' }, children: viewingDeal.description })] }))] }), _jsxs("div", { className: "row g-3 mb-3", children: [_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3 h-100", style: { backgroundColor: '#fff', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }, children: "Stage" }), _jsx("div", { children: _jsx("span", { className: `badge ${getStageInfo(viewingDeal.stage).color} px-3 py-2`, children: getStageInfo(viewingDeal.stage).label }) })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3 h-100", style: { backgroundColor: '#fff', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }, children: "Amount / Probability" }), _jsxs("div", { style: { display: 'flex', gap: '1rem', alignItems: 'center' }, children: [_jsx("div", { style: { fontWeight: 600 }, children: viewingDeal.amount ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: viewingDeal.currency || 'THB' }).format(viewingDeal.amount) : '-' }), _jsx("div", { className: "badge bg-info", style: { padding: '0.5rem 0.75rem' }, children: viewingDeal.probability ? `${viewingDeal.probability}%` : '-' })] })] }) })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3 h-100", style: { backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }, children: [_jsxs("div", { className: "d-flex align-items-center mb-2", children: [_jsx(FaClock, { className: "text-warning me-2" }), _jsx("strong", { style: { color: '#856404' }, children: "Expected Close" })] }), _jsx("p", { style: { margin: 0, color: '#856404', fontWeight: 500 }, children: viewingDeal.expectedCloseDate ? new Date(viewingDeal.expectedCloseDate).toLocaleDateString() : '-' })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3 h-100", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Assigned To" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.95rem' }, children: (() => {
                                                                const assignedUser = users.find(u => (u.id || u.userId) === viewingDeal.assignedTo);
                                                                if (assignedUser) {
                                                                    const name = `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim();
                                                                    return name || assignedUser.email || viewingDeal.assignedToEmail || '-';
                                                                }
                                                                return viewingDeal.assignedToEmail || '-';
                                                            })() })] }) })] }), viewingDeal.relatedTo && viewingDeal.relatedId && (_jsxs("div", { className: "mb-4 p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #0d6efd' }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsxs("strong", { style: { color: '#0d6efd', textTransform: 'capitalize' }, children: ["Related To: ", viewingDeal.relatedTo] }), (viewingDeal.relatedTo === 'contact' && relatedContact) || (viewingDeal.relatedTo === 'company' && relatedCompany) ? (_jsxs("button", { className: "btn btn-sm btn-link p-0", onClick: () => setShowRelatedModal(true), style: { color: '#0d6efd', textDecoration: 'none', display: 'flex', alignItems: 'center' }, title: "View Details", children: [_jsx(FaEye, { style: { marginRight: '0.375rem', fontSize: '0.9rem' } }), _jsx("span", { children: "View Details" })] })) : null] }), _jsx("p", { style: { margin: 0, color: '#0d6efd', fontWeight: 500 }, children: viewingDeal.relatedTo === 'contact' && relatedContact ? (_jsxs("span", { children: [relatedContact.firstName, " ", relatedContact.lastName, relatedContact.phone ? ` - ${relatedContact.phone}` : ''] })) : viewingDeal.relatedTo === 'company' && relatedCompany ? (_jsxs("span", { children: [relatedCompany.name, relatedCompany.type ? ` (${relatedCompany.type})` : ''] })) : (_jsx("span", { style: { color: '#666' }, children: viewingDeal.relatedId })) })] })), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Created At" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.95rem' }, children: viewingDeal.createdAt ? new Date(viewingDeal.createdAt).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-' })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Last Updated" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.95rem' }, children: viewingDeal.updatedAt ? new Date(viewingDeal.updatedAt).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-' })] }) })] })] }), _jsxs("div", { className: "modal-footer", style: { padding: '1rem', borderTop: '1px solid #e9ecef' }, children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => setViewingDeal(null), children: "Close" }), ((user?.role === 'admin') || (user?.role === 'superadmin') || (viewingDeal.assignedTo === user?.userId)) && (_jsxs("button", { type: "button", className: "btn btn-primary", onClick: () => { setViewingDeal(null); handleEdit(viewingDeal); }, style: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsx(FaPen, {}), "Edit"] }))] })] }) }) })), showRelatedModal && (relatedContact || relatedCompany) && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }, onClick: (e) => { if (e.target === e.currentTarget)
                    setShowRelatedModal(false); }, children: _jsx("div", { className: "modal-dialog modal-lg", style: { marginTop: '5vh' }, children: _jsxs("div", { className: "modal-content", style: { borderRadius: '12px', border: 'none', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }, children: [_jsxs("div", { className: "modal-header", style: { background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)', color: 'white', borderRadius: '12px 12px 0 0', padding: '1rem', border: 'none' }, children: [_jsx("h5", { className: "modal-title", style: { margin: 0 }, children: relatedContact ? 'Contact Details' : 'Company Details' }), _jsx("button", { type: "button", className: "btn-close btn-close-white", onClick: () => setShowRelatedModal(false), style: { opacity: 0.9 } })] }), _jsx("div", { className: "modal-body", style: { padding: '1.5rem' }, children: relatedContact ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-4", children: _jsxs("h4", { style: { color: '#333', fontWeight: 600, marginBottom: '0.5rem' }, children: [relatedContact.firstName, " ", relatedContact.lastName] }) }), _jsxs("div", { className: "row g-3", children: [relatedContact.phone && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', display: 'block', marginBottom: '0.25rem' }, children: "Phone" }), _jsx("p", { style: { margin: 0 }, children: relatedContact.phone })] }) })), relatedContact.address && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', display: 'block', marginBottom: '0.25rem' }, children: "Address" }), _jsx("p", { style: { margin: 0 }, children: relatedContact.address })] }) }))] })] })) : relatedCompany ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-4", children: [_jsx("h4", { style: { color: '#333', fontWeight: 600, marginBottom: '0.5rem' }, children: relatedCompany.name }), relatedCompany.type && (_jsx("span", { className: `badge ${relatedCompany.type === 'company' ? 'bg-primary' : 'bg-secondary'} px-3 py-2`, style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }, children: relatedCompany.type === 'company' ? 'Company' : 'Individual' }))] }), _jsxs("div", { className: "mb-3", children: [_jsx("h6", { style: { color: '#667eea', fontWeight: '600', marginBottom: '1rem' }, children: "Basic Information" }), _jsxs("div", { className: "row g-3", children: [relatedCompany.address && (_jsx("div", { className: "col-md-12", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Address" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.address })] }) })), relatedCompany.phone && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Phone" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.phone })] }) })), relatedCompany.fax && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Fax" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.fax })] }) })), relatedCompany.taxId && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Tax ID" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.taxId })] }) }))] })] }), relatedCompany.type === 'company' && (relatedCompany.branchName || relatedCompany.branchNumber) && (_jsxs("div", { className: "mb-3", children: [_jsx("h6", { style: { color: '#667eea', fontWeight: '600', marginBottom: '1rem' }, children: "Branch Information" }), _jsxs("div", { className: "row g-3", children: [relatedCompany.branchName && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Branch Name" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.branchName })] }) })), relatedCompany.branchNumber && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Branch Number" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.branchNumber })] }) }))] })] })), (relatedCompany.billingCycle || relatedCompany.billingDate || relatedCompany.notificationDate) && (_jsxs("div", { className: "mb-3", children: [_jsx("h6", { style: { color: '#667eea', fontWeight: '600', marginBottom: '1rem' }, children: "Billing Information" }), _jsxs("div", { className: "row g-3", children: [relatedCompany.billingCycle && (_jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }, children: [_jsx("strong", { style: { color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Billing Cycle" }), _jsx("p", { style: { margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: 500, textTransform: 'capitalize' }, children: relatedCompany.billingCycle })] }) })), relatedCompany.billingDate && (_jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }, children: [_jsx("strong", { style: { color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Billing Date" }), _jsxs("p", { style: { margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: 500 }, children: ["Day ", relatedCompany.billingDate, " of month"] })] }) })), relatedCompany.notificationDate && (_jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }, children: [_jsx("strong", { style: { color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Notification Date" }), _jsxs("p", { style: { margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: 500 }, children: ["Day ", relatedCompany.notificationDate, " of month"] })] }) }))] })] }))] })) : null }), _jsx("div", { className: "modal-footer", style: { padding: '1rem', borderTop: '1px solid #e9ecef' }, children: _jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => setShowRelatedModal(false), children: "Close" }) })] }) }) })), _jsx("style", { children: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      ` })] }));
};
