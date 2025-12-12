import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEnvelope, FaPhone, FaPen, FaCheck, FaTrash } from 'react-icons/fa';
import { FiEye } from 'react-icons/fi';
import { FiEyeOff } from 'react-icons/fi';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { getAvatarColor } from '../utils/avatarColor';

type Company = {
    services?: { name: string; amount: number }[];
    amountDue?: number;
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
    avatarUrl?: string;

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
    // Contact search state
    const [contactSearch, setContactSearch] = useState('');
    // Toggle for showing/hiding service list
    const [showServices, setShowServices] = useState(false);

    // Custom SVG Eye Icon (outline style)
    const EyeIcon = ({ size = 24 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="12" rx="9" ry="7" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );

    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    // Billing services modal state
    const [showBillingModal, setShowBillingModal] = useState(false);
    const [serviceName, setServiceName] = useState('');
    const [serviceAmount, setServiceAmount] = useState('');
    const [services, setServices] = useState<{ name: string; amount: number }[]>([]);

    // Only update local services state when opening the modal
    const openBillingModal = () => {
        setServices(company?.services || []);
        setShowBillingModal(true);
    };


    // Inline Editing State
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [saving, setSaving] = useState(false);
    // Avatar upload state
    const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarHover, setAvatarHover] = useState(false);

    const uploadAvatarDataUrl = async (dataUrl: string) => {
        if (!company?.id || !token) return;
        setSaving(true);
        try {
            const res = await fetch(withBase(`/companies/${company.id}`), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ avatarUrl: dataUrl }),
            });
            if (!res.ok) throw new Error('Failed to upload avatar');
            const updated = await res.json();
            setCompany(updated);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSaving(false);
            setSelectedAvatar(null);
            setAvatarPreview(null);
            const el = document.getElementById('company-avatar-input') as HTMLInputElement | null;
            if (el) el.value = '';
        }
    };

    // Contacts Modal State
    const [allContacts, setAllContacts] = useState<Contact[]>([]);
    const [showContactsModal, setShowContactsModal] = useState(false);
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

    // Custom Popup State
    const [showPopup, setShowPopup] = useState(false);
    const [popupContent, setPopupContent] = useState({ title: '', message: '' });

    // (payments UI removed) 




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
                            style={{ display: 'inline-block', marginRight: 12, position: 'relative' }}
                            onMouseEnter={() => setAvatarHover(true)}
                            onMouseLeave={() => setAvatarHover(false)}
                        >
                            <input
                                id="company-avatar-input"
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                disabled={saving}
                                onChange={async (e) => {
                                    const f = e.target.files?.[0] || null;
                                    setSelectedAvatar(f);
                                    if (f) {
                                        const reader = new FileReader();
                                        reader.onload = async () => {
                                            const dataUrl = reader.result as string;
                                            setAvatarPreview(dataUrl);
                                            // Immediately upload the selected image (no extra Save step)
                                            await uploadAvatarDataUrl(dataUrl);
                                        };
                                        reader.readAsDataURL(f);
                                    } else {
                                        setAvatarPreview(null);
                                    }
                                }}
                            />

                            {company.avatarUrl ? (
                                <img
                                    src={company.avatarUrl}
                                    alt={company.name}
                                    className="rounded"
                                    style={{ width: 64, height: 64, objectFit: 'cover', display: 'block' }}
                                />
                            ) : (
                                <div
                                    className="d-flex align-items-center justify-content-center text-white rounded"
                                    style={{ width: 64, height: 64, fontSize: 32, fontWeight: 'bold', backgroundColor: getAvatarColor(company.name) }}
                                >
                                    {company.name.charAt(0).toUpperCase()}
                                </div>
                            )}

                            {/* Pencil overlay - appears on hover or when a new file is selected */}
                            <label
                                htmlFor="company-avatar-input"
                                aria-label="Change company image"
                                style={{
                                    position: 'absolute',
                                    right: -6,
                                    top: -6,
                                    width: 34,
                                    height: 34,
                                    borderRadius: 8,
                                    background: '#ffffff',
                                    display: (avatarHover || !!selectedAvatar || saving) ? 'inline-flex' : 'none',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(2,6,23,0.12)',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {saving ? (
                                    <svg width="14" height="14" viewBox="0 0 50 50">
                                        <circle cx="25" cy="25" r="20" stroke="#666" strokeWidth="4" fill="none" strokeDasharray="31.4 31.4">
                                        </circle>
                                    </svg>
                                ) : (
                                    <FaPen size={14} />
                                )}
                            </label>
                        </div>
                        {/* Immediate upload: no Save/Cancel UI shown when an image is selected. Preview shows only briefly via avatarPreview when available. */}
                        <div>
                            {editingField === 'name' ? (
                                <div className="d-flex align-items-center gap-2">
                                    <input
                                        type="text"
                                        className="form-control form-control-lg"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        autoFocus
                                        style={{ maxWidth: 300 }}
                                    />
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={cancelEditing}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => saveField('name')}
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            ) : (
                                <div className="d-flex align-items-center">
                                    <h1 className="h3 mb-1 text-gray-800 me-2">{company.name}</h1>
                                    <button
                                        className="btn btn-sm btn-light"
                                        onClick={() => startEditing('name', company.name)}
                                        title="Edit name"
                                    >
                                        <FaPen size={12} />
                                    </button>
                                </div>
                            )}
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
                                                                {(contact.avatarUrl || contact.photo) ? (
                                                                    <img
                                                                        src={contact.avatarUrl || contact.photo}
                                                                        alt=""
                                                                        className="rounded-circle me-3"
                                                                        style={{ width: 32, height: 32, objectFit: 'cover' }}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="rounded-circle d-flex align-items-center justify-content-center me-3 text-white fw-bold"
                                                                        style={{ width: 32, height: 32, backgroundColor: getAvatarColor(contact.firstName || contact.email || ''), fontSize: 14 }}
                                                                    >
                                                                        {contact.firstName?.charAt(0).toUpperCase() || 'C'}
                                                                    </div>
                                                                )}
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

                        {/* Amount Due Card */}
                        <div className="card shadow mb-4">
                            <div className="card-header py-3 d-flex justify-content-between align-items-center bg-white">
                                <h6 className="m-0 font-weight-bold text-dark">
                                    <span className="me-2">Billing</span>
                                </h6>
                            </div>
                            <div className="card-body">
                                <div className="row mb-3">
                                    <div className="col-md-4">
                                        <div className="text-muted small mb-1">Amount Due</div>
                                        <div className="fw-bold text-xl d-flex align-items-center" style={{ fontSize: 24 }}>
                                            <span>
                                                ฿{(() => {
                                                    if (typeof company.amountDue === 'number' && !isNaN(company.amountDue) && company.amountDue > 0) {
                                                        return company.amountDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                    }
                                                    return '0.00';
                                                })()}
                                            </span>
                                            {company.services && company.services.length > 0 && (
                                                <button
                                                    className="btn btn-link p-0 ms-2"
                                                    style={{ fontSize: 22, lineHeight: 1, verticalAlign: 'middle' }}
                                                    title={showServices ? 'ซ่อนบริการ' : 'แสดงบริการ'}
                                                    onClick={() => setShowServices((v) => !v)}
                                                >
                                                    {showServices ? <FiEyeOff color="#6c757d" /> : <FiEye color="#6c757d" />}
                                                </button>
                                            )}
                                        </div>
                                        {showServices && company.services && company.services.length > 0 && (
                                            <ul className="mt-2 mb-0 ps-3" style={{ fontSize: 15 }}>
                                                {company.services.map((s, idx) => (
                                                    <li key={idx}>{s.name}: ฿{s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="col-md-4">
                                        <div className="text-muted small mb-1">Billing Date</div>
                                        <div className="fw-bold text-xl d-flex align-items-center" style={{ fontSize: 20 }}>
                                            {editingField === 'billingDate' ? (
                                                <>
                                                    <select
                                                        className="form-select form-select-sm me-2"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onBlur={() => saveField('billingDate')}
                                                        autoFocus
                                                        style={{ width: 80, display: 'inline-block' }}
                                                    >
                                                        <option value="">-</option>
                                                        {Array.from({ length: 31 }, (_, i) => (
                                                            <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                                                        ))}
                                                    </select>
                                                    <button className="btn btn-sm btn-secondary" onClick={cancelEditing}>Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    {company.billingDate ? `Day ${company.billingDate}` : '-'}
                                                    <button
                                                        className="btn btn-link p-0 ms-2"
                                                        style={{ fontSize: 16, color: '#6c757d' }}
                                                        title="Edit Billing Date"
                                                        onClick={() => startEditing('billingDate', company.billingDate || '')}
                                                    >
                                                        <FaPen />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="text-muted small mb-1">Notification Date</div>
                                        <div className="fw-bold text-xl d-flex align-items-center" style={{ fontSize: 20 }}>
                                            {editingField === 'notificationDate' ? (
                                                <>
                                                    <select
                                                        className="form-select form-select-sm me-2"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onBlur={() => saveField('notificationDate')}
                                                        autoFocus
                                                        style={{ width: 80, display: 'inline-block' }}
                                                    >
                                                        <option value="">-</option>
                                                        {Array.from({ length: 31 }, (_, i) => (
                                                            <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                                                        ))}
                                                    </select>
                                                    <button className="btn btn-sm btn-secondary" onClick={cancelEditing}>Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    {company.notificationDate ? `Day ${company.notificationDate}` : '-'}
                                                    <button
                                                        className="btn btn-link p-0 ms-2"
                                                        style={{ fontSize: 16, color: '#6c757d' }}
                                                        title="Edit Notification Date"
                                                        onClick={() => startEditing('notificationDate', company.notificationDate || '')}
                                                    >
                                                        <FaPen />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        setShowBillingModal(true);
                                        setServices(company?.services || []);
                                        setServiceName('');
                                        setServiceAmount('');
                                    }}
                                >
                                    Add / Edit
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
                                            {renderEditableField('address', 'Address', company.address)}
                                            {renderEditableField('taxId', 'Tax ID', company.taxId)}

                                            {company.type === 'company' && (
                                                <>
                                                    {renderEditableField('branchName', 'Branch Name', company.branchName)}
                                                    {renderEditableField('branchNumber', 'Branch Number', company.branchNumber)}
                                                </>
                                            )}

                                            {renderEditableField('phone', 'Phone', company.phone)}
                                            {renderEditableField('fax', 'Fax', company.fax)}

                                            {/* Billing Date and Notification Date removed from Company Info */}

                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div >
            {/* Billing Modal */}
            {
                showBillingModal && (
                    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Add/Edit Services</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowBillingModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Service Name</label>
                                        <input className="form-control" value={serviceName} onChange={e => setServiceName(e.target.value)} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Amount</label>
                                        <input type="number" className="form-control" value={serviceAmount} onChange={e => setServiceAmount(e.target.value)} min={0} step={0.01} />
                                    </div>
                                    <button className="btn btn-success mb-3" onClick={() => {
                                        if (!serviceName || !serviceAmount) return;
                                        setServices([...services, { name: serviceName, amount: parseFloat(serviceAmount) }]);
                                        setServiceName('');
                                        setServiceAmount('');
                                    }}>Add Service</button>
                                    <ul className="list-group mb-3">
                                        {services.map((s, idx) => (
                                            <li className="list-group-item d-flex justify-content-between align-items-center" key={idx}>
                                                <span>{s.name} <span className="text-muted">(฿{s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span></span>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => setServices(services.filter((_, i) => i !== idx))}
                                                    title="Remove service"
                                                    aria-label={`Remove ${s.name}`}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-primary" onClick={async () => {
                                        if (!company?.id || !token) return;
                                        const total = services.reduce((sum, s) => sum + s.amount, 0);
                                        try {
                                            const res = await fetch(withBase(`/companies/${company.id}`), {
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                body: JSON.stringify({ services, amountDue: total }),
                                            });
                                            if (res.ok) {
                                                const updated = await res.json();
                                                setCompany(updated);
                                                setShowBillingModal(false);
                                            }
                                        } catch { }
                                    }}>Save</button>
                                    <button className="btn btn-secondary" onClick={() => {
                                        setServices(company?.services || []);
                                        setServiceName('');
                                        setServiceAmount('');
                                        setShowBillingModal(false);
                                    }}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Contacts Modal */}
            {
                showContactsModal && (
                    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Add contacts to {company.name}</h5>
                                    <button type="button" className="btn-close" onClick={closeContactsModal}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <input
                                            className="form-control"
                                            placeholder="Search contacts"
                                            value={contactSearch}
                                            onChange={e => setContactSearch(e.target.value)}
                                        />
                                    </div>
                                    <div style={{ maxHeight: 360, overflow: 'auto' }}>
                                        {allContacts
                                            .filter(c => {
                                                const term = contactSearch.trim().toLowerCase();
                                                if (!term) return true;
                                                return (
                                                    (c.firstName && c.firstName.toLowerCase().includes(term)) ||
                                                    (c.lastName && c.lastName.toLowerCase().includes(term)) ||
                                                    (c.email && c.email.toLowerCase().includes(term)) ||
                                                    (c.position && c.position.toLowerCase().includes(term))
                                                );
                                            })
                                            .map((c) => (
                                                <div key={c.id} className="form-check d-flex align-items-center mb-2">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        checked={selectedContactIds.includes(c.id)}
                                                        onChange={() => toggleContactSelection(c.id)}
                                                        id={`contact_${c.id}`}
                                                    />
                                                    <label className="form-check-label ms-2 d-flex align-items-center" htmlFor={`contact_${c.id}`}>
                                                        {(c.avatarUrl || c.photo) ? (
                                                            <img
                                                                src={c.avatarUrl || c.photo}
                                                                alt={c.firstName || c.email}
                                                                style={{ width: 28, height: 28, borderRadius: '50%', marginRight: 8 }}
                                                            />
                                                        ) : (
                                                            <div
                                                                className="d-flex align-items-center justify-content-center text-white fw-bold"
                                                                style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: getAvatarColor(c.firstName || c.email || ''), marginRight: 8, fontSize: 12 }}
                                                            >
                                                                {c.firstName?.charAt(0).toUpperCase() || 'C'}
                                                            </div>
                                                        )}
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
                )
            }

            {/* Custom Popup Modal */}
            {
                showPopup && (
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
                )
            }
        </>
    );
};
