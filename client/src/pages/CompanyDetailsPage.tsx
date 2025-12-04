import { useCallback, useEffect, useState } from 'react';
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

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const CompanyDetailsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                const allContacts = await contactsRes.json();
                if (Array.isArray(allContacts) && Array.isArray(companyData.contacts)) {
                    const companyContacts = allContacts.filter((c: Contact) =>
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

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-danger">Error: {error}</div>;
    if (!company) return <div className="p-4">Company not found</div>;

    return (
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
                                            <th className="border-0">Title</th>
                                            <th className="border-0">Stage</th>
                                            <th className="border-0 text-end pe-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {contacts.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-4 text-muted">
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
                                                    <td>{contact.position || '-'}</td>
                                                    <td>
                                                        {contact.status && (
                                                            <span className="badge bg-light text-success border border-success rounded-pill px-3">
                                                                {contact.status}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <div className="btn-group">
                                                            <button className="btn btn-sm btn-outline-secondary border-0" title="Email">
                                                                <FaEnvelope />
                                                            </button>
                                                            <button className="btn btn-sm btn-outline-secondary border-0" title="Call">
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
                            <button className="btn btn-link text-decoration-none p-0" onClick={() => {/* Add contact logic */ }}>
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
                            {/* Type */}
                            <div className="list-group-item d-flex justify-content-between align-items-start py-3">
                                <div>
                                    <div className="text-muted small mb-1">Type</div>
                                    <div className="fw-medium text-capitalize">{company.type}</div>
                                </div>
                                <button className="btn btn-sm btn-light"><FaPen size={12} /></button>
                            </div>

                            {/* Tax ID */}
                            <div className="list-group-item d-flex justify-content-between align-items-start py-3">
                                <div>
                                    <div className="text-muted small mb-1">Tax ID</div>
                                    <div className="fw-medium">{company.taxId || '-'}</div>
                                </div>
                                <button className="btn btn-sm btn-light"><FaPen size={12} /></button>
                            </div>

                            {/* Branch Info (if company) */}
                            {company.type === 'company' && (
                                <>
                                    <div className="list-group-item d-flex justify-content-between align-items-start py-3">
                                        <div>
                                            <div className="text-muted small mb-1">Branch Name</div>
                                            <div className="fw-medium">{company.branchName || '-'}</div>
                                        </div>
                                        <button className="btn btn-sm btn-light"><FaPen size={12} /></button>
                                    </div>
                                    <div className="list-group-item d-flex justify-content-between align-items-start py-3">
                                        <div>
                                            <div className="text-muted small mb-1">Branch Number</div>
                                            <div className="fw-medium">{company.branchNumber || '-'}</div>
                                        </div>
                                        <button className="btn btn-sm btn-light"><FaPen size={12} /></button>
                                    </div>
                                </>
                            )}

                            {/* Phone */}
                            <div className="list-group-item d-flex justify-content-between align-items-start py-3">
                                <div>
                                    <div className="text-muted small mb-1">Phone</div>
                                    <div className="fw-medium">{company.phone || '-'}</div>
                                </div>
                                <button className="btn btn-sm btn-light"><FaPen size={12} /></button>
                            </div>

                            {/* Fax */}
                            <div className="list-group-item d-flex justify-content-between align-items-start py-3">
                                <div>
                                    <div className="text-muted small mb-1">Fax</div>
                                    <div className="fw-medium">{company.fax || '-'}</div>
                                </div>
                                <button className="btn btn-sm btn-light"><FaPen size={12} /></button>
                            </div>

                            {/* Billing Cycle */}
                            <div className="list-group-item d-flex justify-content-between align-items-start py-3">
                                <div>
                                    <div className="text-muted small mb-1">Billing Cycle</div>
                                    <div className="fw-medium text-capitalize">{company.billingCycle || '-'}</div>
                                </div>
                                <button className="btn btn-sm btn-light"><FaPen size={12} /></button>
                            </div>

                            {/* Billing Date */}
                            <div className="list-group-item d-flex justify-content-between align-items-start py-3">
                                <div>
                                    <div className="text-muted small mb-1">Billing Date</div>
                                    <div className="fw-medium">{company.billingDate ? `Day ${company.billingDate}` : '-'}</div>
                                </div>
                                <button className="btn btn-sm btn-light"><FaPen size={12} /></button>
                            </div>

                            {/* Notification Date */}
                            <div className="list-group-item d-flex justify-content-between align-items-start py-3">
                                <div>
                                    <div className="text-muted small mb-1">Notification Date</div>
                                    <div className="fw-medium">{company.notificationDate ? `Day ${company.notificationDate}` : '-'}</div>
                                </div>
                                <button className="btn btn-sm btn-light"><FaPen size={12} /></button>
                            </div>

                            {/* Address */}
                            <div className="list-group-item d-flex justify-content-between align-items-start py-3">
                                <div>
                                    <div className="text-muted small mb-1">Address</div>
                                    <div className="fw-medium">{company.address || '-'}</div>
                                </div>
                                <button className="btn btn-sm btn-light"><FaPen size={12} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
