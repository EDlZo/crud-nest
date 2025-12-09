import { FormEvent, useCallback, useEffect, useState } from 'react';
import { FaDollarSign, FaEye, FaClock } from 'react-icons/fa';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type Deal = {
  id?: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  relatedTo?: 'company' | 'contact';
  relatedId?: string;
  assignedTo?: string;
  assignedToEmail?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

const emptyDeal: Deal = {
  title: '',
  description: '',
  stage: 'lead',
  amount: 0,
  currency: 'THB',
  probability: 0,
};

const withBase = (path: string) => `${API_BASE_URL}${path}`;

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
  const [deals, setDeals] = useState<Deal[]>([]);
  const [formData, setFormData] = useState<Deal>(emptyDeal);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [viewingDeal, setViewingDeal] = useState<Deal | null>(null);
  const [relatedContact, setRelatedContact] = useState<any | null>(null);
  const [relatedCompany, setRelatedCompany] = useState<any | null>(null);
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
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStage !== 'all') params.append('stage', filterStage);
      
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
        } else {
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, filterStage]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleChange = (key: keyof Deal, value: string | number) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyDeal);
  };

  const fetchCompaniesAndContacts = async () => {
    if (!token) return;
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
    } catch (err) {
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

  const handleEdit = (deal: Deal) => {
    setFormData(deal);
    setEditingId(deal.id || null);
    setShowModal(true);
    fetchCompaniesAndContacts();
  };

  const fetchRelatedData = async (relatedTo?: string, relatedId?: string) => {
    if (!token || !relatedTo || !relatedId) return;
    try {
      if (relatedTo === 'contact') {
        const response = await fetch(withBase('/cruds'), { headers: { Authorization: `Bearer ${token}` } });
        if (response.ok) {
          const allContacts = await response.json();
          const contact = Array.isArray(allContacts) ? allContacts.find((c: any) => c.id === relatedId) : null;
          setRelatedContact(contact);
        }
      } else if (relatedTo === 'company') {
        const response = await fetch(withBase('/companies'), { headers: { Authorization: `Bearer ${token}` } });
        if (response.ok) {
          const allCompanies = await response.json();
          const company = Array.isArray(allCompanies) ? allCompanies.find((c: any) => c.id === relatedId) : null;
          setRelatedCompany(company);
        }
      }
    } catch (err) {
      console.error('Error fetching related data:', err);
    }
  };

  const handleViewDeal = (deal: Deal) => {
    setViewingDeal(deal);
    setRelatedContact(null);
    setRelatedCompany(null);
    if (deal.relatedTo && deal.relatedId) {
      fetchRelatedData(deal.relatedTo, deal.relatedId);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);

    const payload: any = {
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
      const response = await fetch(
        withBase(`/deals${isEdit ? `/${editingId}` : ''}`),
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
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }

      await fetchDeals();
      closeModal();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !token) return;
    if (!confirm('Are you sure you want to delete this deal?')) return;

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
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const getStageInfo = (stage: string) => {
    return STAGES.find(s => s.value === stage) || STAGES[0];
  };

  const totalValue = deals
    .filter(d => d.stage !== 'lost')
    .reduce((sum, deal) => sum + (deal.amount || 0), 0);

  const wonValue = deals
    .filter(d => d.stage === 'won')
    .reduce((sum, deal) => sum + (deal.amount || 0), 0);

  return (
    <>
      <div className="container-fluid">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Deals Pipeline</h1>
        </div>

        {/* Summary Cards */}
        <div className="row mb-4">
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-primary shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Total Pipeline Value
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(totalValue)}
                    </div>
                  </div>
                  <div className="col-auto">
                    <FaDollarSign className="fa-2x text-gray-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-success shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                      Won Deals
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(wonValue)}
                    </div>
                  </div>
                  <div className="col-auto">
                    <FaDollarSign className="fa-2x text-gray-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-info shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                      Total Deals
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {deals.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card border-left-warning shadow h-100 py-2">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                      Win Rate
                    </div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                      {deals.length > 0
                        ? Math.round((deals.filter(d => d.stage === 'won').length / deals.length) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">Deals List</h6>
            <div>
              <button className="btn btn-sm btn-add me-2" onClick={openAddModal}>
                Add New Deal
              </button>
              <button
                className="btn btn-sm btn-info shadow-sm"
                onClick={fetchDeals}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="card-body">
            {/* Filter */}
            <div className="row mb-3">
              <div className="col-md-4">
                <label className="form-label">Filter by Stage</label>
                <select
                  className="form-select form-select-sm"
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                >
                  <option value="all">All Stages</option>
                  {STAGES.map(stage => (
                    <option key={stage.value} value={stage.value}>{stage.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {deals.length === 0 && !loading ? (
              <p className="text-center">No deals found. Try adding new deals.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered" width="100%" cellSpacing={0}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Stage</th>
                      <th>Amount</th>
                      <th>Probability</th>
                      <th>Expected Close</th>
                      <th>Assigned To</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((deal) => {
                      const canModify =
                        user?.role === 'admin' ||
                        user?.role === 'superadmin' ||
                        deal.assignedTo === user?.userId;
                      const stageInfo = getStageInfo(deal.stage);
                      
                      return (
                        <tr key={deal.id}>
                          <td>
                            <strong>{deal.title}</strong>
                            {deal.description && (
                              <div className="small text-muted">{deal.description.substring(0, 50)}...</div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${stageInfo.color}`}>
                              {stageInfo.label}
                            </span>
                          </td>
                          <td>
                            {deal.amount
                              ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: deal.currency || 'THB' }).format(deal.amount)
                              : '-'}
                          </td>
                          <td>{deal.probability ? `${deal.probability}%` : '-'}</td>
                          <td>
                            {deal.expectedCloseDate
                              ? new Date(deal.expectedCloseDate).toLocaleDateString()
                              : '-'}
                          </td>
                          <td>{deal.assignedToEmail || '-'}</td>
                          <td>
                            {deal.createdAt
                              ? new Date(deal.createdAt).toLocaleDateString()
                              : '-'}
                          </td>
                          <td>
                            {canModify ? (
                              <div className="btn-group">
                                <button
                                  className="icon-btn view"
                                  aria-label="view"
                                  title="View Details"
                                  onClick={() => handleViewDeal(deal)}
                                >
                                  <FaEye />
                                </button>
                                <button
                                  className="icon-btn edit"
                                  aria-label="edit"
                                  title="Edit"
                                  onClick={() => handleEdit(deal)}
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  className="icon-btn delete"
                                  aria-label="delete"
                                  title="Delete"
                                  onClick={() => handleDelete(deal.id)}
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            ) : (
                              <span className="badge bg-secondary">No Permission</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Add/Edit deal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingId ? 'Edit Deal' : 'Add New Deal'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-12 mb-3">
                      <label className="form-label">
                        Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        value={formData.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">
                        Stage <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.stage}
                        onChange={(e) => handleChange('stage', e.target.value as any)}
                        required
                      >
                        {STAGES.map(stage => (
                          <option key={stage.value} value={stage.value}>{stage.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Amount</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.amount || ''}
                        onChange={(e) => handleChange('amount', e.target.value ? Number(e.target.value) : 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Currency</label>
                      <select
                        className="form-select"
                        value={formData.currency || 'THB'}
                        onChange={(e) => handleChange('currency', e.target.value)}
                      >
                        <option value="THB">THB</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Probability (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.probability || ''}
                        onChange={(e) => handleChange('probability', e.target.value ? Number(e.target.value) : 0)}
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Expected Close Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.expectedCloseDate || ''}
                        onChange={(e) => handleChange('expectedCloseDate', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Related To</label>
                      <select
                        className="form-select"
                        value={formData.relatedTo || ''}
                        onChange={(e) => {
                          handleChange('relatedTo', e.target.value as any);
                          handleChange('relatedId', ''); // Reset ID when changing type
                        }}
                      >
                        <option value="">None</option>
                        <option value="company">Company</option>
                        <option value="contact">Contact</option>
                      </select>
                    </div>
                    {formData.relatedTo === 'company' && (
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Select Company</label>
                        <select
                          className="form-select"
                          value={formData.relatedId || ''}
                          onChange={(e) => handleChange('relatedId', e.target.value)}
                        >
                          <option value="">-- Select Company --</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name} {company.type === 'individual' ? '(Individual)' : '(Company)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {formData.relatedTo === 'contact' && (
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Select Contact</label>
                        <select
                          className="form-select"
                          value={formData.relatedId || ''}
                          onChange={(e) => handleChange('relatedId', e.target.value)}
                        >
                          <option value="">-- Select Contact --</option>
                          {contacts.map((contact) => (
                            <option key={contact.id} value={contact.id}>
                              {contact.firstName} {contact.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Assigned To</label>
                      <select
                        className="form-select"
                        value={formData.assignedTo || ''}
                        onChange={(e) => handleChange('assignedTo', e.target.value)}
                      >
                        <option value="">-- Select User --</option>
                        {users.map((userItem) => (
                          <option key={userItem.id || userItem.userId} value={userItem.id || userItem.userId}>
                            {userItem.email} {userItem.firstName || userItem.lastName ? `(${userItem.firstName || ''} ${userItem.lastName || ''})`.trim() : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {error && <div className="alert alert-danger">{error}</div>}
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting
                        ? 'Saving...'
                        : editingId
                        ? 'Save Changes'
                        : 'Add Deal'}
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
      {viewingDeal && (
        <div
          className="modal show d-block"
          style={{
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-in'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setViewingDeal(null); }}
        >
          <div className="modal-dialog modal-lg" style={{ marginTop: '5vh' }}>
            <div
              className="modal-content"
              style={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                animation: 'slideUp 0.25s ease-out'
              }}
            >
              <div
                className="modal-header"
                style={{
                  background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)',
                  color: 'white',
                  borderRadius: '12px 12px 0 0',
                  padding: '1rem 1.25rem',
                  border: 'none'
                }}
              >
                <h5 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <FaEye />
                  Deal Details
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setViewingDeal(null)} style={{ opacity: 0.95 }}></button>
              </div>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                <div className="mb-4">
                  <h4 style={{ color: '#333', fontWeight: 600, marginBottom: '0.5rem' }}>{viewingDeal.title}</h4>
                  {viewingDeal.description && (
                    <div className="mb-3 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #0d6efd' }}>
                      <strong style={{ color: '#0d6efd', display: 'block', marginBottom: '0.5rem' }}>Description</strong>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#555' }}>{viewingDeal.description}</p>
                    </div>
                  )}
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="p-3 h-100" style={{ backgroundColor: '#fff', borderRadius: '8px' }}>
                      <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Stage</strong>
                      <div>
                        <span className={`badge ${getStageInfo(viewingDeal.stage).color} px-3 py-2`}>{getStageInfo(viewingDeal.stage).label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 h-100" style={{ backgroundColor: '#fff', borderRadius: '8px' }}>
                      <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Amount / Probability</strong>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600 }}>
                          {viewingDeal.amount ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: viewingDeal.currency || 'THB' }).format(viewingDeal.amount) : '-'}
                        </div>
                        <div className="badge bg-info" style={{ padding: '0.5rem 0.75rem' }}>{viewingDeal.probability ? `${viewingDeal.probability}%` : '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className="p-3 h-100" style={{ backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                      <div className="d-flex align-items-center mb-2">
                        <FaClock className="text-warning me-2" />
                        <strong style={{ color: '#856404' }}>Expected Close</strong>
                      </div>
                      <p style={{ margin: 0, color: '#856404', fontWeight: 500 }}>{viewingDeal.expectedCloseDate ? new Date(viewingDeal.expectedCloseDate).toLocaleDateString() : '-'}</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 h-100" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                      <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Assigned To</strong>
                      <p style={{ margin: 0, color: '#333', fontSize: '0.95rem' }}>{(() => {
                        const assignedUser = users.find(u => (u.id || u.userId) === viewingDeal.assignedTo);
                        if (assignedUser) {
                          const name = `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim();
                          return name || assignedUser.email || viewingDeal.assignedToEmail || '-';
                        }
                        return viewingDeal.assignedToEmail || '-';
                      })()}</p>
                    </div>
                  </div>
                </div>

                {viewingDeal.relatedTo && viewingDeal.relatedId && (
                  <div className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #0d6efd' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong style={{ color: '#0d6efd', textTransform: 'capitalize' }}>Related To: {viewingDeal.relatedTo}</strong>
                      {(viewingDeal.relatedTo === 'contact' && relatedContact) || (viewingDeal.relatedTo === 'company' && relatedCompany) ? (
                        <button
                          className="btn btn-sm btn-link p-0"
                          onClick={() => setShowRelatedModal(true)}
                          style={{ color: '#0d6efd', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                          title="View Details"
                        >
                          <FaEye style={{ marginRight: '0.375rem', fontSize: '0.9rem' }} />
                          <span>View Details</span>
                        </button>
                      ) : null}
                    </div>
                    <p style={{ margin: 0, color: '#0d6efd', fontWeight: 500 }}>
                      {viewingDeal.relatedTo === 'contact' && relatedContact ? (
                        <span>{relatedContact.firstName} {relatedContact.lastName}{relatedContact.phone ? ` - ${relatedContact.phone}` : ''}</span>
                      ) : viewingDeal.relatedTo === 'company' && relatedCompany ? (
                        <span>{relatedCompany.name}{relatedCompany.type ? ` (${relatedCompany.type})` : ''}</span>
                      ) : (
                        <span style={{ color: '#666' }}>{viewingDeal.relatedId}</span>
                      )}
                    </p>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                      <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Created At</strong>
                      <p style={{ margin: 0, color: '#333', fontSize: '0.95rem' }}>{viewingDeal.createdAt ? new Date(viewingDeal.createdAt).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                      <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Last Updated</strong>
                      <p style={{ margin: 0, color: '#333', fontSize: '0.95rem' }}>{viewingDeal.updatedAt ? new Date(viewingDeal.updatedAt).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '1rem', borderTop: '1px solid #e9ecef' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setViewingDeal(null)}>Close</button>
                {((user?.role === 'admin') || (user?.role === 'superadmin') || (viewingDeal.assignedTo === user?.userId)) && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => { setViewingDeal(null); handleEdit(viewingDeal); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <FiEdit2 />
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Related Contact/Company Modal */}
      {showRelatedModal && (relatedContact || relatedCompany) && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowRelatedModal(false); }}
        >
          <div className="modal-dialog modal-lg" style={{ marginTop: '5vh' }}>
            <div className="modal-content" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)', color: 'white', borderRadius: '12px 12px 0 0', padding: '1rem', border: 'none' }}>
                <h5 className="modal-title" style={{ margin: 0 }}>{relatedContact ? 'Contact Details' : 'Company Details'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRelatedModal(false)} style={{ opacity: 0.9 }}></button>
              </div>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                {relatedContact ? (
                  <>
                    <div className="mb-4">
                      <h4 style={{ color: '#333', fontWeight: 600, marginBottom: '0.5rem' }}>{relatedContact.firstName} {relatedContact.lastName}</h4>
                    </div>
                    <div className="row g-3">
                      {relatedContact.phone && (
                        <div className="col-md-6"><div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}><strong style={{ color: '#666', display: 'block', marginBottom: '0.25rem' }}>Phone</strong><p style={{ margin: 0 }}>{relatedContact.phone}</p></div></div>
                      )}
                      {relatedContact.address && (
                        <div className="col-md-6"><div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}><strong style={{ color: '#666', display: 'block', marginBottom: '0.25rem' }}>Address</strong><p style={{ margin: 0 }}>{relatedContact.address}</p></div></div>
                      )}
                    </div>
                  </>
                ) : relatedCompany ? (
                  <>
                    <div className="mb-4">
                      <h4 style={{ color: '#333', fontWeight: 600, marginBottom: '0.5rem' }}>{relatedCompany.name}</h4>
                      {relatedCompany.type && (
                        <span className={`badge ${relatedCompany.type === 'company' ? 'bg-primary' : 'bg-secondary'} px-3 py-2`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {relatedCompany.type === 'company' ? 'Company' : 'Individual'}
                        </span>
                      )}
                    </div>

                    {/* Basic Information */}
                    <div className="mb-3">
                      <h6 style={{ color: '#667eea', fontWeight: '600', marginBottom: '1rem' }}>Basic Information</h6>
                      <div className="row g-3">
                        {relatedCompany.address && (
                          <div className="col-md-12">
                            <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                              <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Address</strong>
                              <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedCompany.address}</p>
                            </div>
                          </div>
                        )}
                        {relatedCompany.phone && (
                          <div className="col-md-6">
                            <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                              <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Phone</strong>
                              <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedCompany.phone}</p>
                            </div>
                          </div>
                        )}
                        {relatedCompany.fax && (
                          <div className="col-md-6">
                            <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                              <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Fax</strong>
                              <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedCompany.fax}</p>
                            </div>
                          </div>
                        )}
                        {relatedCompany.taxId && (
                          <div className="col-md-6">
                            <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                              <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Tax ID</strong>
                              <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedCompany.taxId}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Branch Information (for Company type only) */}
                    {relatedCompany.type === 'company' && (relatedCompany.branchName || relatedCompany.branchNumber) && (
                      <div className="mb-3">
                        <h6 style={{ color: '#667eea', fontWeight: '600', marginBottom: '1rem' }}>Branch Information</h6>
                        <div className="row g-3">
                          {relatedCompany.branchName && (
                            <div className="col-md-6">
                              <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                                <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Branch Name</strong>
                                <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedCompany.branchName}</p>
                              </div>
                            </div>
                          )}
                          {relatedCompany.branchNumber && (
                            <div className="col-md-6">
                              <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                                <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Branch Number</strong>
                                <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedCompany.branchNumber}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Billing Information */}
                    {(relatedCompany.billingCycle || relatedCompany.billingDate || relatedCompany.notificationDate) && (
                      <div className="mb-3">
                        <h6 style={{ color: '#667eea', fontWeight: '600', marginBottom: '1rem' }}>Billing Information</h6>
                        <div className="row g-3">
                          {relatedCompany.billingCycle && (
                            <div className="col-md-4">
                              <div className="p-3" style={{ backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                                <strong style={{ color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Billing Cycle</strong>
                                <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: 500, textTransform: 'capitalize' }}>{relatedCompany.billingCycle}</p>
                              </div>
                            </div>
                          )}
                          {relatedCompany.billingDate && (
                            <div className="col-md-4">
                              <div className="p-3" style={{ backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                                <strong style={{ color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Billing Date</strong>
                                <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: 500 }}>Day {relatedCompany.billingDate} of month</p>
                              </div>
                            </div>
                          )}
                          {relatedCompany.notificationDate && (
                            <div className="col-md-4">
                              <div className="p-3" style={{ backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                                <strong style={{ color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Notification Date</strong>
                                <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: 500 }}>Day {relatedCompany.notificationDate} of month</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
              <div className="modal-footer" style={{ padding: '1rem', borderTop: '1px solid #e9ecef' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRelatedModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </>
  );
};

