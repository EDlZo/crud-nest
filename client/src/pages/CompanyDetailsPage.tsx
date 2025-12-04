import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEnvelope, FaPhone, FaExternalLinkAlt, FaPen } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type Company = {
    id?: string;
    type: 'individual' | 'company';
    name: string;
    address?: string;
    phone?: string;
    fax?: string;
    taxId?: string;
    branchName?: string;
    branchNumber?: string;
    billingDate?: string;
    notificationDate?: string;
    billingCycle?: 'monthly' | 'yearly' | 'quarterly';
    createdAt?: string;
    updatedAt?: string;
    ownerUserId?: string;
    ownerEmail?: string;
    updatedByEmail?: string;
    contacts?: string[];
};

type Contact = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string; // Title
    photo?: string;
    avatarUrl?: string;
    status?: string; // Stage
};

const emptyCompany: Company = {
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

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const CompanyDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Inline Editing State
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // Contacts Modal State
    const [allContacts, setAllContacts] = useState<Contact[]>([]);
    const [showContactsModal, setShowContactsModal] = useState(false);
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

    // Custom Popup State
    const [showPopup, setShowPopup] = useState(false);
    const [popupContent, setPopupContent] = useState({ title: '', message: '' });

    const fetchCompanyAndContacts = useCallback(async () => {
        if (!token || !id) return;
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
                    const companyContacts = allContactsData.filter((c: Contact) =>
                        companyData.contacts.includes(c.id)
                    );
                    setContacts(companyContacts);
                }
            }

        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [token, id]);

    useEffect(() => {
        fetchCompanyAndContacts();
    }, [fetchCompanyAndContacts]);

    // Inline editing handlers
    const startEditing = (field: string, currentValue: string) => {
        setEditingField(field);
        setEditValue(currentValue || '');
    };

    const cancelEditing = () => {
        setEditingField(null);
        setEditValue('');
    };

    const saveField = async (field: keyof Company) => {
        if (!token || !company?.id) return;
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
        } catch (err) {
            setError((err as Error).message);
        } finally {
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

    const toggleContactSelection = (contactId: string) => {
        setSelectedContactIds((prev) => {
            if (prev.includes(contactId)) return prev.filter((id) => id !== contactId);
            return [...prev, contactId];
        });
    };

    const saveCompanyContacts = async () => {
        if (!company || !token) return;
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
        } catch (err) {
            console.error('Error saving company contacts:', err);
            setError((err as Error).message);
        }
    };

    // Popup handlers
    const showCustomPopup = (title: string, message: string) => {
        setPopupContent({ title, message });
        setShowPopup(true);
    };

    const closePopup = () => {
        setShowPopup(false);
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-danger">Error: {error}</div>;
    if (!company) return <div className="p-4">Company not found</div>;

    return (
        <>
            <div className="container-fluid">
                {/* Header */}
                <div className="d-flex align-items-center mb-4">
                    <button className="btn btn-link text-decoration-none me-3" onClick={() => navigate('/companies')}>
                        <FaArrowLeft size={20} />
                    </button>
                    <div className="d-flex align-items-center">
                        <div
                            className="d-flex align-items-center justify-content-center bg-danger text-white rounded me-3"
                            style={{ width: 64, height: 64, fontSize: 32, fontWeight: 'bold' }}
                        >
                            {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="h3 mb-1 text-gray-800">{company.name}</h1>
                            <div className="d-flex align-items-center text-muted">
                                <span className="me-2">Sales Owner:</span>
                                {/* Placeholder for Sales Owner Avatar */}
                                <div className="rounded-circle bg-secondary me-2" style={{ width: 24, height: 24 }}></div>
                                <span>{company.ownerEmail || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    {/* Main Content - Contacts */}
                    <div className="col-lg-8">
                        <div className="card shadow mb-4">
                            <div className="card-header py-3 d-flex justify-content-between align-items-center bg-white">
                                <h6 className="m-0 font-weight-bold text-dark">
                                    <span className="me-2">Contacts</span>
                                </h6>
                                <span className="text-muted small">Total contacts: {contacts.length}</span>
                            </div>
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table align-middle mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="border-0 ps-4">Name</th>
                                                <th className="border-0">Address</th>
                                                <th className="border-0 text-end pe-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contacts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="text-center py-4 text-muted">
                                                        No contacts linked to this company.
                                                    </td>
                                                </tr>
                                            ) : (
                                                contacts.map(contact => (
                                                    <tr key={contact.id}>
                                                        <td className="ps-4">
                                                            <div className="d-flex align-items-center">
                                                                <img
                                                                    src={contact.avatarUrl || contact.photo || '/default-avatar.png'}
                                                                    alt=""
                                                                    className="rounded-circle me-3"
                                                                    style={{ width: 32, height: 32, objectFit: 'cover' }}
                                                                />
                                                                <span className="fw-medium">{contact.firstName} {contact.lastName}</span>
                                                            </div>
                                                        </td>
                                                        <td>{(contact as any).address || '-'}</td>
                                                        <td className="text-end pe-4">
                                                            <div className="btn-group">
                                                                <button
                                                                    className="btn btn-sm btn-outline-secondary border-0"
                                                                    title="Email"
                                                                    onClick={() => showCustomPopup('Email', contact.email || 'No email available')}
                                                                >
                                                                    <FaEnvelope />
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-outline-secondary border-0"
                                                                    title="Call"
                                                                    onClick={() => showCustomPopup('Phone', contact.phone || 'No phone available')}
                                                                >
                                                                    <FaPhone />
                                                                </button>
                                                                <button className="btn btn-sm btn-outline-secondary border-0" title="View">
                                                                    <FaExternalLinkAlt />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="card-footer bg-white border-top-0 py-3">
                                <button className="btn btn-link text-decoration-none p-0" onClick={openContactsModal}>
                                    + Add new contact
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Company Info */}
                    <div className="col-lg-4">
                        <div className="card shadow mb-4">
                            <div className="card-header py-3 bg-white">
                                <h6 className="m-0 font-weight-bold text-dark">Company info</h6>
                            </div>
                            <div className="list-group list-group-flush">
                                {/* Helper function to render editable field */}
                                {(() => {
                                    const renderEditableField = (
                                        fieldKey: keyof Company,
                                        label: string,
                                        value: string | undefined,
                                        inputType: 'text' | 'select' | 'number' = 'text',
                                        options?: { value: string; label: string }[]
                                    ) => {
                                        const isEditing = editingField === fieldKey;

                                        return (
                                            <div className="list-group-item d-flex justify-content-between align-items-start py-3" key={fieldKey}>
                                                <div className="flex-grow-1">
                                                    <div className="text-muted small mb-1">{label}</div>
                                                    {isEditing ? (
                                                        <div className="d-flex align-items-center gap-2">
                                                            {inputType === 'select' && options ? (
                                                                <select
                                                                    className="form-select form-select-sm"
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    autoFocus
                                                                >
                                                                    {options.map(opt => (
                                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type={inputType}
                                                                    className="form-control form-control-sm"
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    autoFocus
                                                                />
                                                            )}
                                                            <button
                                                                className="btn btn-sm btn-secondary"
                                                                onClick={cancelEditing}
                                                                disabled={saving}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-primary"
                                                                onClick={() => saveField(fieldKey)}
                                                                disabled={saving}
                                                            >
                                                                {saving ? 'Saving...' : 'Save'}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="fw-medium text-capitalize">{value || '-'}</div>
                                                    )}
                                                </div>
                                                {!isEditing && (
                                                    <button
                                                        className="btn btn-sm btn-light"
                                                        onClick={() => startEditing(fieldKey, value || '')}
                                                    >
                                                        <FaPen size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    };

                                    return (
                                        <>
                                            {renderEditableField('type', 'Type', company.type, 'select', [
                                                { value: 'company', label: 'Company (นิติบุคคล)' },
                                                { value: 'individual', label: 'Individual (บุคคล)' }
                                            ])}
                                            {renderEditableField('taxId', 'Tax ID', company.taxId)}

                                            {company.type === 'company' && (
                                                <>
                                                    {renderEditableField('branchName', 'Branch Name', company.branchName)}
                                                    {renderEditableField('branchNumber', 'Branch Number', company.branchNumber)}
                                                </>
                                            )}

                                            {renderEditableField('phone', 'Phone', company.phone)}
                                            {renderEditableField('fax', 'Fax', company.fax)}
                                            {renderEditableField('billingCycle', 'Billing Cycle', company.billingCycle, 'select', [
                                                { value: 'monthly', label: 'Monthly' },
                                                { value: 'quarterly', label: 'Quarterly' },
                                                { value: 'yearly', label: 'Yearly' }
                                            ])}
                                            {renderEditableField('billingDate', 'Billing Date', company.billingDate ? `Day ${company.billingDate}` : '', 'number')}
                                            {renderEditableField('notificationDate', 'Notification Date', company.notificationDate ? `Day ${company.notificationDate}` : '', 'number')}
                                            {renderEditableField('address', 'Address', company.address)}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Contacts Modal */}
            {showContactsModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Add contacts to {company.name}</h5>
                                <button type="button" className="btn-close" onClick={closeContactsModal}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <input className="form-control" placeholder="Search contacts" />
                                </div>
                                <div style={{ maxHeight: 360, overflow: 'auto' }}>
                                    {allContacts.map((c) => (
                                        <div key={c.id} className="form-check d-flex align-items-center mb-2">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={selectedContactIds.includes(c.id)}
                                                onChange={() => toggleContactSelection(c.id)}
                                                id={`contact_${c.id}`}
                                            />
                                            <label className="form-check-label ms-2" htmlFor={`contact_${c.id}`}>
                                                <img
                                                    src={c.avatarUrl || c.photo || '/default-avatar.png'}
                                                    alt={c.firstName || c.email}
                                                    style={{ width: 28, height: 28, borderRadius: '50%', marginRight: 8 }}
                                                />
                                                {c.firstName ? `${c.firstName} ${c.lastName || ''}` : c.email}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-primary" onClick={saveCompanyContacts}>Save</button>
                                <button className="btn btn-secondary" onClick={closeContactsModal}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Popup Modal */}
            {showPopup && (
                <div
                    className="modal show d-block"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={closePopup}
                >
                    <div
                        className="modal-dialog modal-dialog-centered"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-content" style={{ borderRadius: '16px', border: 'none' }}>
                            <div className="modal-body text-center p-4">
                                <h5 className="mb-3" style={{ fontSize: '24px', fontWeight: '600' }}>
                                    {popupContent.title}
                                </h5>
                                <p className="mb-4" style={{ fontSize: '16px', color: '#666' }}>
                                    {popupContent.message}
                                </p>
                                <button
                                    className="btn btn-primary px-4"
                                    onClick={closePopup}
                                    style={{ borderRadius: '8px', fontSize: '16px' }}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
