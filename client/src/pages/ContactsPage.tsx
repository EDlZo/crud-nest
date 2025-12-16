import { FormEvent, useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiFilter } from 'react-icons/fi';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatDate';
import { getAvatarColor } from '../utils/avatarColor';

type Contact = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  photo?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  userEmail?: string;
  updatedByEmail?: string;
};

const emptyContact: Contact = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  photo: '',
};

const withBase = (path: string) => `${API_BASE_URL}${path}`;

type FilterState = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export const ContactsPage = () => {
  const { token, user, logout } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [openCompaniesFor, setOpenCompaniesFor] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Contact>(emptyContact);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [popupCompanies, setPopupCompanies] = useState<any[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [filters, setFilters] = useState<FilterState>({ name: '', email: '', phone: '', address: '' });
  const [activeFilter, setActiveFilter] = useState<keyof FilterState | null>(null);

  const performLogout = () => {
    setContacts([]);
    logout();
  };

  const handleUnauthorized = () => {
    setError('Session expired. Please log in again');
    performLogout();
  };

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(withBase('/cruds'), {
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
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCompanies = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(withBase('/companies'), { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const data = await response.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      // ignore companies fetch errors for now
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
    fetchCompanies();
  }, [fetchContacts, fetchCompanies]);

  // Close popup when clicking outside or pressing Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!openCompaniesFor) return;
      const el = popupRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpenCompaniesFor(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCompaniesFor(null);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openCompaniesFor]);

  const handleChange = (key: keyof Contact, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyContact);
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

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      photo: formData.photo || '',
    };

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.phone || !payload.address) {
      setError('Please fill out all fields');
      setSubmitting(false);
      return;
    }

    console.log('Submitting payload:', { ...payload, photo: payload.photo ? `[base64 ${payload.photo.length} chars]` : 'empty' });

    // If photo is present, check approximate size to avoid exceeding server body limits
    if (payload.photo) {
      // base64 string like 'data:image/jpeg;base64,/9j/...' -> estimate bytes from length
      const base64data = payload.photo.split(',')[1] ?? payload.photo;
      const approxBytes = Math.ceil((base64data.length * 3) / 4);
      const approxKB = Math.round(approxBytes / 1024);
      console.log(`Photo approx size: ${approxKB} KB`);
      const MAX_KB = 300; // client-side limit to avoid large payloads
      if (approxKB > MAX_KB) {
        const proceed = window.confirm(
          `The selected photo is large (~${approxKB} KB). Sending it may fail. Continue without photo? (OK = yes, Cancel = keep photo)`,
        );
        if (proceed) {
          delete (payload as any).photo;
          setPhotoPreview('');
        }
      }
    }

    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(
        withBase(`/cruds${isEdit ? `/${editingId}` : ''}`),
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
      if (response.status === 403) {
        throw new Error('You do not have permission to edit this record');
      }

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        console.error('Error response:', body);
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }

      const saved = (await response.json()) as Contact;
      console.log('Saved contact:', saved);

      if (isEdit) {
        setContacts((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      } else {
        setContacts((prev) => [saved, ...prev]);
      }
      resetForm();
      setShowModal(false);
    } catch (err) {
      console.error('Submit error:', err);
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id ?? null);
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      photo: contact.photo,
      id: contact.id,
    });
    setPhotoPreview(contact.photo || '');
    setShowModal(true);
  };

  const handleDelete = async (id?: string) => {
    if (!token || !id) return;
    const confirmed = window.confirm('Are you sure you want to delete this record?');
    if (!confirmed) return;

    try {
      const response = await fetch(withBase(`/cruds/${id}`), {
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
        throw new Error('You do not have permission to delete this record');
      }
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }
      setContacts((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
      // Notify other pages that contacts have changed so they can refresh related lists
      try {
        window.dispatchEvent(new CustomEvent('contacts:changed'));
      } catch (e) {
        // ignore in non-browser environments
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Filter contacts based on search and column filters
  const filteredContacts = contacts.filter((contact) => {
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();

    // Column filters
    if (filters.name && !fullName.includes(filters.name.toLowerCase())) return false;
    if (filters.email && !contact.email?.toLowerCase().includes(filters.email.toLowerCase())) return false;
    if (filters.phone && !contact.phone?.toLowerCase().includes(filters.phone.toLowerCase())) return false;
    if (filters.address && !contact.address?.toLowerCase().includes(filters.address.toLowerCase())) return false;

    // Global search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        fullName.includes(searchLower) ||
        contact.phone?.toLowerCase().includes(searchLower) ||
        contact.address?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const clearFilter = (field: keyof FilterState) => {
    setFilters(prev => ({ ...prev, [field]: '' }));
    setActiveFilter(null);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({ name: '', email: '', phone: '', address: '' });
    setActiveFilter(null);
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const renderFilterDropdown = (field: keyof FilterState, label: string) => {
    const isActive = activeFilter === field;
    const hasValue = filters[field] !== '';

    return (
      <div className="position-relative d-inline-block">
        <div
          className="d-flex align-items-center gap-2"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveFilter(isActive ? null : field)}
        >
          {label}
          <FiFilter
            size={14}
            className={hasValue ? 'text-primary' : 'text-muted'}
            style={{ cursor: 'pointer' }}
          />
        </div>
        {isActive && (
          <div
            className="position-fixed bg-white shadow-lg rounded p-3"
            style={{
              zIndex: 9999,
              minWidth: '220px',
              border: '1px solid #e5e7eb',
              marginTop: '8px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={`Filter by ${label.toLowerCase()}...`}
                value={filters[field]}
                onChange={(e) => handleFilterChange(field, e.target.value)}
                autoFocus
              />
            </div>
            <div className="d-flex justify-content-between">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => clearFilter(field)}
              >
                Clear
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setActiveFilter(null)}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContacts = filteredContacts.slice(startIndex, startIndex + itemsPerPage);

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="d-flex justify-content-between align-items-center mt-4">
        <div className="text-muted">
          {filteredContacts.length} contacts in total
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          {startPage > 1 && (
            <>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(1)}>1</button>
              {startPage > 2 && <span className="px-2">...</span>}
            </>
          )}
          {pages.map(page => (
            <button
              key={page}
              className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-2">...</span>}
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
            </>
          )}
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value={10}>10 / page</option>
            <option value={12}>12 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container-fluid">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Contacts</h1>
          <div>
            <button className="btn btn-add me-2" onClick={openAddModal}>+ Add New Contact</button>
            <button className="btn btn-outline-secondary" onClick={fetchContacts} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mb-3 d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted">Filters:</span>
            {Object.entries(filters).map(([key, value]) =>
              value && (
                <span key={key} className="badge bg-primary d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
                  {key}: {value}
                  <button
                    className="btn-close btn-close-white"
                    style={{ fontSize: '0.6rem', marginLeft: '0.25rem' }}
                    onClick={() => clearFilter(key as keyof FilterState)}
                  />
                </span>
              )
            )}
            <button className="btn btn-sm btn-outline-secondary" onClick={clearAllFilters}>
              Clear All
            </button>
          </div>
        )}

        {/* Contact Table */}
        <div className="card shadow-lg border-0">
          <div className="card-body p-0">
            {contacts.length === 0 && !loading ? (
              <p className="text-center py-5">No contacts yet. Try adding a new one.</p>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fafafa' }}>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          {renderFilterDropdown('name', 'Name')}
                        </th>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          {renderFilterDropdown('email', 'Email')}
                        </th>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          {renderFilterDropdown('phone', 'Phone')}
                        </th>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          {renderFilterDropdown('address', 'Address')}
                        </th>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          บริษัท
                        </th>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          Last Updated
                        </th>
                        <th className="border-0 py-3 px-4 text-center" style={{ fontWeight: 500, color: '#374151' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedContacts.map((contact) => {
                        const canModify =
                          user?.role === 'admin' || user?.role === 'superadmin' || contact.userId === user?.userId;

                        // Generate pastel avatar color using shared util
                        const avatarColor = getAvatarColor(contact.firstName || contact.email || '');

                        return (
                          <tr key={contact.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td className="py-3 px-4 border-0">
                              <div className="d-flex align-items-center">
                                {contact.photo ? (
                                  <img
                                    src={contact.photo}
                                    alt={`${contact.firstName} ${contact.lastName}`}
                                    className="rounded-circle me-3"
                                    style={{ width: 40, height: 40, objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center me-3 text-white fw-semibold"
                                    style={{
                                      width: 40,
                                      height: 40,
                                      backgroundColor: avatarColor,
                                      fontSize: 16,
                                    }}
                                  >
                                    {contact.firstName?.charAt(0).toUpperCase() || 'C'}
                                  </div>
                                )}
                                <span style={{ fontWeight: 500, color: '#111827' }}>
                                  {contact.firstName} {contact.lastName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 border-0" style={{ color: '#6b7280' }}>
                              {contact.email ?? '-'}
                            </td>
                            <td className="py-3 px-4 border-0" style={{ color: '#6b7280' }}>
                              {contact.phone ?? '-'}
                            </td>
                            <td className="py-3 px-4 border-0" style={{ color: '#6b7280' }}>
                              {contact.address ?? '-'}
                            </td>
                            <td className="py-3 px-4 border-0" style={{ color: '#6b7280', position: 'relative' }}>
                              {(() => {
                                // find all companies that list this contact in their contacts array
                                const found = companies.filter(c => Array.isArray(c.contacts) && c.contacts.includes(contact.id));
                                if (!found || found.length === 0) return '-';
                                const first = found[0];
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span
                                      role="button"
                                      onClick={() => navigate(`/companies/${first.id}`)}
                                      style={{ cursor: 'pointer', color: '#6b7280', textDecoration: 'none', fontWeight: 500 }}
                                    >
                                      {first.name || first.branchName || first.id}
                                    </span>
                                    {found.length > 1 && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const next: string | null = openCompaniesFor === contact.id ? null : (contact.id ?? null);
                                          const el = e.currentTarget as HTMLElement;
                                          const rect = el.getBoundingClientRect();
                                          setPopupPosition({ x: rect.left + rect.width / 2, y: rect.bottom });
                                          setPopupCompanies(found);
                                          setOpenCompaniesFor(next);
                                        }}
                                        aria-expanded={openCompaniesFor === contact.id}
                                      >
                                        +{found.length - 1}
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-4 border-0" style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                  <span title={typeof contact.updatedAt === 'string' ? contact.updatedAt : JSON.stringify(contact.updatedAt)}>
                                    {formatDateTime(contact.updatedAt)}
                                  </span>
                            </td>
                            <td className="py-3 px-4 border-0 text-center">
                              {canModify ? (
                                <div className="d-flex justify-content-center gap-1">
                                  <button className="icon-btn edit" aria-label="edit" title="Edit" onClick={() => handleEdit(contact)}>
                                    <FiEdit2 />
                                  </button>
                                  <button className="icon-btn delete" aria-label="delete" title="Delete" onClick={() => handleDelete(contact.id)}>
                                    <FiTrash2 />
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
                {renderPagination()}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Portal popup rendered at body so it's not affected by card stacking contexts */}
      {openCompaniesFor && popupCompanies && popupPosition && createPortal(
        <div
          ref={popupRef}
          className="shadow-lg bg-white rounded"
          style={{
            position: 'fixed',
            top: popupPosition.y + 8,
            left: popupPosition.x - 110,
            zIndex: 2147483647,
            minWidth: 220,
            border: '1px solid #e5e7eb',
            padding: 8,
          }}
        >
          {popupCompanies.map((c, idx) => (
            <div key={c.id || idx} style={{ padding: '6px 8px', cursor: 'pointer' }}
              onClick={() => { navigate(`/companies/${c.id}`); setOpenCompaniesFor(null); setPopupCompanies(null); }}
            >
              {c.name || c.branchName || c.id}
            </div>
          ))}
        </div>,
        document.body
      )}
      {/* Modal for Add/Edit contact */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingId ? 'Edit Contact' : 'Add New Contact'}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    {/* Photo Upload */}
                    <div className="col-md-12 mb-4 text-center">
                      <label className="form-label d-block">Profile Photo</label>
                      <div className="mb-3">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="rounded-circle"
                            style={{ width: 100, height: 100, objectFit: 'cover', border: '2px solid #ddd' }}
                          />
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center rounded-circle text-white fw-semibold"
                            style={{ width: 100, height: 100, backgroundColor: getAvatarColor(formData.firstName || formData.email || ''), fontSize: 36, border: '2px solid #ddd' }}
                          >
                            {formData.firstName?.charAt(0).toUpperCase() || (formData.email ? formData.email.charAt(0).toUpperCase() : 'C')}
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
                            // Compress and convert to base64
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new Image();
                              img.onload = () => {
                                // Create canvas to resize image
                                const canvas = document.createElement('canvas');
                                const MAX_WIDTH = 400;
                                const MAX_HEIGHT = 400;
                                let width = img.width;
                                let height = img.height;

                                // Calculate new dimensions
                                if (width > height) {
                                  if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                  }
                                } else {
                                  if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                  }
                                }

                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx?.drawImage(img, 0, 0, width, height);

                                // Convert to base64 with compression
                                const base64String = canvas.toDataURL('image/jpeg', 0.7);
                                handleChange('photo', base64String);
                                setPhotoPreview(base64String);
                              };
                              img.src = event.target?.result as string;
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <small className="text-muted">Upload a photo from your device (JPG, PNG, etc.)</small>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Address</label>
                      <textarea
                        className="form-control"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  {error && <div className="alert alert-danger">{error}</div>}
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Add contact'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>
                      Cancel
                    </button>
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

