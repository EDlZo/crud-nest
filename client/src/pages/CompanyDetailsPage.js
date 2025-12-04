import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEnvelope, FaPhone, FaExternalLinkAlt, FaPen } from 'react-icons/fa';
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
export const CompanyDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [company, setCompany] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Inline Editing State
    const [editingField, setEditingField] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);
    // Contacts Modal State
    const [allContacts, setAllContacts] = useState([]);
    const [showContactsModal, setShowContactsModal] = useState(false);
    const [selectedContactIds, setSelectedContactIds] = useState([]);
    // Custom Popup State
    const [showPopup, setShowPopup] = useState(false);
    const [popupContent, setPopupContent] = useState({ title: '', message: '' });
    const fetchCompanyAndContacts = useCallback(async () => {
        if (!token || !id)
            return;
        setLoading(true);
        setError(null);
        try {
            // Fetch Company Details
            const companyRes = await fetch(withBase(`/companies/${id}`), {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!companyRes.ok) {
                throw new Error('Failed to fetch company details');
            }
            const companyData = await companyRes.json();
            setCompany(companyData);
            // Fetch All Contacts (to filter by company's contact IDs)
            // Note: In a real app with many contacts, we should have an endpoint to fetch contacts by company ID.
            // For now, we follow the pattern in CompaniesPage.
            const contactsRes = await fetch(withBase('/cruds'), {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (contactsRes.ok) {
                const allContactsData = await contactsRes.json();
                setAllContacts(Array.isArray(allContactsData) ? allContactsData : []);
                if (Array.isArray(allContactsData) && Array.isArray(companyData.contacts)) {
                    const companyContacts = allContactsData.filter((c) => companyData.contacts.includes(c.id));
                    setContacts(companyContacts);
                }
            }
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }, [token, id]);
    useEffect(() => {
        fetchCompanyAndContacts();
    }, [fetchCompanyAndContacts]);
    // Inline editing handlers
    const startEditing = (field, currentValue) => {
        setEditingField(field);
        setEditValue(currentValue || '');
    };
    const cancelEditing = () => {
        setEditingField(null);
        setEditValue('');
    };
    const saveField = async (field) => {
        if (!token || !company?.id)
            return;
        setSaving(true);
        setError(null);
        try {
            const response = await fetch(withBase(`/companies/${company.id}`), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ [field]: editValue.trim() || undefined }),
            });
            if (!response.ok) {
                throw new Error('Failed to update company');
            }
            const saved = await response.json();
            setCompany(saved);
            cancelEditing();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSaving(false);
        }
    };
    // Contacts modal handlers
    const openContactsModal = () => {
        setSelectedContactIds(Array.isArray(company?.contacts) ? company.contacts : []);
        setShowContactsModal(true);
    };
    const closeContactsModal = () => {
        setShowContactsModal(false);
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
        if (!company || !token)
            return;
        try {
            const res = await fetch(withBase(`/companies/${company.id}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ contacts: selectedContactIds }),
            });
            if (!res.ok) {
                throw new Error('Failed to update contacts');
            }
            // Close modal first
            closeContactsModal();
            // Refresh company and contacts data
            await fetchCompanyAndContacts();
        }
        catch (err) {
            console.error('Error saving company contacts:', err);
            setError(err.message);
        }
    };
    // Popup handlers
    const showCustomPopup = (title, message) => {
        setPopupContent({ title, message });
        setShowPopup(true);
    };
    const closePopup = () => {
        setShowPopup(false);
    };
    if (loading)
        return _jsx("div", { className: "p-4", children: "Loading..." });
    if (error)
        return _jsxs("div", { className: "p-4 text-danger", children: ["Error: ", error] });
    if (!company)
        return _jsx("div", { className: "p-4", children: "Company not found" });
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "container-fluid", children: [_jsxs("div", { className: "d-flex align-items-center mb-4", children: [_jsx("button", { className: "btn btn-link text-decoration-none me-3", onClick: () => navigate('/companies'), children: _jsx(FaArrowLeft, { size: 20 }) }), _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("div", { className: "d-flex align-items-center justify-content-center bg-danger text-white rounded me-3", style: { width: 64, height: 64, fontSize: 32, fontWeight: 'bold' }, children: company.name.charAt(0).toUpperCase() }), _jsxs("div", { children: [_jsx("h1", { className: "h3 mb-1 text-gray-800", children: company.name }), _jsxs("div", { className: "d-flex align-items-center text-muted", children: [_jsx("span", { className: "me-2", children: "Sales Owner:" }), _jsx("div", { className: "rounded-circle bg-secondary me-2", style: { width: 24, height: 24 } }), _jsx("span", { children: company.ownerEmail || 'Unknown' })] })] })] })] }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-8", children: _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex justify-content-between align-items-center bg-white", children: [_jsx("h6", { className: "m-0 font-weight-bold text-dark", children: _jsx("span", { className: "me-2", children: "Contacts" }) }), _jsxs("span", { className: "text-muted small", children: ["Total contacts: ", contacts.length] })] }), _jsx("div", { className: "card-body p-0", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table align-middle mb-0", children: [_jsx("thead", { className: "bg-light", children: _jsxs("tr", { children: [_jsx("th", { className: "border-0 ps-4", children: "Name" }), _jsx("th", { className: "border-0", children: "Address" }), _jsx("th", { className: "border-0 text-end pe-4", children: "Actions" })] }) }), _jsx("tbody", { children: contacts.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "text-center py-4 text-muted", children: "No contacts linked to this company." }) })) : (contacts.map(contact => (_jsxs("tr", { children: [_jsx("td", { className: "ps-4", children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("img", { src: contact.avatarUrl || contact.photo || '/default-avatar.png', alt: "", className: "rounded-circle me-3", style: { width: 32, height: 32, objectFit: 'cover' } }), _jsxs("span", { className: "fw-medium", children: [contact.firstName, " ", contact.lastName] })] }) }), _jsx("td", { children: contact.address || '-' }), _jsx("td", { className: "text-end pe-4", children: _jsxs("div", { className: "btn-group", children: [_jsx("button", { className: "btn btn-sm btn-outline-secondary border-0", title: "Email", onClick: () => showCustomPopup('Email', contact.email || 'No email available'), children: _jsx(FaEnvelope, {}) }), _jsx("button", { className: "btn btn-sm btn-outline-secondary border-0", title: "Call", onClick: () => showCustomPopup('Phone', contact.phone || 'No phone available'), children: _jsx(FaPhone, {}) }), _jsx("button", { className: "btn btn-sm btn-outline-secondary border-0", title: "View", children: _jsx(FaExternalLinkAlt, {}) })] }) })] }, contact.id)))) })] }) }) }), _jsx("div", { className: "card-footer bg-white border-top-0 py-3", children: _jsx("button", { className: "btn btn-link text-decoration-none p-0", onClick: openContactsModal, children: "+ Add new contact" }) })] }) }), _jsx("div", { className: "col-lg-4", children: _jsxs("div", { className: "card shadow mb-4", children: [_jsx("div", { className: "card-header py-3 bg-white", children: _jsx("h6", { className: "m-0 font-weight-bold text-dark", children: "Company info" }) }), _jsx("div", { className: "list-group list-group-flush", children: (() => {
                                                const renderEditableField = (fieldKey, label, value, inputType = 'text', options) => {
                                                    const isEditing = editingField === fieldKey;
                                                    return (_jsxs("div", { className: "list-group-item d-flex justify-content-between align-items-start py-3", children: [_jsxs("div", { className: "flex-grow-1", children: [_jsx("div", { className: "text-muted small mb-1", children: label }), isEditing ? (_jsxs("div", { className: "d-flex align-items-center gap-2", children: [inputType === 'select' && options ? (_jsx("select", { className: "form-select form-select-sm", value: editValue, onChange: (e) => setEditValue(e.target.value), autoFocus: true, children: options.map(opt => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))) })) : (_jsx("input", { type: inputType, className: "form-control form-control-sm", value: editValue, onChange: (e) => setEditValue(e.target.value), autoFocus: true })), _jsx("button", { className: "btn btn-sm btn-secondary", onClick: cancelEditing, disabled: saving, children: "Cancel" }), _jsx("button", { className: "btn btn-sm btn-primary", onClick: () => saveField(fieldKey), disabled: saving, children: saving ? 'Saving...' : 'Save' })] })) : (_jsx("div", { className: "fw-medium text-capitalize", children: value || '-' }))] }), !isEditing && (_jsx("button", { className: "btn btn-sm btn-light", onClick: () => startEditing(fieldKey, value || ''), children: _jsx(FaPen, { size: 12 }) }))] }, fieldKey));
                                                };
                                                return (_jsxs(_Fragment, { children: [renderEditableField('type', 'Type', company.type, 'select', [
                                                            { value: 'company', label: 'Company (นิติบุคคล)' },
                                                            { value: 'individual', label: 'Individual (บุคคล)' }
                                                        ]), renderEditableField('taxId', 'Tax ID', company.taxId), company.type === 'company' && (_jsxs(_Fragment, { children: [renderEditableField('branchName', 'Branch Name', company.branchName), renderEditableField('branchNumber', 'Branch Number', company.branchNumber)] })), renderEditableField('phone', 'Phone', company.phone), renderEditableField('fax', 'Fax', company.fax), renderEditableField('billingCycle', 'Billing Cycle', company.billingCycle, 'select', [
                                                            { value: 'monthly', label: 'Monthly' },
                                                            { value: 'quarterly', label: 'Quarterly' },
                                                            { value: 'yearly', label: 'Yearly' }
                                                        ]), renderEditableField('billingDate', 'Billing Date', company.billingDate ? `Day ${company.billingDate}` : '', 'number'), renderEditableField('notificationDate', 'Notification Date', company.notificationDate ? `Day ${company.notificationDate}` : '', 'number'), renderEditableField('address', 'Address', company.address)] }));
                                            })() })] }) })] })] }), showContactsModal && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: ["Add contacts to ", company.name] }), _jsx("button", { type: "button", className: "btn-close", onClick: closeContactsModal })] }), _jsxs("div", { className: "modal-body", children: [_jsx("div", { className: "mb-3", children: _jsx("input", { className: "form-control", placeholder: "Search contacts" }) }), _jsx("div", { style: { maxHeight: 360, overflow: 'auto' }, children: allContacts.map((c) => (_jsxs("div", { className: "form-check d-flex align-items-center mb-2", children: [_jsx("input", { className: "form-check-input", type: "checkbox", checked: selectedContactIds.includes(c.id), onChange: () => toggleContactSelection(c.id), id: `contact_${c.id}` }), _jsxs("label", { className: "form-check-label ms-2", htmlFor: `contact_${c.id}`, children: [_jsx("img", { src: c.avatarUrl || c.photo || '/default-avatar.png', alt: c.firstName || c.email, style: { width: 28, height: 28, borderRadius: '50%', marginRight: 8 } }), c.firstName ? `${c.firstName} ${c.lastName || ''}` : c.email] })] }, c.id))) })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-primary", onClick: saveCompanyContacts, children: "Save" }), _jsx("button", { className: "btn btn-secondary", onClick: closeContactsModal, children: "Cancel" })] })] }) }) })), showPopup && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, onClick: closePopup, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", onClick: (e) => e.stopPropagation(), children: _jsx("div", { className: "modal-content", style: { borderRadius: '16px', border: 'none' }, children: _jsxs("div", { className: "modal-body text-center p-4", children: [_jsx("h5", { className: "mb-3", style: { fontSize: '24px', fontWeight: '600' }, children: popupContent.title }), _jsx("p", { className: "mb-4", style: { fontSize: '16px', color: '#666' }, children: popupContent.message }), _jsx("button", { className: "btn btn-primary px-4", onClick: closePopup, style: { borderRadius: '8px', fontSize: '16px' }, children: "OK" })] }) }) }) }))] }));
};
