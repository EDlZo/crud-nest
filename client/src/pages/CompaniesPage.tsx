import { FormEvent, useCallback, useEffect, useState } from 'react';
import { FaPen, FaTrash } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type Company = {
  id?: string;
  name: string;
  address: string;
  phone: string;
  fax?: string;
  taxId?: string;
  branchName?: string;
  branchNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  userEmail?: string;
  updatedByEmail?: string;
};

const emptyCompany: Company = {
  name: '',
  address: '',
  phone: '',
  fax: '',
  taxId: '',
  branchName: '',
  branchNumber: '',
};

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const CompaniesPage = () => {
  const { token, user, logout } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState<Company>(emptyCompany);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      const res = await fetch(withBase('/companies'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.status === 403) {
        throw new Error('You do not have permission to access this resource');
      }
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await res.json() : await res.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }
      const data = await res.json();
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      phone: formData.phone.trim(),
      fax: formData.fax?.trim(),
      taxId: formData.taxId?.trim(),
      branchName: formData.branchName?.trim(),
      branchNumber: formData.branchNumber?.trim(),
    };

    if (!payload.name || !payload.address || !payload.phone) {
      setError('Please fill out company name, address and phone');
      setSubmitting(false);
      return;
    }

    try {
      const isEdit = Boolean(editingId);
      const res = await fetch(withBase(`/companies${isEdit ? `/${editingId}` : ''}`), {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.status === 403) {
        throw new Error('You do not have permission to modify this record');
      }
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await res.json() : await res.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }

      const saved = await res.json();
      if (isEdit) {
        setCompanies((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
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

  const handleEdit = (c: Company) => {
    setEditingId(c.id ?? null);
    setFormData({
      name: c.name,
      address: c.address,
      phone: c.phone,
      fax: c.fax ?? '',
      taxId: c.taxId ?? '',
      branchName: c.branchName ?? '',
      branchNumber: c.branchNumber ?? '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id?: string) => {
    if (!token || !id) return;
    const confirmed = window.confirm('Are you sure you want to delete this company?');
    if (!confirmed) return;

    try {
      const res = await fetch(withBase(`/companies/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (res.status === 403) {
        throw new Error('You do not have permission to delete this record');
      }
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await res.json() : await res.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }
      setCompanies((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <div className="container-fluid">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Companies</h1>
        </div>

        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">Company List</h6>
            <div>
              <button className="btn btn-sm btn-primary me-2" onClick={openAddModal}>Add New Company</button>
              <button className="btn btn-sm btn-info" onClick={fetchCompanies} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
            </div>
          </div>
          <div className="card-body">
            {companies.length === 0 && !loading ? (
              <p className="text-center">No companies yet. Try adding a new one.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered" width="100%" cellSpacing={0}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Tax ID</th>
                      <th>Branch</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c) => {
                      const canModify = user?.role === 'admin' || user?.role === 'superadmin' || c.userId === user?.userId;
                      return (
                        <tr key={c.id}>
                          <td><strong>{c.name}</strong></td>
                          <td>{c.phone}</td>
                          <td>{c.address}</td>
                          <td>{c.taxId ?? '-'}</td>
                          <td>{c.branchName ? `${c.branchName} (${c.branchNumber ?? '-'})` : '-'}</td>
                          <td>{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : '-'}</td>
                          <td>
                            {canModify ? (
                              <div className="btn-group">
                                <button className="icon-btn edit" aria-label="edit" title="Edit" onClick={() => handleEdit(c)}>
                                  <FaPen />
                                </button>
                                <button className="icon-btn delete" aria-label="delete" title="Delete" onClick={() => handleDelete(c.id)}>
                                  <FaTrash />
                                </button>
                              </div>
                            ) : (
                              <span className="badge bg-secondary">No permission</span>
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

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingId ? 'Edit Company' : 'Add New Company'}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Company Name</label>
                      <input type="text" className="form-control" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Tax ID</label>
                      <input className="form-control" value={formData.taxId} onChange={(e) => handleChange('taxId', e.target.value)} />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Branch Name</label>
                      <input className="form-control" value={formData.branchName} onChange={(e) => handleChange('branchName', e.target.value)} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Branch Number</label>
                      <input className="form-control" value={formData.branchNumber} onChange={(e) => handleChange('branchNumber', e.target.value)} />
                    </div>

                    <div className="col-md-12 mb-3">
                      <label className="form-label">Address</label>
                      <textarea className="form-control" rows={3} value={formData.address} onChange={(e) => handleChange('address', e.target.value)} />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone</label>
                      <input className="form-control" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Fax</label>
                      <input className="form-control" value={formData.fax} onChange={(e) => handleChange('fax', e.target.value)} />
                    </div>
                  </div>

                  {error && <div className="alert alert-danger">{error}</div>}

                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : editingId ? 'Save changes' : 'Add company'}</button>
                    <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
