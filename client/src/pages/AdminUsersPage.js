import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaTrash, FaUserCircle } from 'react-icons/fa';
import '../App.css';
export const AdminUsersPage = () => {
    const { token, user, logout } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // pending role changes keyed by userId => role ('admin'|'superadmin'|'guest')
    const [pending, setPending] = useState({});
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    useEffect(() => {
        if (!token)
            return;
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);
    useEffect(() => {
        const handleProfileUpdate = () => {
            // Refresh users list when profile is updated
            if (token) {
                fetchUsers();
            }
        };
        window.addEventListener('profileUpdated', handleProfileUpdate);
        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdate);
        };
    }, [token]);
    // Reset to first page if current page exceeds total pages
    useEffect(() => {
        const totalPages = Math.ceil(users.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [users.length, currentPage, itemsPerPage]);
    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/auth/users/list', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok)
                throw new Error(await res.text());
            const data = await res.json();
            // Sort users by createdAt descending (newest first)
            const sortedUsers = (data || []).sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA; // Descending order (newest first)
            });
            setUsers(sortedUsers);
            // reset pending when we refetch authoritative data
            setPending({});
            // Reset to first page when users list changes
            setCurrentPage(1);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const changeRole = async (userId, role) => {
        if (!token)
            return;
        setError(null);
        try {
            const res = await fetch('/auth/users/role', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, role }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok)
                throw new Error((data && data.message) ? data.message : (await res.text()));
            await fetchUsers();
            // If backend returned a token for the user, copy it to clipboard and notify admin
            if (data?.token) {
                try {
                    await navigator.clipboard.writeText(data.token);
                    alert('New token copied to clipboard.\nSend it to the user so they can log in');
                }
                catch {
                    // fallback: show prompt so admin can copy manually
                    // eslint-disable-next-line no-alert
                    prompt('User\'s new token (copy manually):', data.token);
                }
            }
        }
        catch (err) {
            setError(err.message);
        }
    };
    // -- New: batched changes UI handlers --
    const setPendingRole = (userId, role) => {
        setPending((p) => ({ ...p, [userId]: role }));
    };
    const hasPendingChanges = () => {
        return Object.keys(pending).some((id) => {
            const newRole = pending[id];
            if (typeof newRole === 'undefined')
                return false;
            const current = users.find((u) => u.userId === id)?.role ?? 'guest';
            return newRole !== current;
        });
    };
    const saveAll = async () => {
        if (!token)
            return;
        setError(null);
        setLoading(true);
        try {
            const changes = Object.entries(pending).filter(([id, role]) => {
                if (typeof role === 'undefined')
                    return false;
                const current = users.find((u) => u.userId === id)?.role ?? 'guest';
                return role !== current;
            });
            // sequentially apply changes (server expects single user per request)
            // track if current user was affected so we can prompt sign-out
            let promptedSignOut = false;
            for (const [userId, role] of changes) {
                if (!role)
                    continue;
                const res = await fetch('/auth/users/role', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId, role }),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    const body = (data && (data.message || JSON.stringify(data))) || (await res.text());
                    throw new Error(body || `Failed to update ${userId}`);
                }
                // If backend returned a token for this user, handle it
                if (data?.token) {
                    try {
                        // If the affected user is the currently logged-in user, prompt them to re-login
                        if (user?.userId && data.userId === user.userId) {
                            promptedSignOut = true;
                        }
                        else {
                            // otherwise copy token for admin to deliver
                            await navigator.clipboard.writeText(data.token);
                            alert('New token copied to clipboard.\nSend it to the user so they can log in');
                        }
                    }
                    catch {
                        // fallback: show prompt so admin can copy manually
                        // eslint-disable-next-line no-alert
                        if (!(user?.userId && data.userId === user.userId))
                            prompt('User\'s new token (copy manually):', data.token);
                    }
                }
            }
            // refresh list and clear pending
            await fetchUsers();
            setPending({});
            if (promptedSignOut) {
                // show a modal-like alert then sign the user out and redirect to login
                // use confirm to ensure UX in this tab — we can replace with a nicer modal if desired
                // eslint-disable-next-line no-alert
                const ok = confirm('Your account permissions have changed. Do you want to log out and go to the login page to refresh your permissions?');
                if (ok) {
                    logout();
                    navigate('/login');
                }
            }
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    // Confirm modal state for deleting a user
    const [confirmTarget, setConfirmTarget] = useState(null);
    const deleteUser = async (userId) => {
        if (!token)
            return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/auth/users/delete', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok)
                throw new Error(await res.text());
            await fetchUsers();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
            setConfirmTarget(null);
        }
    };
    const openDeleteConfirm = (userId, email) => setConfirmTarget({ userId, email });
    const cancelDelete = () => setConfirmTarget(null);
    const cancelAll = () => setPending({});
    const canManageRoles = user?.role === 'superadmin';
    // allow any authenticated user to view the users page in read-only mode
    // Pagination calculations
    const totalPages = Math.ceil(users.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentUsers = users.slice(startIndex, endIndex);
    const startEntry = users.length > 0 ? startIndex + 1 : 0;
    const endEntry = Math.min(endIndex, users.length);
    // Pagination handlers
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };
    const goToPrevious = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };
    const goToNext = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };
    // Generate page numbers to display (show max 3 pages)
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 3) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        }
        else {
            if (currentPage === 1) {
                pages.push(1, 2, 3);
            }
            else if (currentPage === totalPages) {
                pages.push(totalPages - 2, totalPages - 1, totalPages);
            }
            else {
                pages.push(currentPage - 1, currentPage, currentPage + 1);
            }
        }
        return pages;
    };
    // Helper to format date from ISO string or return formatted date
    const formatDate = (dateString) => {
        if (!dateString)
            return '-';
        try {
            const date = new Date(dateString);
            // Check if date is valid
            if (isNaN(date.getTime()))
                return '-';
            // Format as DD/MM/YYYY HH:MM
            const dateStr = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const timeStr = date.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            return `${dateStr} ${timeStr}`;
        }
        catch {
            return '-';
        }
    };
    return (_jsxs("div", { className: "container-fluid", children: [_jsx("h1", { className: "h3 mb-4 text-gray-800", children: "Manage Users" }), _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex flex-row align-items-center justify-content-between", children: [_jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Users and Roles" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-secondary me-2", onClick: fetchUsers, disabled: loading, children: loading ? 'Loading...' : 'Refresh' }), canManageRoles && hasPendingChanges() && (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-sm btn-primary me-2", onClick: saveAll, disabled: loading, children: "Save changes" }), _jsx("button", { className: "btn btn-sm btn-danger", onClick: cancelAll, disabled: loading, children: "Cancel" })] }))] })] }), _jsxs("div", { className: "card-body", children: [error && _jsx("div", { className: "alert alert-danger", children: error }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table align-middle", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: '5%' }, children: "#" }), _jsx("th", { style: { width: '40%' }, children: "Name" }), _jsx("th", { style: { width: '20%' }, children: "Date Created" }), _jsx("th", { style: { width: '20%' }, children: "Role" }), _jsx("th", { style: { width: '15%', textAlign: 'center' }, children: "Action" })] }) }), _jsx("tbody", { children: currentUsers.map((u, index) => {
                                                const globalIndex = startIndex + index;
                                                const selected = (typeof pending[u.userId] !== 'undefined' ? pending[u.userId] : (u.role ?? 'guest'));
                                                const changed = typeof pending[u.userId] !== 'undefined' && pending[u.userId] !== (u.role ?? 'guest');
                                                return (_jsxs("tr", { className: changed ? 'table-warning' : '', children: [_jsx("td", { children: globalIndex + 1 }), _jsx("td", { children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsxs("div", { className: "me-3", children: [u.avatarUrl ? (_jsx("img", { src: u.avatarUrl, alt: u.email, className: "rounded-circle", style: { width: 40, height: 40, objectFit: 'cover' }, onError: (e) => {
                                                                                    // Fallback to icon if image fails to load
                                                                                    const target = e.target;
                                                                                    target.style.display = 'none';
                                                                                    const icon = target.nextElementSibling;
                                                                                    if (icon)
                                                                                        icon.style.display = 'block';
                                                                                } })) : null, _jsx(FaUserCircle, { size: 40, className: "text-gray-400", style: { display: u.avatarUrl ? 'none' : 'block' } })] }), _jsxs("div", { children: [_jsx("div", { className: "fw-bold text-dark", children: u.email.split('@')[0] }), _jsx("div", { className: "small text-muted", children: u.email })] })] }) }), _jsx("td", { children: formatDate(u.createdAt) }), _jsx("td", { children: _jsxs("select", { className: "form-select form-select-sm", style: { width: 'auto', minWidth: '100px' }, value: selected, onChange: (e) => setPendingRole(u.userId, e.target.value), disabled: !canManageRoles, children: [_jsx("option", { value: "guest", children: "Guest" }), _jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "superadmin", children: "Superadmin" })] }) }), _jsx("td", { style: { textAlign: 'center' }, children: _jsx("div", { className: "d-flex align-items-center justify-content-center", children: _jsx("button", { className: "btn btn-link text-danger p-0", title: "Delete", onClick: () => openDeleteConfirm(u.userId, u.email), disabled: loading || !canManageRoles, children: _jsx(FaTrash, { size: 18 }) }) }) })] }, u.id));
                                            }) })] }) }), _jsxs("div", { className: "d-flex justify-content-between align-items-center mt-3", children: [_jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsxs("div", { className: "small text-muted", children: ["Showing ", startEntry, " to ", endEntry, " of ", users.length, " entries"] }), _jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("label", { htmlFor: "itemsPerPage", className: "small text-muted mb-0", children: "Show:" }), _jsxs("select", { id: "itemsPerPage", className: "form-select form-select-sm", style: { width: 'auto' }, value: itemsPerPage, onChange: (e) => {
                                                            setItemsPerPage(Number(e.target.value));
                                                            setCurrentPage(1); // Reset to first page when changing items per page
                                                        }, children: [_jsx("option", { value: "10", children: "10" }), _jsx("option", { value: "25", children: "25" }), _jsx("option", { value: "50", children: "50" }), _jsx("option", { value: "100", children: "100" })] })] })] }), _jsx("nav", { children: _jsxs("ul", { className: "pagination pagination-sm mb-0", children: [_jsx("li", { className: `page-item ${currentPage === 1 ? 'disabled' : ''}`, children: _jsx("button", { className: "page-link", onClick: goToPrevious, disabled: currentPage === 1, style: { cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }, children: "Previous" }) }), getPageNumbers().map((pageNum) => (_jsx("li", { className: `page-item ${currentPage === pageNum ? 'active' : ''}`, children: _jsx("button", { className: "page-link", onClick: () => goToPage(pageNum), style: { cursor: 'pointer' }, children: pageNum }) }, pageNum))), _jsx("li", { className: `page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`, children: _jsx("button", { className: "page-link", onClick: goToNext, disabled: currentPage === totalPages || totalPages === 0, style: { cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer' }, children: "Next" }) })] }) })] })] })] }), confirmTarget && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Confirm Delete User" }), _jsx("button", { type: "button", className: "btn-close", onClick: cancelDelete })] }), _jsx("div", { className: "modal-body", children: _jsxs("p", { children: ["Are you sure you want to delete user ", _jsx("strong", { children: confirmTarget.email }), "? This action cannot be undone."] }) }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: cancelDelete, children: "Cancel" }), _jsx("button", { type: "button", className: "btn btn-danger", onClick: () => deleteUser(confirmTarget.userId), children: "Delete" })] })] }) }) }))] }));
};
