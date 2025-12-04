import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { FaPen, FaTrash, FaClock, FaExclamationTriangle, FaEye } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
const emptyActivity = {
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
const withBase = (path) => `${API_BASE_URL}${path}`;
export const ActivitiesPage = () => {
    const { token, user, logout } = useAuth();
    const [activities, setActivities] = useState([]);
    const [formData, setFormData] = useState(emptyActivity);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [companies, setCompanies] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [users, setUsers] = useState([]);
    const [viewingActivity, setViewingActivity] = useState(null);
    const [relatedContact, setRelatedContact] = useState(null);
    const [relatedCompany, setRelatedCompany] = useState(null);
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
        if (!token)
            return;
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
                }
                else {
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
                filteredData = filteredData.filter((activity) => activity.type === filterType);
            }
            // Filter by status
            if (filterStatus !== 'all') {
                filteredData = filteredData.filter((activity) => activity.status === filterStatus);
            }
            console.log('Final filtered data:', filteredData.length, 'items');
            setActivities(filteredData);
        }
        catch (err) {
            console.error('Error fetching activities:', err);
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }, [token, filterType, filterStatus]);
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
    const handleChange = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };
    const resetForm = () => {
        setEditingId(null);
        setFormData(emptyActivity);
    };
    const fetchCompaniesAndContacts = async () => {
        if (!token)
            return;
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
        }
        catch (err) {
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
    const handleEdit = (activity) => {
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
    const fetchRelatedData = async (relatedTo, relatedId) => {
        if (!token || !relatedId)
            return;
        try {
            if (relatedTo === 'contact') {
                const response = await fetch(withBase('/cruds'), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (response.ok) {
                    const contacts = await response.json();
                    const contact = Array.isArray(contacts) ? contacts.find((c) => c.id === relatedId) : null;
                    setRelatedContact(contact);
                }
            }
            else if (relatedTo === 'company') {
                const response = await fetch(withBase('/companies'), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (response.ok) {
                    const companies = await response.json();
                    const company = Array.isArray(companies) ? companies.find((c) => c.id === relatedId) : null;
                    setRelatedCompany(company);
                }
            }
        }
        catch (err) {
            console.error('Error fetching related data:', err);
        }
    };
    const handleViewActivity = (activity) => {
        setViewingActivity(activity);
        setRelatedContact(null);
        setRelatedCompany(null);
        if (activity.relatedTo && activity.relatedId) {
            fetchRelatedData(activity.relatedTo, activity.relatedId);
        }
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!token) {
            console.error('No token available');
            return;
        }
        setSubmitting(true);
        setError(null);
        // Find assigned user email from users list
        let assignedToEmail = undefined;
        if (formData.assignedTo && users.length > 0) {
            const assignedUser = users.find((u) => (u.id || u.userId) === formData.assignedTo);
            assignedToEmail = assignedUser?.email;
        }
        const payload = {
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
        }
        catch (err) {
            console.error('Error submitting activity:', err);
            setError(err.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleDelete = async (id) => {
        if (!id || !token)
            return;
        if (!confirm('Are you sure you want to delete this activity?'))
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
    };
    const handleStatusChange = async (id, newStatus) => {
        if (!token)
            return;
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
        }
        catch (err) {
            setError(err.message);
        }
    };
    const getStatusBadge = (status) => {
        const badges = {
            pending: { class: 'bg-warning', label: 'Pending' },
            in_progress: { class: 'bg-info', label: 'In Progress' },
            completed: { class: 'bg-success', label: 'Completed' },
            cancelled: { class: 'bg-secondary', label: 'Cancelled' },
        };
        return badges[status] || { class: 'bg-secondary', label: status };
    };
    const getPriorityBadge = (priority) => {
        const badges = {
            low: { class: 'bg-success', label: 'Low', icon: null },
            medium: { class: 'bg-warning', label: 'Medium', icon: _jsx(FaClock, {}) },
            high: { class: 'bg-danger', label: 'High', icon: _jsx(FaExclamationTriangle, {}) },
        };
        return badges[priority || 'medium'] || badges.medium;
    };
    const getTypeIcon = (type) => {
        switch (type) {
            case 'task': return '📋';
            case 'call': return '📞';
            case 'email': return '📧';
            case 'meeting': return '🤝';
            case 'note': return '📝';
            default: return '📌';
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "container-fluid", children: [_jsx("div", { className: "d-sm-flex align-items-center justify-content-between mb-4", children: _jsx("h1", { className: "h3 mb-0 text-gray-800", children: "Activities & Tasks" }) }), _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex justify-content-between align-items-center", children: [_jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Activities List" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-add me-2", onClick: openAddModal, children: "Add New Activity" }), _jsx("button", { className: "btn btn-sm btn-info shadow-sm", onClick: fetchActivities, disabled: loading, children: loading ? 'Loading...' : 'Refresh' })] })] }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "row mb-3", children: [_jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "Filter by Type" }), _jsxs("select", { className: "form-select form-select-sm", value: filterType, onChange: (e) => {
                                                            setFilterType(e.target.value);
                                                        }, children: [_jsx("option", { value: "all", children: "All Types" }), _jsx("option", { value: "task", children: "Task" }), _jsx("option", { value: "call", children: "Call" }), _jsx("option", { value: "email", children: "Email" }), _jsx("option", { value: "meeting", children: "Meeting" }), _jsx("option", { value: "note", children: "Note" })] })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label", children: "Filter by Status" }), _jsxs("select", { className: "form-select form-select-sm", value: filterStatus, onChange: (e) => {
                                                            setFilterStatus(e.target.value);
                                                        }, children: [_jsx("option", { value: "all", children: "All Status" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "in_progress", children: "In Progress" }), _jsx("option", { value: "completed", children: "Completed" }), _jsx("option", { value: "cancelled", children: "Cancelled" })] })] })] }), error && _jsx("div", { className: "alert alert-danger", children: error }), activities.length === 0 && !loading ? (_jsx("p", { className: "text-center", children: "No activities found. Try adding new activities." })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-bordered", width: "100%", cellSpacing: 0, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Type" }), _jsx("th", { children: "Title" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Priority" }), _jsx("th", { children: "Due Date" }), _jsx("th", { children: "Assigned To" }), _jsx("th", { children: "Created" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: activities.map((activity) => {
                                                        const canModify = user?.role === 'admin' ||
                                                            user?.role === 'superadmin' ||
                                                            activity.assignedTo === user?.userId;
                                                        const statusBadge = getStatusBadge(activity.status);
                                                        const priorityBadge = getPriorityBadge(activity.priority);
                                                        return (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx("span", { className: "me-2", children: getTypeIcon(activity.type) }), activity.type] }), _jsxs("td", { children: [_jsx("strong", { children: activity.title }), activity.description && (_jsxs("div", { className: "small text-muted", children: [activity.description.substring(0, 50), "..."] }))] }), _jsx("td", { children: _jsxs("select", { className: `form-select form-select-sm ${statusBadge.class} text-white`, value: activity.status, onChange: (e) => handleStatusChange(activity.id, e.target.value), disabled: !canModify, children: [_jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "in_progress", children: "In Progress" }), _jsx("option", { value: "completed", children: "Completed" }), _jsx("option", { value: "cancelled", children: "Cancelled" })] }) }), _jsx("td", { children: _jsxs("span", { className: `badge ${priorityBadge.class}`, style: {
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            gap: '0.25rem',
                                                                            lineHeight: '1'
                                                                        }, children: [priorityBadge.icon && (_jsx("span", { style: { display: 'inline-flex', alignItems: 'center', lineHeight: '1' }, children: priorityBadge.icon })), _jsx("span", { style: { lineHeight: '1', display: 'inline-block' }, children: priorityBadge.label })] }) }), _jsx("td", { children: activity.dueDate
                                                                        ? new Date(activity.dueDate).toLocaleString('th-TH', {
                                                                            year: 'numeric',
                                                                            month: '2-digit',
                                                                            day: '2-digit',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                        })
                                                                        : '-' }), _jsx("td", { children: (() => {
                                                                        if (activity.assignedToEmail) {
                                                                            return activity.assignedToEmail;
                                                                        }
                                                                        if (activity.assignedTo && users.length > 0) {
                                                                            const assignedUser = users.find((u) => (u.id || u.userId) === activity.assignedTo);
                                                                            return assignedUser?.email || '-';
                                                                        }
                                                                        return '-';
                                                                    })() }), _jsx("td", { children: activity.createdAt
                                                                        ? new Date(activity.createdAt).toLocaleDateString()
                                                                        : '-' }), _jsxs("td", { children: [_jsxs("div", { className: "btn-group", children: [_jsx("button", { className: "icon-btn view", "aria-label": "view", title: "View Details", onClick: () => handleViewActivity(activity), children: _jsx(FaEye, {}) }), canModify && (_jsxs(_Fragment, { children: [_jsx("button", { className: "icon-btn edit", "aria-label": "edit", title: "Edit", onClick: () => handleEdit(activity), children: _jsx(FaPen, {}) }), _jsx("button", { className: "icon-btn delete", "aria-label": "delete", title: "Delete", onClick: () => handleDelete(activity.id), children: _jsx(FaTrash, {}) })] }))] }), !canModify && (_jsx("span", { className: "badge bg-secondary ms-2", children: "No Permission" }))] })] }, activity.id));
                                                    }) })] }) }))] })] })] }), showModal && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: editingId ? 'Edit Activity' : 'Add New Activity' }), _jsx("button", { type: "button", className: "btn-close", onClick: closeModal })] }), _jsx("div", { className: "modal-body", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsxs("label", { className: "form-label", children: ["Type ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { className: "form-select", value: formData.type, onChange: (e) => handleChange('type', e.target.value), required: true, children: [_jsx("option", { value: "task", children: "Task" }), _jsx("option", { value: "call", children: "Call" }), _jsx("option", { value: "email", children: "Email" }), _jsx("option", { value: "meeting", children: "Meeting" }), _jsx("option", { value: "note", children: "Note" })] })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsxs("label", { className: "form-label", children: ["Status ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { className: "form-select", value: formData.status, onChange: (e) => handleChange('status', e.target.value), required: true, children: [_jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "in_progress", children: "In Progress" }), _jsx("option", { value: "completed", children: "Completed" }), _jsx("option", { value: "cancelled", children: "Cancelled" })] })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsxs("label", { className: "form-label", children: ["Title ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "text", className: "form-control", value: formData.title, onChange: (e) => handleChange('title', e.target.value), required: true })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("label", { className: "form-label", children: "Description" }), _jsx("textarea", { className: "form-control", value: formData.description || '', onChange: (e) => handleChange('description', e.target.value), rows: 3 })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Priority" }), _jsxs("select", { className: "form-select", value: formData.priority || 'medium', onChange: (e) => handleChange('priority', e.target.value), children: [_jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "high", children: "High" })] })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Due Date & Time" }), _jsx("input", { type: "datetime-local", className: "form-control", value: formData.dueDate ? (() => {
                                                                // Convert stored date to local datetime-local format
                                                                const dateStr = formData.dueDate;
                                                                // If already in YYYY-MM-DDTHH:mm format, use directly
                                                                if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/)) {
                                                                    return dateStr.slice(0, 16);
                                                                }
                                                                // Parse as Date (will interpret as local if no timezone)
                                                                const date = new Date(dateStr);
                                                                if (isNaN(date.getTime()))
                                                                    return '';
                                                                // Get local components
                                                                const year = date.getFullYear();
                                                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                                                const day = String(date.getDate()).padStart(2, '0');
                                                                const hours = String(date.getHours()).padStart(2, '0');
                                                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                                                return `${year}-${month}-${day}T${hours}:${minutes}`;
                                                            })() : '', onChange: (e) => {
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
                                                                }
                                                                else {
                                                                    handleChange('dueDate', '');
                                                                }
                                                            } })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", children: "Assigned To" }), _jsxs("select", { className: "form-select", value: formData.assignedTo || '', onChange: (e) => handleChange('assignedTo', e.target.value), children: [_jsx("option", { value: "", children: "-- Select User --" }), users.map((userItem) => (_jsxs("option", { value: userItem.id || userItem.userId, children: [userItem.email, " ", userItem.firstName || userItem.lastName ? `(${userItem.firstName || ''} ${userItem.lastName || ''})`.trim() : ''] }, userItem.id || userItem.userId)))] })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Related To" }), _jsxs("select", { className: "form-select", value: formData.relatedTo || '', onChange: (e) => {
                                                                handleChange('relatedTo', e.target.value);
                                                                handleChange('relatedId', ''); // Reset ID when changing type
                                                            }, children: [_jsx("option", { value: "", children: "None" }), _jsx("option", { value: "company", children: "Company" }), _jsx("option", { value: "contact", children: "Contact" })] })] }), formData.relatedTo === 'company' && (_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Select Company" }), _jsxs("select", { className: "form-select", value: formData.relatedId || '', onChange: (e) => handleChange('relatedId', e.target.value), children: [_jsx("option", { value: "", children: "-- Select Company --" }), companies.map((company) => (_jsxs("option", { value: company.id, children: [company.name, " ", company.type === 'individual' ? '(Individual)' : '(Company)'] }, company.id)))] })] })), formData.relatedTo === 'contact' && (_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Select Contact" }), _jsxs("select", { className: "form-select", value: formData.relatedId || '', onChange: (e) => handleChange('relatedId', e.target.value), children: [_jsx("option", { value: "", children: "-- Select Contact --" }), contacts.map((contact) => (_jsxs("option", { value: contact.id, children: [contact.firstName, " ", contact.lastName] }, contact.id)))] })] })), formData.relatedTo === 'deal' && (_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Related Deal ID" }), _jsx("input", { type: "text", className: "form-control", placeholder: "Enter Deal ID", value: formData.relatedId || '', onChange: (e) => handleChange('relatedId', e.target.value) }), _jsx("small", { className: "form-text text-muted", children: "Deal selection will be added in future update" })] }))] }), error && _jsx("div", { className: "alert alert-danger", children: error }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { type: "submit", className: "btn btn-primary", disabled: submitting, children: submitting
                                                        ? 'Saving...'
                                                        : editingId
                                                            ? 'Save Changes'
                                                            : 'Add Activity' }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: closeModal, disabled: submitting, children: "Cancel" })] })] }) })] }) }) })), viewingActivity && (_jsx("div", { className: "modal show d-block", style: {
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    animation: 'fadeIn 0.3s ease-in'
                }, onClick: (e) => {
                    if (e.target === e.currentTarget) {
                        setViewingActivity(null);
                    }
                }, children: _jsx("div", { className: "modal-dialog modal-lg", style: { marginTop: '5vh' }, children: _jsxs("div", { className: "modal-content", style: {
                            borderRadius: '16px',
                            border: 'none',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            animation: 'slideUp 0.3s ease-out'
                        }, children: [_jsxs("div", { className: "modal-header", style: {
                                    background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)',
                                    color: 'white',
                                    borderRadius: '16px 16px 0 0',
                                    padding: '1.5rem',
                                    border: 'none'
                                }, children: [_jsxs("h5", { className: "modal-title", style: { fontSize: '1.5rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center' }, children: [_jsx(FaEye, { style: { marginRight: '0.5rem' } }), "Activity Details"] }), _jsx("button", { type: "button", className: "btn-close btn-close-white", onClick: () => setViewingActivity(null), style: { opacity: 0.9 } })] }), _jsxs("div", { className: "modal-body", style: { padding: '2rem' }, children: [_jsxs("div", { className: "mb-4", children: [_jsx("h4", { style: { color: '#333', fontWeight: '600', marginBottom: '0.5rem' }, children: viewingActivity.title }), _jsxs("div", { className: "d-flex gap-2 mt-2", children: [_jsx("span", { className: `badge ${getStatusBadge(viewingActivity.status).class} px-3 py-2`, style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }, children: getStatusBadge(viewingActivity.status).label }), _jsxs("span", { className: `badge ${getPriorityBadge(viewingActivity.priority).class} px-3 py-2`, style: {
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '0.25rem',
                                                            lineHeight: '1'
                                                        }, children: [getPriorityBadge(viewingActivity.priority).icon && (_jsx("span", { style: { display: 'inline-flex', alignItems: 'center', lineHeight: '1' }, children: getPriorityBadge(viewingActivity.priority).icon })), _jsx("span", { style: { lineHeight: '1', display: 'inline-block' }, children: getPriorityBadge(viewingActivity.priority).label })] }), _jsxs("span", { className: "badge bg-info px-3 py-2", style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }, children: [getTypeIcon(viewingActivity.type), _jsx("span", { className: "ms-1 text-capitalize", children: viewingActivity.type })] })] })] }), viewingActivity.description && (_jsxs("div", { className: "mb-4 p-3", style: {
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '8px',
                                            borderLeft: '4px solid #0d6efd'
                                        }, children: [_jsx("strong", { style: { color: '#0d6efd', display: 'block', marginBottom: '0.5rem' }, children: "Description" }), _jsx("p", { style: { whiteSpace: 'pre-wrap', margin: 0, color: '#555' }, children: viewingActivity.description })] })), _jsxs("div", { className: "row g-3 mb-4", children: [viewingActivity.dueDate && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3 h-100", style: {
                                                        backgroundColor: '#fff3cd',
                                                        borderRadius: '8px',
                                                        border: '1px solid #ffc107'
                                                    }, children: [_jsxs("div", { className: "d-flex align-items-center mb-2", children: [_jsx(FaClock, { className: "text-warning me-2" }), _jsx("strong", { style: { color: '#856404' }, children: "Due Date & Time" })] }), _jsx("p", { style: { margin: 0, color: '#856404', fontWeight: '500' }, children: new Date(viewingActivity.dueDate).toLocaleString('th-TH', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            }) })] }) })), viewingActivity.assignedToEmail && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3 h-100", style: {
                                                        backgroundColor: '#f8f9fa',
                                                        borderRadius: '8px'
                                                    }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Assigned To" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: (() => {
                                                                const assignedUser = users.find((u) => (u.id || u.userId) === viewingActivity.assignedTo);
                                                                if (assignedUser) {
                                                                    const name = `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim();
                                                                    return name || assignedUser.email || viewingActivity.assignedToEmail || '-';
                                                                }
                                                                return viewingActivity.assignedToEmail || '-';
                                                            })() })] }) }))] }), viewingActivity.relatedTo && viewingActivity.relatedId && (_jsxs("div", { className: "mb-4 p-3", style: {
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '8px',
                                            borderLeft: '4px solid #0d6efd'
                                        }, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", style: { minHeight: '2rem' }, children: [_jsxs("strong", { style: { color: '#0d6efd', textTransform: 'capitalize', display: 'flex', alignItems: 'center', height: '100%' }, children: ["Related To: ", viewingActivity.relatedTo] }), viewingActivity.relatedTo === 'contact' && relatedContact && (_jsxs("button", { className: "btn btn-sm btn-link p-0", onClick: () => setShowContactModal(true), style: {
                                                            color: '#0d6efd',
                                                            textDecoration: 'none',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            height: '100%',
                                                            margin: 0,
                                                            padding: '0.25rem 0'
                                                        }, title: "View Contact Details", children: [_jsx(FaEye, { style: { marginRight: '0.375rem', fontSize: '0.875rem' } }), _jsx("span", { children: "View Details" })] })), viewingActivity.relatedTo === 'company' && relatedCompany && (_jsxs("button", { className: "btn btn-sm btn-link p-0", onClick: () => setShowContactModal(true), style: {
                                                            color: '#0d6efd',
                                                            textDecoration: 'none',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            height: '100%',
                                                            margin: 0,
                                                            padding: '0.25rem 0'
                                                        }, title: "View Company Details", children: [_jsx(FaEye, { style: { marginRight: '0.375rem', fontSize: '0.875rem' } }), _jsx("span", { children: "View Details" })] }))] }), _jsx("p", { style: { margin: 0, color: '#0d6efd', fontWeight: '500' }, children: viewingActivity.relatedTo === 'contact' && relatedContact ? (_jsxs("span", { children: [relatedContact.firstName, " ", relatedContact.lastName, relatedContact.phone && ` - ${relatedContact.phone}`] })) : viewingActivity.relatedTo === 'company' && relatedCompany ? (_jsxs("span", { children: [relatedCompany.name, relatedCompany.type && ` (${relatedCompany.type})`] })) : (_jsx("span", { style: { color: '#666' }, children: viewingActivity.relatedId })) })] })), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: {
                                                        backgroundColor: '#f8f9fa',
                                                        borderRadius: '8px'
                                                    }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Created At" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: viewingActivity.createdAt
                                                                ? new Date(viewingActivity.createdAt).toLocaleString('th-TH', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })
                                                                : '-' })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: {
                                                        backgroundColor: '#f8f9fa',
                                                        borderRadius: '8px'
                                                    }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Last Updated" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: viewingActivity.updatedAt
                                                                ? new Date(viewingActivity.updatedAt).toLocaleString('th-TH', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })
                                                                : '-' })] }) })] })] }), _jsxs("div", { className: "modal-footer", style: {
                                    padding: '1.5rem',
                                    borderTop: '1px solid #e9ecef',
                                    borderRadius: '0 0 16px 16px'
                                }, children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => setViewingActivity(null), style: {
                                            borderRadius: '8px',
                                            padding: '0.5rem 1.5rem',
                                            fontWeight: '500',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }, children: "Close" }), (user?.role === 'admin' ||
                                        user?.role === 'superadmin' ||
                                        viewingActivity.assignedTo === user?.userId) && (_jsxs("button", { type: "button", className: "btn btn-primary", onClick: () => {
                                            setViewingActivity(null);
                                            handleEdit(viewingActivity);
                                        }, style: {
                                            borderRadius: '8px',
                                            padding: '0.5rem 1.5rem',
                                            fontWeight: '500',
                                            background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)',
                                            border: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }, children: [_jsx(FaPen, { className: "me-2" }), "Edit"] }))] })] }) }) })), showContactModal && (relatedContact || relatedCompany) && (_jsx("div", { className: "modal show d-block", style: {
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1060
                }, onClick: (e) => {
                    if (e.target === e.currentTarget) {
                        setShowContactModal(false);
                    }
                }, children: _jsx("div", { className: "modal-dialog modal-lg", style: { marginTop: '5vh' }, children: _jsxs("div", { className: "modal-content", style: {
                            borderRadius: '16px',
                            border: 'none',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            animation: 'slideUp 0.3s ease-out'
                        }, children: [_jsxs("div", { className: "modal-header", style: {
                                    background: 'linear-gradient(135deg, #0d6efd 0%, #0056b3 100%)',
                                    color: 'white',
                                    borderRadius: '16px 16px 0 0',
                                    padding: '1.5rem',
                                    border: 'none'
                                }, children: [_jsx("h5", { className: "modal-title", style: { fontSize: '1.5rem', fontWeight: '600', margin: 0 }, children: relatedContact ? 'Contact Details' : 'Company Details' }), _jsx("button", { type: "button", className: "btn-close btn-close-white", onClick: () => setShowContactModal(false), style: { opacity: 0.9 } })] }), _jsx("div", { className: "modal-body", style: { padding: '2rem' }, children: relatedContact ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-4", children: _jsxs("h4", { style: { color: '#333', fontWeight: '600', marginBottom: '0.5rem' }, children: [relatedContact.firstName, " ", relatedContact.lastName] }) }), _jsxs("div", { className: "row g-3", children: [relatedContact.phone && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Phone" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedContact.phone })] }) })), relatedContact.address && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Address" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedContact.address })] }) }))] })] })) : relatedCompany ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-4", children: [_jsx("h4", { style: { color: '#333', fontWeight: '600', marginBottom: '0.5rem' }, children: relatedCompany.name }), relatedCompany.type && (_jsx("span", { className: `badge ${relatedCompany.type === 'company' ? 'bg-primary' : 'bg-secondary'} px-3 py-2`, style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }, children: relatedCompany.type === 'company' ? 'Company' : 'Individual' }))] }), _jsxs("div", { className: "mb-3", children: [_jsx("h6", { style: { color: '#667eea', fontWeight: '600', marginBottom: '1rem' }, children: "Basic Information" }), _jsxs("div", { className: "row g-3", children: [relatedCompany.address && (_jsx("div", { className: "col-md-12", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Address" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.address })] }) })), relatedCompany.phone && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Phone" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.phone })] }) })), relatedCompany.fax && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Fax" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.fax })] }) })), relatedCompany.taxId && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Tax ID" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.taxId })] }) }))] })] }), relatedCompany.type === 'company' && (relatedCompany.branchName || relatedCompany.branchNumber) && (_jsxs("div", { className: "mb-3", children: [_jsx("h6", { style: { color: '#667eea', fontWeight: '600', marginBottom: '1rem' }, children: "Branch Information" }), _jsxs("div", { className: "row g-3", children: [relatedCompany.branchName && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Branch Name" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.branchName })] }) })), relatedCompany.branchNumber && (_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#f8f9fa', borderRadius: '8px' }, children: [_jsx("strong", { style: { color: '#666', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Branch Number" }), _jsx("p", { style: { margin: 0, color: '#333', fontSize: '0.9rem' }, children: relatedCompany.branchNumber })] }) }))] })] })), (relatedCompany.billingCycle || relatedCompany.billingDate || relatedCompany.notificationDate) && (_jsxs("div", { className: "mb-3", children: [_jsx("h6", { style: { color: '#667eea', fontWeight: '600', marginBottom: '1rem' }, children: "Billing Information" }), _jsxs("div", { className: "row g-3", children: [relatedCompany.billingCycle && (_jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }, children: [_jsx("strong", { style: { color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Billing Cycle" }), _jsx("p", { style: { margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: '500', textTransform: 'capitalize' }, children: relatedCompany.billingCycle })] }) })), relatedCompany.billingDate && (_jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }, children: [_jsx("strong", { style: { color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Billing Date" }), _jsxs("p", { style: { margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: '500' }, children: ["Day ", relatedCompany.billingDate, " of month"] })] }) })), relatedCompany.notificationDate && (_jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "p-3", style: { backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }, children: [_jsx("strong", { style: { color: '#856404', fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }, children: "Notification Date" }), _jsxs("p", { style: { margin: 0, color: '#856404', fontSize: '0.9rem', fontWeight: '500' }, children: ["Day ", relatedCompany.notificationDate, " of month"] })] }) }))] })] }))] })) : null }), _jsx("div", { className: "modal-footer", style: {
                                    padding: '1.5rem',
                                    borderTop: '1px solid #e9ecef',
                                    borderRadius: '0 0 16px 16px'
                                }, children: _jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => setShowContactModal(false), style: {
                                        borderRadius: '8px',
                                        padding: '0.5rem 1.5rem',
                                        fontWeight: '500',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }, children: "Close" }) })] }) }) })), _jsx("style", { children: `
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
      ` })] }));
};
