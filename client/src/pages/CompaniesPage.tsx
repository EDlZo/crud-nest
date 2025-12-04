import { FormEvent, useCallback, useEffect, useState } from 'react';
import { FaPen, FaTrash, FaEye, FaEllipsisV } from 'react-icons/fa';
import { FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
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
  billingDate?: string; // วันที่เรียกเก็บเงิน (1-31)
  notificationDate?: string; // วันที่แจ้งเตือนล่วงหน้า (1-31)
  billingCycle?: 'monthly' | 'yearly' | 'quarterly';
  createdAt?: string;
  updatedAt?: string;
  ownerUserId?: string;
  ownerEmail?: string;
  updatedByEmail?: string;
  contacts?: string[];
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

export const CompaniesPage = () => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState<Company>(emptyCompany);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [contacts, setContacts] = useState<any[]>([]);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  const performLogout = () => {
    setCompanies([]);
    logout();
  };

  const handleUnauthorized = () => {
    setError('Session expired. Please log in again');
    performLogout();
  };

  const fetchCompanies = useCallback(async () => {
    if (!token) return;
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // fetch contacts list for use in adding contacts to a company
  const fetchContacts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(withBase('/cruds'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setContacts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleChange = (key: keyof Company, value: string) => {
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);

    const payload: any = {
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
      const response = await fetch(
        withBase(`/companies${isEdit ? `/${editingId}` : ''}`),
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

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

      const saved = (await response.json()) as Company;

      if (isEdit) {
        setCompanies((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      } else {
        setCompanies((prev) => [saved, ...prev]);
      }
      resetForm();
      setShowModal(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (company: Company) => {
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

  const handleDelete = async (id?: string) => {
    if (!token || !id) return;
    const confirmed = window.confirm('Are you sure you want to delete this company?');
    if (!confirmed) return;

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
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Contacts modal handlers
  const closeContactsModal = () => {
    setShowContactsModal(false);
    setActiveCompany(null);
    setSelectedContactIds([]);
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) => {
      if (prev.includes(contactId)) return prev.filter((id) => id !== contactId);
      return [...prev, contactId];
    });
  };

  const saveCompanyContacts = async () => {
    if (!activeCompany || !token) return;
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
    } catch (err) {
      console.error('Error saving company contacts:', err);
      setError((err as Error).message);
    }
  };

  return (
    <>
      <div className="container-fluid">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Companies</h1>
        </div>

        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">Companies List</h6>
            <div>
              <button className="btn btn-sm btn-add me-2" onClick={openAddModal}>
                Add New Company
              </button>
              <button
                style={{ color: '#ffff' }}
                className="btn btn-sm btn-info shadow-sm"
                onClick={fetchCompanies}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger">{error}</div>}
            {companies.length === 0 && !loading ? (
              <p className="text-center">There is no company information yet. Try adding new information.</p>
            ) : (
              <div className="row gx-3 gy-4">
                {companies
                  .filter((company) => {
                    if (searchTerm) {
                      const searchLower = searchTerm.toLowerCase();
                      const matchesSearch =
                        company.name?.toLowerCase().includes(searchLower) ||
                        company.address?.toLowerCase().includes(searchLower);
                      if (!matchesSearch) return false;
                    }
                    if (filterType !== 'all' && company.type !== filterType) return false;
                    return true;
                  })
                  .map((company) => {
                    const canModify =
                      user?.role === 'admin' ||
                      user?.role === 'superadmin' ||
                      company.ownerUserId === user?.userId;

                    const relatedContacts = Array.isArray(company.contacts) ? company.contacts : [];

                    return (
                      <div key={company.id} className="col-sm-6 col-md-4 col-lg-3">
                        <div className="card h-100 shadow-sm">
                          <div className="card-body d-flex flex-column">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div>
                                <h6 className="card-title mb-1">{company.name}</h6>
                                <div className="text-muted small">Open deals amount</div>
                                <div className="h5 mt-1">$0.00</div>
                              </div>
                              <div>
                                {/* placeholder avatar or logo */}
                                <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f4f6f8' }} />
                              </div>
                            </div>

                            <div className="mt-auto d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center">
                                <div style={{ display: 'flex', gap: -8 }}>
                                  {relatedContacts.slice(0, 4).map((cid: string, idx: number) => {
                                    const c = contacts.find((x) => x.id === cid);
                                    return (
                                      <img
                                        key={cid}
                                        src={c?.avatarUrl || c?.photo || '/default-avatar.png'}
                                        alt={c?.firstName || c?.email || 'contact'}
                                        style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', marginLeft: idx === 0 ? 0 : -8 }}
                                      />
                                    );
                                  })}
                                  {relatedContacts.length > 4 && (
                                    <div className="badge bg-secondary ms-2">+{relatedContacts.length - 4}</div>
                                  )}
                                </div>
                                <div className="small ms-2 text-muted">Related contacts</div>
                              </div>
                              <div className="small text-muted">Sales owner</div>
                            </div>
                          </div>
                          <div className="card-footer d-flex justify-content-between">
                            <div>
                              <button className="btn btn-sm btn-outline-primary" onClick={() => { setActiveCompany(company); setSelectedContactIds(Array.isArray(company.contacts) ? company.contacts : []); setShowContactsModal(true); }}>
                                <FaPlus /> Add contacts
                              </button>
                            </div>
                            <div>
                              {canModify ? (
                                <Dropdown align="end">
                                  <Dropdown.Toggle variant="link" className="text-muted no-arrow p-0" id={`dropdown-${company.id}`}>
                                    <FaEllipsisV />
                                  </Dropdown.Toggle>

                                  <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => navigate(`/companies/${company.id}`)}>
                                      <FaEye className="me-2 text-secondary" /> View Company
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => handleEdit(company)}>
                                      <FaPen className="me-2 text-warning" /> Edit
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => handleDelete(company.id)} className="text-danger">
                                      <FaTrash className="me-2" /> Delete
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              ) : (
                                <span className="badge bg-secondary">No Permission</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modal for Add/Edit company */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingId ? 'Edit Company' : 'Add New Company'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-12 mb-3">
                      <label className="form-label">
                        Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.type}
                        onChange={(e) => handleChange('type', e.target.value as 'individual' | 'company')}
                        required
                      >
                        <option value="company">Company (นิติบุคคล)</option>
                        <option value="individual">Individual (บุคคล)</option>
                      </select>
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">
                        {formData.type === 'company' ? 'Company Name' : 'Name'} <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Address</label>
                      <textarea
                        className="form-control"
                        value={formData.address || ''}
                        onChange={(e) => handleChange('address', e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={formData.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Fax</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={formData.fax || ''}
                        onChange={(e) => handleChange('fax', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Tax ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.taxId || ''}
                        onChange={(e) => handleChange('taxId', e.target.value)}
                      />
                    </div>
                    {formData.type === 'company' && (
                      <>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Branch Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.branchName || ''}
                            onChange={(e) => handleChange('branchName', e.target.value)}
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Branch Number</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.branchNumber || ''}
                            onChange={(e) => handleChange('branchNumber', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    <div className="col-md-12 mb-3">
                      <hr />
                      <h6 className="mb-3">Billing Information</h6>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Billing Cycle</label>
                      <select
                        className="form-select"
                        value={formData.billingCycle || 'monthly'}
                        onChange={(e) => handleChange('billingCycle', e.target.value)}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Billing Date (Day of month)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        max="31"
                        placeholder="e.g., 5"
                        value={formData.billingDate || ''}
                        onChange={(e) => handleChange('billingDate', e.target.value)}
                      />
                      <small className="form-text text-muted">Day of month to bill (1-31)</small>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Notification Date (Day of month)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        max="31"
                        placeholder="e.g., 1"
                        value={formData.notificationDate || ''}
                        onChange={(e) => handleChange('notificationDate', e.target.value)}
                      />
                      <small className="form-text text-muted">Day to send notification (1-31)</small>
                    </div>
                  </div>
                  {error && <div className="alert alert-danger">{error}</div>}
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting
                        ? 'Saving...'
                        : editingId
                          ? 'Save Changes'
                          : 'Add Company'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal for adding contacts to a company */}
      {showContactsModal && activeCompany && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add contacts to {activeCompany.name}</h5>
                <button type="button" className="btn-close" onClick={closeContactsModal}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <input className="form-control" placeholder="Search contacts" onChange={(e) => { /* optional: implement search */ }} />
                </div>
                <div style={{ maxHeight: 360, overflow: 'auto' }}>
                  {contacts.map((c) => (
                    <div key={c.id} className="form-check d-flex align-items-center mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={selectedContactIds.includes(c.id)}
                        onChange={() => toggleContactSelection(c.id)}
                        id={`contact_${c.id}`}
                      />
                      <label className="form-check-label ms-2" htmlFor={`contact_${c.id}`}>
                        <img src={c.avatarUrl || c.photo || '/default-avatar.png'} alt={c.firstName || c.email} style={{ width: 28, height: 28, borderRadius: '50%', marginRight: 8 }} />
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
    </>
  );
};

