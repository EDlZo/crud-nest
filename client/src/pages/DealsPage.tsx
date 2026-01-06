import { FormEvent, useCallback, useEffect, useState, useMemo } from 'react';
import { formatToDDMMYYYY } from '../utils/formatDate';
import { FaDollarSign, FaEye, FaClock, FaChartLine } from 'react-icons/fa';
import { FiEdit2, FiEye, FiTrash2 } from 'react-icons/fi';
import '../App.css';
import { API_BASE_URL } from '../config';
import DeleteConfirmPopover from '../components/DeleteConfirmPopover';
import DataTable from '../components/DataTable';
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

  const fetchCompaniesAndContacts = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    fetchDeals();
    fetchCompaniesAndContacts();
  }, [fetchDeals, fetchCompaniesAndContacts]);

  const handleChange = (key: keyof Deal, value: string | number) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyDeal);
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
      assignedToEmail: formData.assignedToEmail || undefined,
    };

    console.log('Submitting deal payload:', payload);

    try {
      const isEdit = Boolean(editingId);
      const url = withBase(`/deals${isEdit ? `/${editingId}` : ''}`);
      console.log('Fetching URL:', url, 'Method:', isEdit ? 'PATCH' : 'POST');
      const response = await fetch(
        url,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      console.log('Response status:', response.status);

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
    // Confirmed via Popover

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

  const columns = useMemo<import('@tanstack/react-table').ColumnDef<Deal, any>[]>(() => [
    {
      id: 'title',
      header: 'Title',
      accessorFn: (r) => r.title,
      cell: ({ row, getValue }) => {
        const d = row.original;
        return (
          <div>
            <strong>{getValue() as string}</strong>
            {d.description && (
              <div className="small text-muted">{d.description.substring(0, 50)}...</div>
            )}
          </div>
        );
      },
      enableColumnFilter: true,
    },
    {
      id: 'stage',
      header: 'Stage',
      accessorFn: (r) => getStageInfo(r.stage).label,
      cell: ({ row }) => {
        const stageInfo = getStageInfo(row.original.stage);
        return (
          <span className={`badge ${stageInfo.color}`}>
            {stageInfo.label}
          </span>
        );
      },
      enableColumnFilter: true,
    },
    {
      id: 'amount',
      header: 'Amount',
      accessorFn: (r) => r.amount || 0,
      cell: ({ row }) => {
        const d = row.original;
        return d.amount
          ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: d.currency || 'THB' }).format(d.amount)
          : '-';
      },
      enableColumnFilter: true,
    },
    {
      id: 'probability',
      header: 'Probability',
      accessorFn: (r) => r.probability ? `${r.probability}%` : '-',
      enableColumnFilter: true,
    },
    {
      id: 'expectedClose',
      header: 'Expected Close',
      accessorFn: (r) => r.expectedCloseDate ? formatToDDMMYYYY(r.expectedCloseDate) : '-',
      enableColumnFilter: true,
    },
    {
      id: 'assignedTo',
      header: 'Assigned To',
      accessorFn: (r) => {
        const u = users.find(u => (u.id || u.userId) === r.assignedTo);
        if (u) {
          return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
        }
        return r.assignedToEmail || '-';
      },
      enableColumnFilter: true,
    },
    {
      id: 'createdAt',
      header: 'Created',
      accessorFn: (r) => r.createdAt ? formatToDDMMYYYY(r.createdAt) : '-',
      enableColumnFilter: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { headerAlign: 'center' },
      cell: ({ row }) => {
        const deal = row.original;
        const canModify =
          user?.role === 'admin' ||
          user?.role === 'superadmin' ||
          deal.assignedTo === user?.userId;

        if (!canModify) return <span className="badge bg-secondary">No Permission</span>;

        return (
          <div className="d-flex align-items-center gap-2 justify-content-center">
            <button
              className="icon-btn view"
              aria-label="view"
              title="View Details"
              onClick={() => handleViewDeal(deal)}
            >
              <FaEye size={18} />
            </button>
            <button
              className="icon-btn edit"
              aria-label="edit"
              title="Edit"
              onClick={() => handleEdit(deal)}
            >
              <FiEdit2 size={18} strokeWidth={2} className="action-pencil" />
            </button>
            <DeleteConfirmPopover onConfirm={() => handleDelete(deal.id)} placement="left">
              <button
                className="icon-btn delete"
                aria-label="delete"
                title="Delete"
              >
                <FiTrash2 size={18} strokeWidth={2} />
              </button>
            </DeleteConfirmPopover>
          </div>
        );
      }
    }
  ], [user, users, handleViewDeal, handleEdit, handleDelete]);

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
          <h1 className="h3 mb-0 text-gray-800">Sales Deals</h1>
        </div>

        {/* Dashboard-style statistics */}
        <div className="row mb-4">
          <div className="col-xl-4 col-md-6 mb-4">
            <div className="card h-100 py-2 border-left-primary static-card">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                      Pipeline Value
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

          <div className="col-xl-4 col-md-6 mb-4">
            <div className="card h-100 py-2 border-left-success static-card">
              <div className="card-body">
                <div className="row no-gutters align-items-center">
                  <div className="col mr-2">
                    <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                      Won Value
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

          <div className="col-xl-4 col-md-6 mb-4">
            <div className="card h-100 py-2 border-left-warning static-card">
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
                  <div className="col-auto">
                    <FaChartLine className="fa-2x text-gray-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-4 static-card">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">Deals List</h6>
            <div>
              <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors me-2" onClick={openAddModal}>
                Add New Deal
              </button>
              <button
                className="btn-refresh"
                onClick={fetchDeals}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="card-body">
            {/* Stage filter removed as it's now handled by DataTable per-column filter */}
            {loading && !deals.length ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted">Loading deals...</p>
              </div>
            ) : (
              <DataTable columns={columns} data={deals} className="deals-datatable" />
            )}
          </div>
        </div>
      </div>

      {/* Modal for Add/Edit deal */}
      {showModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div
            className="card w-full max-w-2xl overflow-hidden animate-slideUp p-0 border-0"
            style={{ animation: 'slideUp 0.18s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 flex justify-between items-center border-b border-gray-100 bg-white">
              <h5 className="text-xl font-bold text-gray-900 m-0">
                {editingId ? 'Edit Deal' : 'Add New Deal'}
              </h5>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors border-0 bg-transparent p-1 rounded-full hover:bg-gray-100 flex items-center justify-center no-hover-shadow"
                onClick={closeModal}
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            <div className="px-8 py-8 overflow-y-auto max-h-[85vh]">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all font-semibold"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      required
                      placeholder=" Website Development Project"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                      placeholder="Add any project details or notes..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stage <span className="text-danger">*</span>
                    </label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                      value={formData.stage}
                      onChange={(e) => handleChange('stage', e.target.value as any)}
                      required
                    >
                      {STAGES.map(stage => (
                        <option key={stage.value} value={stage.value}>{stage.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                        value={formData.amount || ''}
                        onChange={(e) => handleChange('amount', e.target.value)}
                        placeholder="0.00"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">THB</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                      value={formData.probability || ''}
                      onChange={(e) => handleChange('probability', e.target.value)}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                      value={formData.expectedCloseDate || ''}
                      onChange={(e) => handleChange('expectedCloseDate', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                      value={formData.assignedTo || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const u = users.find(x => x.userId === val);
                        setFormData(prev => ({
                          ...prev,
                          assignedTo: val,
                          assignedToEmail: u?.email || ''
                        }));
                      }}
                    >
                      <option value="">Select User</option>
                      {users.map(u => (
                        <option key={u.userId} value={u.userId}>{u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Related To</label>
                    <div className="flex gap-4">
                      <select
                        className="w-1/3 px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                        value={formData.relatedTo || ''}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setFormData(prev => ({ ...prev, relatedTo: val, relatedId: '' }));
                        }}
                      >
                        <option value="">None</option>
                        <option value="company">Company</option>
                        <option value="contact">Contact</option>
                      </select>
                      <select
                        className={`flex-1 px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all ${!formData.relatedTo ? 'text-gray-400' : 'text-gray-900'}`}
                        value={formData.relatedId || ''}
                        onChange={(e) => handleChange('relatedId', e.target.value)}
                        disabled={!formData.relatedTo}
                      >
                        <option value="">Select Related</option>
                        {formData.relatedTo === 'company' && companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name || c.branchName}</option>
                        ))}
                        {formData.relatedTo === 'contact' && contacts.map(c => (
                          <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center leading-none"
                    disabled={submitting}
                    style={{ lineHeight: 1 }}
                  >
                    {submitting
                      ? 'Saving...'
                      : editingId
                        ? 'Save Changes'
                        : 'Add Deal'}
                  </button>
                  <button
                    type="button"
                    className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all flex items-center justify-center leading-none"
                    onClick={closeModal}
                    disabled={submitting}
                    style={{ lineHeight: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewingDeal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingDeal(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 flex justify-between items-center border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <FiEye className="text-xl" />
                </div>
                <h5 className="text-xl font-bold text-gray-900 m-0">Deal Details</h5>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors border-0 bg-transparent p-1 rounded-full hover:bg-gray-100 flex items-center justify-center no-hover-shadow"
                onClick={() => setViewingDeal(null)}
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            {/* Body */}
            <div className="px-8 py-8 overflow-y-auto max-h-[75vh]">
              {/* Title & Stage Badge */}
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h4 className="text-2xl font-bold text-gray-900 m-0">{viewingDeal.title}</h4>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStageInfo(viewingDeal.stage).color}`}>
                    {getStageInfo(viewingDeal.stage).label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {viewingDeal.amount ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: viewingDeal.currency || 'THB' }).format(viewingDeal.amount) : 'No Amount'}
                  </span>
                  {viewingDeal.probability && (
                    <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Probability: {viewingDeal.probability}%
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {viewingDeal.description && (
                <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-100">
                  <h6 className="text-blue-600 font-semibold mb-2 text-sm uppercase tracking-wider">Description</h6>
                  <p className="text-gray-700 whitespace-pre-wrap m-0 leading-relaxed">
                    {viewingDeal.description}
                  </p>
                </div>
              )}

              {/* Grid Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Expected Close */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <div className="flex items-center gap-2 mb-1 text-amber-800 font-semibold text-sm">
                    <FaClock /> Expected Close Date
                  </div>
                  <p className="text-gray-800 font-medium m-0">{viewingDeal.expectedCloseDate ? formatToDDMMYYYY(viewingDeal.expectedCloseDate) : '-'}</p>
                </div>

                {/* Assigned To */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-gray-500 font-semibold mb-1 text-sm uppercase tracking-wider">Assigned To</div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                      {(() => {
                        const assignedUser = users.find(u => (u.id || u.userId) === viewingDeal.assignedTo);
                        if (assignedUser) return (assignedUser.firstName?.charAt(0) || assignedUser.email?.charAt(0) || '?').toUpperCase();
                        if (viewingDeal.assignedToEmail) return viewingDeal.assignedToEmail.charAt(0).toUpperCase();
                        if (viewingDeal.assignedTo && viewingDeal.assignedTo.includes('@')) return viewingDeal.assignedTo.charAt(0).toUpperCase();
                        return '?';
                      })()}
                    </div>
                    <span className="text-gray-800 font-medium truncate">
                      {(() => {
                        const assignedUser = users.find(u => (u.id || u.userId) === viewingDeal.assignedTo);
                        if (assignedUser) {
                          const name = `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim();
                          return name || assignedUser.email || viewingDeal.assignedToEmail || '-';
                        }
                        return viewingDeal.assignedToEmail || (viewingDeal.assignedTo && viewingDeal.assignedTo.includes('@') ? viewingDeal.assignedTo : '-');
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Related To Section */}
              {viewingDeal.relatedTo && viewingDeal.relatedId && (
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 mb-6 flex items-center justify-between">
                  <div>
                    <div className="text-blue-600 font-semibold text-xs uppercase tracking-wider mb-1">Related {viewingDeal.relatedTo}</div>
                    <div className="text-gray-900 font-bold text-lg">
                      {viewingDeal.relatedTo === 'contact' && relatedContact ? (
                        <span>{relatedContact.firstName} {relatedContact.lastName}</span>
                      ) : viewingDeal.relatedTo === 'company' && relatedCompany ? (
                        <span>{relatedCompany.name}</span>
                      ) : (
                        <span className="text-gray-500">{viewingDeal.relatedId}</span>
                      )}
                    </div>
                  </div>
                  {(viewingDeal.relatedTo === 'contact' && relatedContact) || (viewingDeal.relatedTo === 'company' && relatedCompany) ? (
                    <button
                      className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors shadow-sm flex items-center gap-2"
                      onClick={() => setShowRelatedModal(true)}
                    >
                      <FaEye /> View Profile
                    </button>
                  ) : null}
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-gray-100">
                <div>
                  <div className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Created At</div>
                  <div className="text-gray-500 text-xs">
                    {viewingDeal.createdAt ? new Date(viewingDeal.createdAt).toLocaleString('th-TH') : '-'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Last Updated</div>
                  <div className="text-gray-500 text-xs">
                    {viewingDeal.updatedAt ? new Date(viewingDeal.updatedAt).toLocaleString('th-TH') : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-8 py-6 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 transition-all flex items-center justify-center min-w-[100px]"
                onClick={() => setViewingDeal(null)}
              >
                Close
              </button>
              {((user?.role === 'admin') || (user?.role === 'superadmin') || (viewingDeal.assignedTo === user?.userId)) && (
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-2 min-w-[100px] justify-center"
                  onClick={() => { setViewingDeal(null); handleEdit(viewingDeal); }}
                >
                  <FiEdit2 /> Edit Deal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showRelatedModal && (relatedContact || relatedCompany) && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowRelatedModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 flex justify-between items-center border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <FiEye className="text-xl" />
                </div>
                <h5 className="text-xl font-bold text-gray-900 m-0">
                  {relatedContact ? 'Contact Details' : 'Company Details'}
                </h5>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors border-0 bg-transparent p-1 rounded-full hover:bg-gray-100 flex items-center justify-center no-hover-shadow"
                onClick={() => setShowRelatedModal(false)}
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            {/* Body */}
            <div className="px-8 py-8 overflow-y-auto max-h-[75vh]">
              {relatedContact ? (
                <>
                  <div className="mb-6">
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">{relatedContact.firstName} {relatedContact.lastName}</h4>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Contact</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {relatedContact.phone && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-1">Phone</div>
                        <div className="text-gray-900 font-medium">{relatedContact.phone}</div>
                      </div>
                    )}
                    {relatedContact.address && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 col-span-1 md:col-span-2">
                        <div className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-1">Address</div>
                        <div className="text-gray-900 font-medium leading-relaxed">{relatedContact.address}</div>
                      </div>
                    )}
                  </div>
                </>
              ) : relatedCompany ? (
                <>
                  <div className="mb-6">
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">{relatedCompany.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${relatedCompany.type === 'company' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                      {relatedCompany.type === 'company' ? 'Company' : 'Individual'}
                    </span>
                  </div>

                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h6 className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-3">Basic Information</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {relatedCompany.address && (
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 col-span-1 md:col-span-2">
                            <div className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-1">Address</div>
                            <div className="text-gray-900">{relatedCompany.address}</div>
                          </div>
                        )}
                        {relatedCompany.phone && (
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-1">Phone</div>
                            <div className="text-gray-900">{relatedCompany.phone}</div>
                          </div>
                        )}
                        {relatedCompany.taxId && (
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-1">Tax ID</div>
                            <div className="text-gray-900">{relatedCompany.taxId}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Billing info if exists */}
                    {(relatedCompany.billingCycle || relatedCompany.billingDate) && (
                      <div>
                        <h6 className="text-amber-600 font-bold text-sm uppercase tracking-widest mb-3">Billing Information</h6>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {relatedCompany.billingCycle && (
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                              <div className="text-amber-700 font-semibold text-[10px] uppercase tracking-wider mb-1">Cycle</div>
                              <div className="text-amber-900 font-bold capitalize">{relatedCompany.billingCycle}</div>
                            </div>
                          )}
                          {relatedCompany.billingDate && (
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                              <div className="text-amber-700 font-semibold text-[10px] uppercase tracking-wider mb-1">Billing Date</div>
                              <div className="text-amber-900 font-bold">Day {relatedCompany.billingDate}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="px-8 py-6 bg-gray-50 flex justify-end border-t border-gray-100">
              <button
                type="button"
                className="px-8 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 transition-all flex items-center justify-center shadow-sm"
                onClick={() => setShowRelatedModal(false)}
              >
                Close
              </button>
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

