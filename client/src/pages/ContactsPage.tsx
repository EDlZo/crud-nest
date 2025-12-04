import { FormEvent, useCallback, useEffect, useState } from 'react';
import { FaPen, FaTrash } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

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

export const ContactsPage = () => {
  const { token, user, logout } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [formData, setFormData] = useState<Contact>(emptyContact);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string>('');

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

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

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
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <div className="container-fluid">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Contacts</h1>

        </div>

        {/* Add/Edit form is moved into a modal. Use the Add button to open it. */}

        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">Contact List</h6>
            <div>
              <button className="btn btn-sm btn-add me-2" onClick={openAddModal}>Add New Contect</button>
              <button style={{ color: '#ffff' }} className="btn btn-sm btn-info shadow-sm" onClick={fetchContacts} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="card-body">
            {/* Search */}
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Search</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, phone, address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {contacts.length === 0 && !loading ? (
              <p className="text-center">No contacts yet. Try adding a new one.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered" width="100%" cellSpacing={0}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Created By (email)</th>
                      <th>Last Updated By (email)</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts
                      .filter((contact) => {
                        if (!searchTerm) return true;
                        const searchLower = searchTerm.toLowerCase();
                        return (
                          `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchLower) ||
                          contact.phone?.toLowerCase().includes(searchLower) ||
                          contact.address?.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((contact) => {
                        const canModify =
                          user?.role === 'admin' || user?.role === 'superadmin' || contact.userId === user?.userId;
                        return (
                          <tr key={contact.id}>
                            <td>
                              <strong>
                                {contact.firstName} {contact.lastName}
                              </strong>
                            </td>
                            <td>{contact.phone}</td>
                            <td>{contact.address}</td>
                            <td>{contact.userEmail ?? '-'}</td>
                            <td>{contact.updatedByEmail ?? '-'}</td>
                            <td>
                              {contact.updatedAt ? new Date(contact.updatedAt).toLocaleString() : '-'}
                            </td>
                            <td>
                              {canModify ? (
                                <div className="btn-group">
                                  <button className="icon-btn edit" aria-label="edit" title="Edit" onClick={() => handleEdit(contact)}>
                                    <FaPen />
                                  </button>
                                  <button className="icon-btn delete" aria-label="delete" title="Delete" onClick={() => handleDelete(contact.id)}>
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
                        <img
                          src={photoPreview || '/default-avatar.png'}
                          alt="Preview"
                          className="rounded-circle"
                          style={{ width: 100, height: 100, objectFit: 'cover', border: '2px solid #ddd' }}
                        />
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

