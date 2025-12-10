import { FormEvent, useCallback, useEffect, useState } from 'react';
import { FaEye, FaEllipsisV, FaPlus } from 'react-icons/fa';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
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
  amountDue?: number;
  billingCycle?: 'monthly' | 'yearly' | 'quarterly';
  createdAt?: string;
  updatedAt?: string;
  ownerUserId?: string;
  ownerEmail?: string;
  updatedByEmail?: string;
  contacts?: string[];
  avatarUrl?: string;
  openDealsAmount?: number;
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
  avatarUrl: '',
};

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const CompaniesPage = () => {
  // Inline edit state for amountDue, billingDate, notificationDate
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const startInlineEdit = (company: Company, field: string) => {
    setEditingId(company.id ?? null);
    setEditField(field);
    setEditValue(field === 'amountDue' ? (company.amountDue?.toString() ?? '') : (company[field as keyof Company]?.toString() ?? ''));
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditField(null);
    setEditValue('');
  };

  const saveInlineField = async (company: Company, field: string) => {
    if (!company.id || !token) return;
    let value: any = editValue;
    if (field === 'amountDue') value = parseFloat(editValue);
    if ((field === 'billingDate' || field === 'notificationDate') && (parseInt(editValue) < 1 || parseInt(editValue) > 31)) return;
    try {
      const res = await fetch(withBase(`/companies/${company.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCompanies((prev) => prev.map((c) => (c.id === company.id ? updated : c)));
        cancelInlineEdit();
      }
    } catch (err) {
      // handle error
    }
  };
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
  const [filterBillingDue, setFilterBillingDue] = useState<string>('all');
  const [contacts, setContacts] = useState<any[]>([]);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string>('');

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
    setPhotoPreview('');
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
      type: formData.type || undefined,
      name: formData.name.trim(),
      address: formData.address?.trim() || undefined,
      phone: formData.phone?.trim() || undefined,
      fax: formData.fax?.trim() || undefined,
      taxId: formData.taxId?.trim() || undefined,
      billingDate: formData.billingDate || undefined,
      notificationDate: formData.notificationDate || undefined,
      billingCycle: formData.billingCycle || undefined,
      avatarUrl: formData.avatarUrl || undefined,
    };

    // เพิ่ม branch fields เฉพาะเมื่อเป็น company
    if (formData.type === 'company') {
      payload.branchName = formData.branchName?.trim() || undefined;
      payload.branchNumber = formData.branchNumber?.trim() || undefined;
    }

    // Debug log
    console.log('Submitting payload:', payload);

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
      avatarUrl: company.avatarUrl || '',
      id: company.id,
    });
    setPhotoPreview(company.avatarUrl || '');
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
      <div className="flex flex-col gap-6 px-8 py-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <button
            className="px-4 py-2 rounded-lg bg-[#3869a9] text-white font-medium shadow"
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17 }}
            onClick={openAddModal}
          >

            + Add New Company
          </button>
          <div className="flex items-center gap-2">
            <select
              className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring focus:border-blue-400 bg-white"
              value={filterBillingDue}
              onChange={(e) => setFilterBillingDue(e.target.value)}
              style={{ minWidth: 150 }}
            >
              <option value="all">All Billing Dates</option>
              <option value="today">Due Today</option>
              <option value="week">Due This Week</option>
            </select>
            <input
              type="text"
              className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring focus:border-blue-400"
              placeholder="Search by name"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ minWidth: 220 }}
            />
          </div>
        </div>
        {error && <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{error}</div>}
        {companies.length === 0 && !loading ? (
          <p className="text-center text-gray-500">There is no company information yet. Try adding new information.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {companies
              .filter((company) => {
                if (searchTerm) {
                  const searchLower = searchTerm.toLowerCase();
                  const matchesSearch = company.name?.toLowerCase().includes(searchLower);
                  if (!matchesSearch) return false;
                }
                if (filterType !== 'all' && company.type !== filterType) return false;

                // Billing Due Filter
                if (filterBillingDue !== 'all') {
                  const billingDay = parseInt(company.billingDate || '0');
                  if (!billingDay) return false;

                  const today = new Date();

                  if (filterBillingDue === 'today') {
                    if (billingDay !== today.getDate()) return false;
                  } else if (filterBillingDue === 'week') {
                    // Calculate days in current week (Sunday to Saturday)
                    const currentDay = today.getDay(); // 0 (Sun) - 6 (Sat)
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - currentDay);

                    const daysInWeek: number[] = [];
                    for (let i = 0; i < 7; i++) {
                      const d = new Date(startOfWeek);
                      d.setDate(startOfWeek.getDate() + i);
                      daysInWeek.push(d.getDate());
                    }

                    if (!daysInWeek.includes(billingDay)) return false;
                  }
                }

                return true;
              })
              .map((company) => {
                const canModify = user?.role === 'admin' || user?.role === 'superadmin' || company.ownerUserId === user?.userId;
                const relatedContacts = Array.isArray(company.contacts) ? company.contacts : [];
                // กำหนดสี pastel สำหรับ avatar เหมือนหน้า ContactsPage/Topbar
                const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3d8', '#60a5fa', '#a78bfa', '#f472b6'];
                const colorIndex = (company.name?.charCodeAt(0) || 0) % colors.length;
                const avatarColor = colors[colorIndex];
                return (
                  <div key={company.id} className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      {company.avatarUrl ? (
                        <img src={company.avatarUrl} alt={company.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {company.name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-lg">{company.name}</div>
                        <div className="text-gray-500 text-sm">{company.type === 'company' ? 'Company' : 'Individual'}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div>
                        <div className="text-gray-500 text-xs uppercase tracking-wider font-medium mb-1">Billing Date</div>
                        <div className="font-bold text-gray-800 flex items-center gap-1">
                          <span className="text-lg">{company.billingDate ? company.billingDate : '-'}</span>
                          {company.billingDate && <span className="text-xs text-gray-500 font-normal">of month</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-500 text-xs uppercase tracking-wider font-medium mb-1">Amount Due</div>
                        <div className="font-bold text-lg text-primary">
                          ฿{typeof company.amountDue === 'number' && !isNaN(company.amountDue)
                            ? company.amountDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '0.00'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="text-gray-500 text-sm">Related contacts</div>
                      <div className="flex items-center ml-2">
                        {relatedContacts.slice(0, 4).map((cid: string, idx: number) => {
                          const c = contacts.find((x) => x.id === cid);
                          const hasPhoto = c?.avatarUrl || c?.photo;
                          const firstLetter = c?.firstName?.charAt(0).toUpperCase() || 'C';
                          // ใช้ชุดสี pastel และ logic เดียวกับ ContactsPage
                          const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3d8', '#60a5fa', '#a78bfa', '#f472b6'];
                          const colorIndex = (c?.firstName?.charCodeAt(0) || 0) % colors.length;
                          const avatarColor = colors[colorIndex];
                          return hasPhoto ? (
                            <img
                              key={cid}
                              src={c?.avatarUrl || c?.photo}
                              alt={c?.firstName || c?.email || 'contact'}
                              className="w-7 h-7 rounded-full border-2 border-white -ml-2 first:ml-0 object-cover"
                            />
                          ) : (
                            <div
                              key={cid}
                              className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold border-2 border-white -ml-2 first:ml-0 text-xs"
                              style={{ backgroundColor: avatarColor }}
                            >
                              {firstLetter}
                            </div>
                          );
                        })}
                        {relatedContacts.length > 4 && (
                          <div className="w-7 h-7 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold border-2 border-white -ml-2 text-xs">
                            +{relatedContacts.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-auto">
                      <button className="btn btn-sm btn-outline-primary d-flex align-items-center text-nowrap" onClick={() => { setActiveCompany(company); setSelectedContactIds(Array.isArray(company.contacts) ? company.contacts : []); setShowContactsModal(true); }}>
                        <FaPlus className="me-1" /> Add contacts
                      </button>
                      {canModify && (
                        <Dropdown drop="start">
                          <Dropdown.Toggle
                            as="span"
                            id={`dropdown-${company.id}`}
                            className="no-caret"
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            bsPrefix="dropdown-toggle-no-caret"
                          >
                            <FaEllipsisV className="text-muted" />
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            <Dropdown.Item onClick={() => navigate(`/companies/${company.id}`)}>
                              <FaEye className="me-2 text-secondary" /> View Company
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleDelete(company.id)} className="text-danger">
                              <FiTrash2 className="me-2" /> Delete
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
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
                    {/* Company Logo Upload */}
                    <div className="col-md-12 mb-4 text-center">
                      <label className="form-label d-block">Company Logo</label>
                      <div className="mb-3">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="d-block mx-auto"
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #ddd' }}
                          />
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center mx-auto text-white fw-bold"
                            style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#dc3545', fontSize: 32 }}
                          >
                            {formData.name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new Image();
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_SIZE = 400;
                                let width = img.width;
                                let height = img.height;
                                if (width > height) {
                                  if (width > MAX_SIZE) {
                                    height *= MAX_SIZE / width;
                                    width = MAX_SIZE;
                                  }
                                } else {
                                  if (height > MAX_SIZE) {
                                    width *= MAX_SIZE / height;
                                    height = MAX_SIZE;
                                  }
                                }
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx?.drawImage(img, 0, 0, width, height);
                                const base64String = canvas.toDataURL('image/jpeg', 0.7);
                                handleChange('avatarUrl', base64String);
                                setPhotoPreview(base64String);
                              };
                              img.src = event.target?.result as string;
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <small className="text-muted">Upload a company logo (JPG, PNG)</small>
                    </div>
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
                      <hr /> <br />
                      <h6 className="mb-3">Billing Information</h6>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label">Billing Date</label>
                      <select
                        className="form-select"
                        value={formData.billingDate || ''}
                        onChange={(e) => handleChange('billingDate', e.target.value)}
                      >
                        <option value="">Select day...</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={String(day)}>{day}</option>
                        ))}
                      </select>
                      <small className="form-text text-muted">วันที่เรียกเก็บเงินในแต่ละรอบ</small>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Notification Date</label>
                      <select
                        className="form-select"
                        value={formData.notificationDate || ''}
                        onChange={(e) => handleChange('notificationDate', e.target.value)}
                      >
                        <option value="">Select day...</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={String(day)}>{day}</option>
                        ))}
                      </select>
                      <small className="form-text text-muted">วันที่แจ้งเตือนก่อนถึงกำหนด</small>
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
                      <label className="form-check-label ms-2 d-flex align-items-center" htmlFor={`contact_${c.id}`}>
                        {(c.avatarUrl || c.photo) ? (
                          <img src={c.avatarUrl || c.photo} alt={c.firstName || c.email} style={{ width: 28, height: 28, borderRadius: '50%', marginRight: 8 }} />
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#dc3545', marginRight: 8, fontSize: 12 }}
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
      )}
    </>
  );
};

