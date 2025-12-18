import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck, FaClock, FaExclamationTriangle, FaPlus, FaEllipsisV, FaChevronDown } from 'react-icons/fa';
import { FiEye } from 'react-icons/fi';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { Dropdown } from 'react-bootstrap';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatDate';

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
  relatedTo: undefined,
  relatedId: '',
  assignedTo: '',
  dueDate: '',
};

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const ActivitiesPage = () => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  // If not authenticated, redirect to login immediately
  useEffect(() => {
    if (token === null) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [formData, setFormData] = useState<Activity>(emptyActivity);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
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
      const url = withBase('/activities');
      console.log('Fetching activities from:', url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Response status:', response.status, response.statusText);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = await response.json();
          console.error('Error response:', body);
          throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
        } else {
          const text = await response.text();
          console.error('Error text:', text);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response. Please check if backend is running.');
      }

      const data = await response.json();
      console.log('Fetched activities data:', data);
      let filteredData = Array.isArray(data) ? data : [];
      console.log('Filtered data (before filters):', filteredData.length, 'items');

      // Filter by type
      if (filterType !== 'all') {
        filteredData = filteredData.filter((activity: Activity) => activity.type === filterType);
      }

      // Filter by status
      if (filterStatus !== 'all') {
        filteredData = filteredData.filter((activity: Activity) => activity.status === filterStatus);
      }

      // Filter by priority
      if (filterPriority !== 'all') {
        filteredData = filteredData.filter((activity: Activity) => (activity.priority || 'medium') === filterPriority);
      }

      console.log('Final filtered data:', filteredData.length, 'items');
      setActivities(filteredData);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, filterType, filterStatus, filterPriority]);

  useEffect(() => {
    fetchActivities();
    // Fetch users list on mount to display assignedTo emails
    if (token) {
      fetch(withBase('/auth/users/list'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.ok && res.json())
        .then((data) => Array.isArray(data) && setUsers(data))
        .catch((err) => console.error('Error fetching users:', err));
    }
  }, [fetchActivities, token]);

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
    // Normalize all fields to ensure no undefined values for controlled inputs
    setFormData({
      ...emptyActivity,
      ...activity,
      title: activity.title || '',
      description: activity.description || '',
      relatedTo: activity.relatedTo || undefined,
      relatedId: activity.relatedId || '',
      assignedTo: activity.assignedTo || '',
      dueDate: activity.dueDate || '',
      priority: activity.priority || 'medium',
    });
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
    if (!token) {
      console.error('No token available');
      return;
    }
    setSubmitting(true);
    setError(null);

    // Find assigned user email from users list
    let assignedToEmail: string | undefined = undefined;
    if (formData.assignedTo && users.length > 0) {
      const assignedUser = users.find(
        (u) => (u.id || u.userId) === formData.assignedTo
      );
      assignedToEmail = assignedUser?.email;
    }

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
      assignedToEmail: assignedToEmail,
    };

    console.log('Submitting payload:', payload);

    if (!payload.title) {
      setError('Please enter activity title');
      setSubmitting(false);
      return;
    }

    try {
      const isEdit = Boolean(editingId);
      const url = withBase(`/activities${isEdit ? `/${editingId}` : ''}`);
      console.log(`${isEdit ? 'Updating' : 'Creating'} activity at:`, url);

      const response = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status, response.statusText);

      if (response.status === 401) {
        console.error('Unauthorized - session expired');
        handleUnauthorized();
        return;
      }
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        console.error('Error response:', body);
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }

      const result = await response.json();
      console.log('Success! Created/Updated activity:', result);

      await fetchActivities();
      closeModal();
    } catch (err) {
      console.error('Error submitting activity:', err);
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
      <div className="flex flex-col gap-6 px-8 py-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Activities & Tasks</h1>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 rounded-lg bg-[#3869a9] text-white font-medium shadow hover:bg-[#2c5282] transition-colors flex items-center gap-2"
              onClick={openAddModal}
            >
              + Add New Activity
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium shadow-sm hover:bg-gray-50 transition-colors"
              onClick={fetchActivities}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
            <select
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="task">Task</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note</option>
            </select>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
            <select
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Priority</label>
            <select
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}

        {activities.length === 0 && !loading ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500 text-lg">No activities found. Try adding new activities.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activities.map((activity) => {
              const canModify =
                user?.role === 'admin' ||
                user?.role === 'superadmin' ||
                activity.assignedTo === user?.userId;
              const statusBadge = getStatusBadge(activity.status);
              const priorityBadge = getPriorityBadge(activity.priority);

              return (
                <div key={activity.id} className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xl">
                        {getTypeIcon(activity.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 line-clamp-1" title={activity.title}>
                          {activity.title}
                        </h3>
                        <span className="text-xs text-gray-500 capitalize">{activity.type}</span>
                      </div>
                    </div>
                    {canModify && (
                      <Dropdown align="end">
                        <Dropdown.Toggle as="button" className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 border-0 bg-transparent">
                          <FaEllipsisV />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleViewActivity(activity)}>
                            <FiEye className="me-2" /> View Details
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleEdit(activity)}>
                            <FiEdit2 className="me-2" /> Edit
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item onClick={() => handleDelete(activity.id)} className="text-danger">
                            <FiTrash2 className="me-2" /> Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}
                  </div>

                  {activity.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 h-10">
                      {activity.description}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 mt-auto">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Status</span>
                      {canModify ? (
                        <div className="relative inline-block">
                          <select
                            className={`appearance-none border-0 rounded-full px-3 py-1 pr-10 text-xs font-medium text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 text-left truncate ${statusBadge.class}`}
                              style={{
                                backgroundImage: 'none',
                                width: 'auto',
                                minWidth: '100px',
                                maxWidth: '200px',
                                overflow: 'hidden'
                              }}
                            value={activity.status}
                            onChange={(e) => handleStatusChange(activity.id!, e.target.value)}
                          >
                            <option value="pending" className="text-gray-800 bg-white">Pending</option>
                            <option value="in_progress" className="text-gray-800 bg-white">In Progress</option>
                            <option value="completed" className="text-gray-800 bg-white">Completed</option>
                            <option value="cancelled" className="text-gray-800 bg-white">Cancelled</option>
                          </select>
                          <span className="pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-xs">
                            <FaChevronDown />
                          </span>
                        </div>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Priority</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1 ${priorityBadge.class}`}>
                        {priorityBadge.icon} {priorityBadge.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Due Date</span>
                        <span className="font-medium text-gray-700">
                          {activity.dueDate ? (
                            <span title={activity.dueDate}>{formatDateTime(activity.dueDate)}</span>
                          ) : (
                            '-'
                          )}
                        </span>
                    </div>
                    <div className="pt-3 mt-1 border-t border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {(() => {
                            if (activity.assignedToEmail) return activity.assignedToEmail.charAt(0).toUpperCase();
                            if (activity.assignedTo && users.length > 0) {
                              const u = users.find(u => (u.id || u.userId) === activity.assignedTo);
                              return u?.email?.charAt(0).toUpperCase() || '?';
                            }
                            return '?';
                          })()}
                        </div>
                        <span className="text-xs text-gray-500 truncate max-w-[100px]">
                          {(() => {
                            if (activity.assignedToEmail) return activity.assignedToEmail;
                            if (activity.assignedTo && users.length > 0) {
                              const u = users.find(u => (u.id || u.userId) === activity.assignedTo);
                              return u?.email || 'Unassigned';
                            }
                            return 'Unassigned';
                          })()}
                        </span>
                      </div>
                      {!canModify && (
                        <span className="text-xs text-gray-400">Read only</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Add/Edit activity */}
      {showModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[linear-gradient(180deg,#3763a0,#1d4b8b)] text-white px-6 py-4 flex justify-between items-center">
              <h5 className="text-xl font-bold m-0">
                {editingId ? 'Edit Activity' : 'Add New Activity'}
              </h5>
              <button
                type="button"
                className="text-white/80 hover:text-white transition-colors border-0 bg-transparent p-0"
                onClick={closeModal}
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                </div>

                {/* Title */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.priority || 'medium'}
                      onChange={(e) => handleChange('priority', e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date & Time</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.dueDate ? (() => {
                        const dateStr = formData.dueDate;
                        if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/)) {
                          return dateStr.slice(0, 16);
                        }
                        const date = new Date(dateStr);
                        if (isNaN(date.getTime())) return '';
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
                          const localDate = new Date(value);
                          if (isNaN(localDate.getTime())) {
                            handleChange('dueDate', '');
                            return;
                          }
                          const year = localDate.getFullYear();
                          const month = String(localDate.getMonth() + 1).padStart(2, '0');
                          const day = String(localDate.getDate()).padStart(2, '0');
                          const hours = String(localDate.getHours()).padStart(2, '0');
                          const minutes = String(localDate.getMinutes()).padStart(2, '0');
                          const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:00`;
                          handleChange('dueDate', localTimeString);
                        } else {
                          handleChange('dueDate', '');
                        }
                      }}
                    />
                  </div>
                  {/* Assigned To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <select
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Related To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Related To</label>
                    <select
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.relatedTo || ''}
                      onChange={(e) => {
                        handleChange('relatedTo', e.target.value as any);
                        handleChange('relatedId', '');
                      }}
                    >
                      <option value="">None</option>
                      <option value="company">Company</option>
                      <option value="contact">Contact</option>
                    </select>
                  </div>
                  {/* Related ID Selection */}
                  {formData.relatedTo === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Company</label>
                      <select
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Contact</label>
                      <select
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Related Deal ID</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter Deal ID"
                        value={formData.relatedId || ''}
                        onChange={(e) => handleChange('relatedId', e.target.value)}
                      />
                      <small className="text-xs text-gray-500 mt-1 block">Deal selection will be added in future update</small>
                    </div>
                  )}
                </div>

                {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    disabled={submitting}
                  >
                    {submitting
                      ? 'Saving...'
                      : editingId
                        ? 'Save Changes'
                        : 'Add Activity'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Activity Details Modal */}
      {viewingActivity && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[linear-gradient(180deg,#3763a0,#1d4b8b)] text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FiEye className="text-xl" />
                <h5 className="text-xl font-bold m-0">Activity Details</h5>
              </div>
              <button
                type="button"
                className="text-white/80 hover:text-white transition-colors border-0 bg-transparent p-0"
                onClick={() => setViewingActivity(null)}
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Title & Badges */}
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h4 className="text-2xl font-bold text-gray-800 m-0">{viewingActivity.title}</h4>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    ID: {viewingActivity.id?.substring(0, 8)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Status Badge */}
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium text-white shadow-sm ${getStatusBadge(viewingActivity.status).class}`}>
                    {getStatusBadge(viewingActivity.status).label}
                  </span>

                  {/* Priority Badge */}
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium text-white shadow-sm flex items-center gap-1.5 ${getPriorityBadge(viewingActivity.priority).class}`}>
                    {getPriorityBadge(viewingActivity.priority).icon}
                    {getPriorityBadge(viewingActivity.priority).label}
                  </span>

                  {/* Type Badge */}
                  <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 flex items-center gap-1.5">
                    {getTypeIcon(viewingActivity.type)}
                    <span className="capitalize">{viewingActivity.type}</span>
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-100">
                <h6 className="text-blue-600 font-semibold mb-2">Description</h6>
                <p className="text-gray-700 whitespace-pre-wrap m-0 leading-relaxed">
                  {viewingActivity.description || <span className="text-gray-400 italic">No description provided</span>}
                </p>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Due Date */}
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                  <div className="flex items-center gap-2 mb-1 text-yellow-800 font-semibold">
                    <FaClock /> Due Date & Time
                  </div>
                  <p className="text-gray-800 font-medium m-0">
                    {viewingActivity.dueDate
                      ? new Date(viewingActivity.dueDate).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      : '-'}
                  </p>
                </div>

                {/* Assigned To */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-gray-500 font-semibold mb-1 text-sm">Assigned To</div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                      {(() => {
                        const email = viewingActivity.assignedToEmail || '';
                        return email.charAt(0).toUpperCase() || '?';
                      })()}
                    </div>
                    <span className="text-gray-800 font-medium">
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
                    </span>
                  </div>
                </div>
              </div>

              {/* Related To Section */}
              {viewingActivity.relatedTo && viewingActivity.relatedId && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-6 flex items-center justify-between">
                  <div>
                    <div className="text-blue-600 font-semibold mb-1 text-sm capitalize">
                      Related To: {viewingActivity.relatedTo}
                    </div>
                    <div className="text-gray-800 font-bold text-lg">
                      {viewingActivity.relatedTo === 'contact' && relatedContact ? (
                        <span>{relatedContact.firstName} {relatedContact.lastName}</span>
                      ) : viewingActivity.relatedTo === 'company' && relatedCompany ? (
                        <span>{relatedCompany.name}</span>
                      ) : (
                        <span>{viewingActivity.relatedId}</span>
                      )}
                    </div>
                  </div>
                  {(relatedContact || relatedCompany) && (
                    <button
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 text-sm border-0 bg-transparent p-0"
                      onClick={() => setShowContactModal(true)}
                    >
                      <FiEye /> View Details
                    </button>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 border-t border-gray-100 pt-4">
                <div>
                  <span className="block font-medium mb-1">Created At</span>
                  {viewingActivity.createdAt
                    ? new Date(viewingActivity.createdAt).toLocaleString('th-TH')
                    : '-'}
                </div>
                <div>
                  <span className="block font-medium mb-1">Last Updated</span>
                  {viewingActivity.updatedAt
                    ? new Date(viewingActivity.updatedAt).toLocaleString('th-TH')
                    : '-'}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
                onClick={() => setViewingActivity(null)}
              >
                Close
              </button>
              {(user?.role === 'admin' ||
                user?.role === 'superadmin' ||
                viewingActivity.assignedTo === user?.userId) && (
                  <button
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 border-0"
                    onClick={() => {
                      setViewingActivity(null);
                      handleEdit(viewingActivity);
                    }}
                  >
                    <FiEdit2 /> Edit Activity
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Contact/Company Details Modal */}
      {showContactModal && (relatedContact || relatedCompany) && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[linear-gradient(180deg,#3763a0,#1d4b8b)] text-white px-6 py-4 flex justify-between items-center">
              <h5 className="text-xl font-bold m-0">
                {relatedContact ? 'Contact Details' : 'Company Details'}
              </h5>
              <button
                type="button"
                className="text-white/80 hover:text-white transition-colors border-0 bg-transparent p-0"
                onClick={() => setShowContactModal(false)}
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {relatedContact ? (
                <>
                  <div className="mb-6">
                    <h4 className="text-2xl font-bold text-gray-800 mb-2">
                      {relatedContact.firstName} {relatedContact.lastName}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {relatedContact.email && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <strong className="text-gray-500 text-sm block mb-1">Email</strong>
                        <p className="text-gray-800 font-medium m-0 break-all">{relatedContact.email}</p>
                      </div>
                    )}
                    {relatedContact.phone && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <strong className="text-gray-500 text-sm block mb-1">Phone</strong>
                        <p className="text-gray-800 font-medium m-0">{relatedContact.phone}</p>
                      </div>
                    )}
                    {relatedContact.address && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <strong className="text-gray-500 text-sm block mb-1">Address</strong>
                        <p className="text-gray-800 font-medium m-0">{relatedContact.address}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : relatedCompany ? (
                <>
                  <div className="mb-6">
                    <h4 className="text-2xl font-bold text-gray-800 mb-2">
                      {relatedCompany.name}
                    </h4>
                    {relatedCompany.type && (
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium text-white shadow-sm inline-flex ${relatedCompany.type === 'company' ? 'bg-blue-600' : 'bg-gray-600'}`}>
                        {relatedCompany.type === 'company' ? 'Company' : 'Individual'}
                      </span>
                    )}
                  </div>

                  {/* Basic Information */}
                  <div className="mb-6">
                    <h6 className="text-blue-600 font-semibold mb-3">Basic Information</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {relatedCompany.address && (
                        <div className="col-span-1 md:col-span-2 bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <strong className="text-gray-500 text-sm block mb-1">Address</strong>
                          <p className="text-gray-800 font-medium m-0">{relatedCompany.address}</p>
                        </div>
                      )}
                      {relatedCompany.phone && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <strong className="text-gray-500 text-sm block mb-1">Phone</strong>
                          <p className="text-gray-800 font-medium m-0">{relatedCompany.phone}</p>
                        </div>
                      )}
                      {relatedCompany.fax && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <strong className="text-gray-500 text-sm block mb-1">Fax</strong>
                          <p className="text-gray-800 font-medium m-0">{relatedCompany.fax}</p>
                        </div>
                      )}
                      {relatedCompany.taxId && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <strong className="text-gray-500 text-sm block mb-1">Tax ID</strong>
                          <p className="text-gray-800 font-medium m-0">{relatedCompany.taxId}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Branch Information */}
                  {relatedCompany.type === 'company' && (relatedCompany.branchName || relatedCompany.branchNumber) && (
                    <div className="mb-6">
                      <h6 className="text-blue-600 font-semibold mb-3">Branch Information</h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {relatedCompany.branchName && (
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <strong className="text-gray-500 text-sm block mb-1">Branch Name</strong>
                            <p className="text-gray-800 font-medium m-0">{relatedCompany.branchName}</p>
                          </div>
                        )}
                        {relatedCompany.branchNumber && (
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <strong className="text-gray-500 text-sm block mb-1">Branch Number</strong>
                            <p className="text-gray-800 font-medium m-0">{relatedCompany.branchNumber}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Billing Information */}
                  {(relatedCompany.billingCycle || relatedCompany.billingDate || relatedCompany.notificationDate) && (
                    <div className="mb-6">
                      <h6 className="text-blue-600 font-semibold mb-3">Billing Information</h6>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {relatedCompany.billingCycle && (
                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                            <strong className="text-yellow-800 text-sm block mb-1">Billing Cycle</strong>
                            <p className="text-yellow-900 font-medium m-0 capitalize">{relatedCompany.billingCycle}</p>
                          </div>
                        )}
                        {relatedCompany.billingDate && (
                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                            <strong className="text-yellow-800 text-sm block mb-1">Billing Date</strong>
                            <p className="text-yellow-900 font-medium m-0">Day {relatedCompany.billingDate} of month</p>
                          </div>
                        )}
                        {relatedCompany.notificationDate && (
                          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                            <strong className="text-yellow-800 text-sm block mb-1">Notification Date</strong>
                            <p className="text-yellow-900 font-medium m-0">Day {relatedCompany.notificationDate} of month</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
              <button
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
                onClick={() => setShowContactModal(false)}
              >
                Close
              </button>
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

