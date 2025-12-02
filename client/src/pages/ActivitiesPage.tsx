import { FormEvent, useCallback, useEffect, useState } from 'react';
import { FaPen, FaTrash, FaCheck, FaClock, FaExclamationTriangle, FaEye } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type Activity = {
  id?: string;
  type: 'task' | 'call' | 'email' | 'meeting' | 'note';
  title: string;
  description?: string;
  relatedTo?: 'company' | 'contact' | 'deal';
  relatedId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  completedAt?: string;
  assignedTo?: string;
  assignedToEmail?: string;
  createdAt?: string;
  updatedAt?: string;
};

const emptyActivity: Activity = {
  type: 'task',
  title: '',
  description: '',
  status: 'pending',
  priority: 'medium',
};

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const ActivitiesPage = () => {
  const { token, user, logout } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [formData, setFormData] = useState<Activity>(emptyActivity);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [relatedContact, setRelatedContact] = useState<any | null>(null);
  const [relatedCompany, setRelatedCompany] = useState<any | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const performLogout = () => {
    setActivities([]);
    logout();
  };

  const handleUnauthorized = () => {
    setError('Session expired. Please log in again');
    performLogout();
  };

  const fetchActivities = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(withBase('/activities'), {
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
      let filteredData = Array.isArray(data) ? data : [];
      
      // Filter by type
      if (filterType !== 'all') {
        filteredData = filteredData.filter((activity: Activity) => activity.type === filterType);
      }
      
      // Filter by status
      if (filterStatus !== 'all') {
        filteredData = filteredData.filter((activity: Activity) => activity.status === filterStatus);
      }
      
      setActivities(filteredData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, filterType, filterStatus]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleChange = (key: keyof Activity, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyActivity);
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

  const handleEdit = (activity: Activity) => {
    // Keep dueDate as is - the input will handle the conversion
    setFormData(activity);
    setEditingId(activity.id || null);
    setShowModal(true);
    fetchCompaniesAndContacts();
  };

  const fetchRelatedData = async (relatedTo: string, relatedId: string) => {
    if (!token || !relatedId) return;
    try {
      if (relatedTo === 'contact') {
        const response = await fetch(withBase('/cruds'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const contacts = await response.json();
          const contact = Array.isArray(contacts) ? contacts.find((c: any) => c.id === relatedId) : null;
          setRelatedContact(contact);
        }
      } else if (relatedTo === 'company') {
        const response = await fetch(withBase('/companies'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const companies = await response.json();
          const company = Array.isArray(companies) ? companies.find((c: any) => c.id === relatedId) : null;
          setRelatedCompany(company);
        }
      }
    } catch (err) {
      console.error('Error fetching related data:', err);
    }
  };

  const handleViewActivity = (activity: Activity) => {
    setViewingActivity(activity);
    setRelatedContact(null);
    setRelatedCompany(null);
    if (activity.relatedTo && activity.relatedId) {
      fetchRelatedData(activity.relatedTo, activity.relatedId);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);

    const payload: any = {
      type: formData.type,
      title: formData.title.trim(),
      description: formData.description?.trim() || undefined,
      status: formData.status,
      priority: formData.priority || undefined,
      dueDate: formData.dueDate || undefined,
      relatedTo: formData.relatedTo || undefined,
      relatedId: formData.relatedId || undefined,
      assignedTo: formData.assignedTo || undefined,
    };

    if (!payload.title) {
      setError('Please enter activity title');
      setSubmitting(false);
      return;
    }

    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(
        withBase(`/activities${isEdit ? `/${editingId}` : ''}`),
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

      await fetchActivities();
      closeModal();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !token) return;
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      const response = await fetch(withBase(`/activities/${id}`), {
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
      setActivities((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!token) return;
    try {
      const response = await fetch(withBase(`/activities/${id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        await fetchActivities();
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      pending: { class: 'bg-warning', label: 'Pending' },
      in_progress: { class: 'bg-info', label: 'In Progress' },
      completed: { class: 'bg-success', label: 'Completed' },
      cancelled: { class: 'bg-secondary', label: 'Cancelled' },
    };
    return badges[status] || { class: 'bg-secondary', label: status };
  };

  const getPriorityBadge = (priority?: string) => {
    const badges: Record<string, { class: string; label: string; icon: any }> = {
      low: { class: 'bg-success', label: 'Low', icon: null },
      medium: { class: 'bg-warning', label: 'Medium', icon: <FaClock /> },
      high: { class: 'bg-danger', label: 'High', icon: <FaExclamationTriangle /> },
    };
    return badges[priority || 'medium'] || badges.medium;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task': return '📋';
      case 'call': return '📞';
      case 'email': return '📧';
      case 'meeting': return '🤝';
      case 'note': return '📝';
      default: return '📌';
    }
  };

  return (
    <>
      <div className="container-fluid">
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Activities & Tasks</h1>
        </div>

        <div className="card shadow mb-4">
          <div className="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 className="m-0 font-weight-bold text-primary">Activities List</h6>
            <div>
              <button className="btn btn-sm btn-add me-2" onClick={openAddModal}>
                Add New Activity
              </button>
              <button
                className="btn btn-sm btn-info shadow-sm"
                onClick={fetchActivities}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="card-body">
            {/* Filters */}
            <div className="row mb-3">
              <div className="col-md-4">
                <label className="form-label">Filter by Type</label>
                <select
                  className="form-select form-select-sm"
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="task">Task</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Note</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Filter by Status</label>
                <select
                  className="form-select form-select-sm"
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {activities.length === 0 && !loading ? (
              <p className="text-center">No activities found. Try adding new activities.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered" width="100%" cellSpacing={0}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Due Date</th>
                      <th>Assigned To</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((activity) => {
                      const canModify =
                        user?.role === 'admin' ||
                        user?.role === 'superadmin' ||
                        activity.assignedTo === user?.userId;                      
                      const statusBadge = getStatusBadge(activity.status);
                      const priorityBadge = getPriorityBadge(activity.priority);
                      
                      return (
                        <tr key={activity.id}>
                          <td>
                            <span className="me-2">{getTypeIcon(activity.type)}</span>
                            {activity.type}
                          </td>
                          <td>
                            <strong>{activity.title}</strong>
                            {activity.description && (
                              <div className="small text-muted">{activity.description.substring(0, 50)}...</div>
                            )}
                          </td>
                          <td>
                            <select
                              className={`form-select form-select-sm ${statusBadge.class} text-white`}
                              value={activity.status}
                              onChange={(e) => handleStatusChange(activity.id!, e.target.value)}
                              disabled={!canModify}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td>
                            <span 
                              className={`badge ${priorityBadge.class}`}
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: '0.25rem',
                                lineHeight: '1'
                              }}
                            >
                              {priorityBadge.icon && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: '1' }}>
                                  {priorityBadge.icon}
                                </span>
                              )}
                              <span style={{ lineHeight: '1', display: 'inline-block' }}>
                                {priorityBadge.label}
                              </span>
                            </span>
                          </td>
                          <td>
                            {activity.dueDate
                              ? new Date(activity.dueDate).toLocaleString('th-TH', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </td>
                          <td>{activity.assignedToEmail || '-'}</td>
                          <td>
                            {activity.createdAt
                              ? new Date(activity.createdAt).toLocaleDateString()
                              : '-'}
                          </td>
                          <td>
                            <div className="btn-group">
                              <button
                                className="icon-btn view"
                                aria-label="view"
                                title="View Details"
                                onClick={() => handleViewActivity(activity)}
                              >
                                <FaEye />
                              </button>
                              {canModify && (
                                <>
                                  <button
                                    className="icon-btn edit"
                                    aria-label="edit"
                                    title="Edit"
                                    onClick={() => handleEdit(activity)}
                                  >
                                    <FaPen />
                                  </button>
                                  <button
                                    className="icon-btn delete"
                                    aria-label="delete"
                                    title="Delete"
                                    onClick={() => handleDelete(activity.id)}
                                  >
                                    <FaTrash />
                                  </button>
                                </>
                              )}
                            </div>
                            {!canModify && (
                              <span className="badge bg-secondary ms-2">No Permission</span>
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

      {/* Modal for Add/Edit activity */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingId ? 'Edit Activity' : 'Add New Activity'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.type}
                        onChange={(e) => handleChange('type', e.target.value)}
                        required
                      >
                        <option value="task">Task</option>
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                        <option value="meeting">Meeting</option>
                        <option value="note">Note</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        required
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
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
                      <label className="form-label">Priority</label>
                      <select
                        className="form-select"
                        value={formData.priority || 'medium'}
                        onChange={(e) => handleChange('priority', e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Due Date & Time</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.dueDate ? (() => {
                          // Convert stored date to local datetime-local format
                          const dateStr = formData.dueDate;
                          // If already in YYYY-MM-DDTHH:mm format, use directly
                          if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/)) {
                            return dateStr.slice(0, 16);
                          }
                          // Parse as Date (will interpret as local if no timezone)
                          const date = new Date(dateStr);
                          if (isNaN(date.getTime())) return '';
                          // Get local components
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const hours = String(date.getHours()).padStart(2, '0');
                          const minutes = String(date.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        })() : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value) {
                            // datetime-local input gives us YYYY-MM-DDTHH:mm in local time
                            // Create Date object - it will interpret as local time
                            const localDate = new Date(value);
                            if (isNaN(localDate.getTime())) {
                              handleChange('dueDate', '');
                              return;
                            }
                            // Extract local time components (not UTC)
                            const year = localDate.getFullYear();
                            const month = String(localDate.getMonth() + 1).padStart(2, '0');
                            const day = String(localDate.getDate()).padStart(2, '0');
                            const hours = String(localDate.getHours()).padStart(2, '0');
                            const minutes = String(localDate.getMinutes()).padStart(2, '0');
                            // Store as YYYY-MM-DDTHH:mm:ss format (local time, no timezone)
                            // This preserves the exact time the user selected
                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:00`;
                            handleChange('dueDate', localTimeString);
                          } else {
                            handleChange('dueDate', '');
                          }
                        }}
                      />
                    </div>
                    <div className="col-md-4 mb-3">
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
                        <option value="deal">Deal</option>
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
                    {formData.relatedTo === 'deal' && (
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Related Deal ID</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter Deal ID"
                          value={formData.relatedId || ''}
                          onChange={(e) => handleChange('relatedId', e.target.value)}
                        />
                        <small className="form-text text-muted">Deal selection will be added in future update</small>
                      </div>
                    )}
                  </div>
                  {error && <div className="alert alert-danger">{error}</div>}
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting
                        ? 'Saving...'
                        : editingId
                        ? 'Save Changes'
                        : 'Add Activity'}
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

      {/* View Activity Details Modal */}
      {viewingActivity && (
        <div 
          className="modal show d-block" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.3s ease-in'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewingActivity(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg" style={{ marginTop: '5vh' }}>
            <div 
              className="modal-content"
              style={{
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                animation: 'slideUp 0.3s ease-out'
              }}
            >
              <div 
                className="modal-header"
                style={{
                  background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)',
                  color: 'white',
                  borderRadius: '16px 16px 0 0',
                  padding: '1.5rem',
                  border: 'none'
                }}
              >
                <h5 className="modal-title" style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center' }}>
                  <FaEye style={{ marginRight: '0.5rem' }} />
                  Activity Details
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setViewingActivity(null)}
                  style={{ opacity: 0.9 }}
                ></button>
              </div>
              <div className="modal-body" style={{ padding: '2rem' }}>
                {/* Title Section */}
                <div className="mb-4">
                  <h4 style={{ color: '#333', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {viewingActivity.title}
                  </h4>
                  <div className="d-flex gap-2 mt-2">
                    <span 
                      className={`badge ${getStatusBadge(viewingActivity.status).class} px-3 py-2`}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {getStatusBadge(viewingActivity.status).label}
                    </span>
                    <span 
                      className={`badge ${getPriorityBadge(viewingActivity.priority).class} px-3 py-2`}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '0.25rem',
                        lineHeight: '1'
                      }}
                    >
                      {getPriorityBadge(viewingActivity.priority).icon && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: '1' }}>
                          {getPriorityBadge(viewingActivity.priority).icon}
                        </span>
                      )}
                      <span style={{ lineHeight: '1', display: 'inline-block' }}>
                        {getPriorityBadge(viewingActivity.priority).label}
                      </span>
                    </span>
                    <span 
                      className="badge bg-info px-3 py-2"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {getTypeIcon(viewingActivity.type)}
                      <span className="ms-1 text-capitalize">{viewingActivity.type}</span>
                    </span>
                  </div>
                </div>

                {/* Description */}
                {viewingActivity.description && (
                  <div 
                    className="mb-4 p-3"
                    style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      borderLeft: '4px solid #0d6efd'
                    }}
                  >
                    <strong style={{ color: '#0d6efd', display: 'block', marginBottom: '0.5rem' }}>
                      Description
                    </strong>
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#555' }}>
                      {viewingActivity.description}
                    </p>
                  </div>
                )}

                {/* Info Cards */}
                <div className="row g-3 mb-4">
                  {viewingActivity.dueDate && (
                    <div className="col-md-6">
                      <div 
                        className="p-3 h-100"
                        style={{
                          backgroundColor: '#fff3cd',
                          borderRadius: '8px',
                          border: '1px solid #ffc107'
                        }}
                      >
                        <div className="d-flex align-items-center mb-2">
                          <FaClock className="text-warning me-2" />
                          <strong style={{ color: '#856404' }}>Due Date & Time</strong>
                        </div>
                        <p style={{ margin: 0, color: '#856404', fontWeight: '500' }}>
                          {new Date(viewingActivity.dueDate).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {viewingActivity.assignedToEmail && (
                    <div className="col-md-6">
                      <div 
                        className="p-3 h-100"
                        style={{
                          backgroundColor: '#f8f9fa',
                          borderRadius: '8px'
                        }}
                      >
                        <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                          Assigned To
                        </strong>
                        <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>
                          {(() => {
                            const assignedUser = users.find(
                              (u) => (u.id || u.userId) === viewingActivity.assignedTo
                            );
                            if (assignedUser) {
                              const name = `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim();
                              return name || assignedUser.email || viewingActivity.assignedToEmail || '-';
                            }
                            return viewingActivity.assignedToEmail || '-';
                          })()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Related To */}
                {viewingActivity.relatedTo && viewingActivity.relatedId && (
                  <div 
                    className="mb-4 p-3"
                    style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      borderLeft: '4px solid #0d6efd'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2" style={{ minHeight: '2rem' }}>
                      <strong style={{ color: '#0d6efd', textTransform: 'capitalize', display: 'flex', alignItems: 'center', height: '100%' }}>
                        Related To: {viewingActivity.relatedTo}
                      </strong>
                      {viewingActivity.relatedTo === 'contact' && relatedContact && (
                        <button
                          className="btn btn-sm btn-link p-0"
                          onClick={() => setShowContactModal(true)}
                          style={{ 
                            color: '#0d6efd', 
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            margin: 0,
                            padding: '0.25rem 0'
                          }}
                          title="View Contact Details"
                        >
                          <FaEye style={{ marginRight: '0.375rem', fontSize: '0.875rem' }} />
                          <span>View Details</span>
                        </button>
                      )}
                      {viewingActivity.relatedTo === 'company' && relatedCompany && (
                        <button
                          className="btn btn-sm btn-link p-0"
                          onClick={() => setShowContactModal(true)}
                          style={{ 
                            color: '#0d6efd', 
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            margin: 0,
                            padding: '0.25rem 0'
                          }}
                          title="View Company Details"
                        >
                          <FaEye style={{ marginRight: '0.375rem', fontSize: '0.875rem' }} />
                          <span>View Details</span>
                        </button>
                      )}
                    </div>
                    <p style={{ margin: 0, color: '#0d6efd', fontWeight: '500' }}>
                      {viewingActivity.relatedTo === 'contact' && relatedContact ? (
                        <span>
                          {relatedContact.firstName} {relatedContact.lastName}
                          {relatedContact.phone && ` - ${relatedContact.phone}`}
                        </span>
                      ) : viewingActivity.relatedTo === 'company' && relatedCompany ? (
                        <span>
                          {relatedCompany.name}
                          {relatedCompany.type && ` (${relatedCompany.type})`}
                        </span>
                      ) : (
                        <span style={{ color: '#666' }}>{viewingActivity.relatedId}</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Metadata */}
                <div className="row g-3">
                  <div className="col-md-6">
                    <div 
                      className="p-3"
                      style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px'
                      }}
                    >
                      <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                        Created At
                      </strong>
                      <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>
                        {viewingActivity.createdAt
                          ? new Date(viewingActivity.createdAt).toLocaleString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div 
                      className="p-3"
                      style={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px'
                      }}
                    >
                      <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                        Last Updated
                      </strong>
                      <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>
                        {viewingActivity.updatedAt
                          ? new Date(viewingActivity.updatedAt).toLocaleString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div 
                className="modal-footer"
                style={{
                  padding: '1.5rem',
                  borderTop: '1px solid #e9ecef',
                  borderRadius: '0 0 16px 16px'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setViewingActivity(null)}
                  style={{
                    borderRadius: '8px',
                    padding: '0.5rem 1.5rem',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Close
                </button>
                {(user?.role === 'admin' ||
                  user?.role === 'superadmin' ||
                  viewingActivity.assignedTo === user?.userId) && (

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setViewingActivity(null);
                      handleEdit(viewingActivity);
                    }}
                    style={{
                      borderRadius: '8px',
                      padding: '0.5rem 1.5rem',
                      fontWeight: '500',
                      background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FaPen className="me-2" />
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact/Company Details Modal */}
      {showContactModal && (relatedContact || relatedCompany) && (
        <div 
          className="modal show d-block" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1060
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowContactModal(false);
            }
          }}
        >
          <div className="modal-dialog modal-lg" style={{ marginTop: '5vh' }}>
            <div 
              className="modal-content"
              style={{
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                animation: 'slideUp 0.3s ease-out'
              }}
            >
              <div 
                className="modal-header"
                style={{
                  background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)',
                  color: 'white',
                  borderRadius: '16px 16px 0 0',
                  padding: '1.5rem',
                  border: 'none'
                }}
              >
                <h5 className="modal-title" style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
                  {relatedContact ? 'Contact Details' : 'Company Details'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowContactModal(false)}
                  style={{ opacity: 0.9 }}
                ></button>
              </div>
              <div className="modal-body" style={{ padding: '2rem' }}>
                {relatedContact ? (
                  <>
                    <div className="mb-4">
                      <h4 style={{ color: '#333', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {relatedContact.firstName} {relatedContact.lastName}
                      </h4>
                    </div>
                    <div className="row g-3">
                      {relatedContact.phone && (
                        <div className="col-md-6">
                          <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                              Phone
                            </strong>
                            <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedContact.phone}</p>
                          </div>
                        </div>
                      )}
                      {relatedContact.address && (
                        <div className="col-md-6">
                          <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                              Address
                            </strong>
                            <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedContact.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : relatedCompany ? (
                  <>
                    <div className="mb-4">
                      <h4 style={{ color: '#333', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {relatedCompany.name}
                      </h4>
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
                              <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                                Address
                              </strong>
                              <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedCompany.address}</p>
                            </div>
                          </div>
                        )}
                        {relatedCompany.phone && (
                          <div className="col-md-6">
                            <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                              <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                                Phone
                              </strong>
                              <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedCompany.phone}</p>
                            </div>
                          </div>
                        )}
                        {relatedCompany.fax && (
                          <div className="col-md-6">
                            <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                              <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                                Fax
                              </strong>
                              <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedCompany.fax}</p>
                            </div>
                          </div>
                        )}
                        {relatedCompany.taxId && (
                          <div className="col-md-6">
                            <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                              <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                                Tax ID
                              </strong>
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
                                <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                                  Branch Name
                                </strong>
                                <p style={{ margin: 0, color: '#333', fontSize: '0.9rem' }}>{relatedCompany.branchName}</p>
                              </div>
                            </div>
                          )}
                          {relatedCompany.branchNumber && (
                            <div className="col-md-6">
                              <div className="p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                                <strong style={{ color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                                  Branch Number
                                </strong>
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
                                <strong style={{ color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                                  Billing Cycle
                                </strong>
                                <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: '500', textTransform: 'capitalize' }}>
                                  {relatedCompany.billingCycle}
                                </p>
                              </div>
                            </div>
                          )}
                          {relatedCompany.billingDate && (
                            <div className="col-md-4">
                              <div className="p-3" style={{ backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                                <strong style={{ color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                                  Billing Date
                                </strong>
                                <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: '500' }}>
                                  Day {relatedCompany.billingDate} of month
                                </p>
                              </div>
                            </div>
                          )}
                          {relatedCompany.notificationDate && (
                            <div className="col-md-4">
                              <div className="p-3" style={{ backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
                                <strong style={{ color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                                  Notification Date
                                </strong>
                                <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: '500' }}>
                                  Day {relatedCompany.notificationDate} of month
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
              <div 
                className="modal-footer"
                style={{
                  padding: '1.5rem',
                  borderTop: '1px solid #e9ecef',
                  borderRadius: '0 0 16px 16px'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowContactModal(false)}
                  style={{
                    borderRadius: '8px',
                    padding: '0.5rem 1.5rem',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

