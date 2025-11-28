import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaTimesCircle, FaUserCircle } from 'react-icons/fa';
import '../App.css';
export const AdminUsersPage = () => {
    const { token, user, logout } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // pending role changes keyed by userId => role ('admin'|'superadmin'|'guest')
    const [pending, setPending] = useState({});
    useEffect(() => {
        if (!token)
            return;
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);
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
            setUsers(data || []);
            // reset pending when we refetch authoritative data
            setPending({});
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
                    alert('โทเค็นใหม่ของผู้ใช้ถูกคัดลอกไปยังคลิปบอร์ดแล้ว\nส่งให้ผู้ใช้เพื่อให้ล็อกอินใหม่');
                }
                catch {
                    // fallback: show prompt so admin can copy manually
                    // eslint-disable-next-line no-alert
                    prompt('โทเค็นใหม่ของผู้ใช้ (คัดลอกด้วยมือ):', data.token);
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
                            alert('โทเค็นใหม่ของผู้ใช้ถูกคัดลอกไปยังคลิปบอร์ดแล้ว\nส่งให้ผู้ใช้เพื่อให้ล็อกอินใหม่');
                        }
                    }
                    catch {
                        // fallback: show prompt so admin can copy manually
                        // eslint-disable-next-line no-alert
                        if (!(user?.userId && data.userId === user.userId))
                            prompt('โทเค็นใหม่ของผู้ใช้ (คัดลอกด้วยมือ):', data.token);
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
                const ok = confirm('สิทธิ์ของบัญชีคุณถูกเปลี่ยน. ต้องการออกจากระบบและไปยังหน้าเข้าสู่ระบบเพื่อสมัครสิทธิ์ใหม่หรือไม่?');
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
    // Helper to get random date for demo if not provided
    const getRandomDate = () => {
        const start = new Date(2023, 0, 1);
        const end = new Date();
        const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
    };
    return (_jsxs("div", { className: "container-fluid", children: [_jsx("h1", { className: "h3 mb-4 text-gray-800", children: "\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49" }), _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex flex-row align-items-center justify-content-between", children: [_jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E41\u0E25\u0E30\u0E1A\u0E17\u0E1A\u0E32\u0E17" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-secondary me-2", onClick: fetchUsers, disabled: loading, children: loading ? 'กำลังโหลด...' : 'รีเฟรช' }), canManageRoles && hasPendingChanges() && (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-sm btn-primary me-2", onClick: saveAll, disabled: loading, children: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E41\u0E1B\u0E25\u0E07" }), _jsx("button", { className: "btn btn-sm btn-danger", onClick: cancelAll, disabled: loading, children: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01" })] }))] })] }), _jsxs("div", { className: "card-body", children: [error && _jsx("div", { className: "alert alert-danger", children: error }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table align-middle", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: '5%' }, children: "#" }), _jsx("th", { style: { width: '40%' }, children: "Name" }), _jsx("th", { style: { width: '20%' }, children: "Date Created" }), _jsx("th", { style: { width: '20%' }, children: "Role" }), _jsx("th", { style: { width: '15%' }, children: "Action" })] }) }), _jsx("tbody", { children: users.map((u, index) => {
                                                const selected = (typeof pending[u.userId] !== 'undefined' ? pending[u.userId] : (u.role ?? 'guest'));
                                                const changed = typeof pending[u.userId] !== 'undefined' && pending[u.userId] !== (u.role ?? 'guest');
                                                return (_jsxs("tr", { className: changed ? 'table-warning' : '', children: [_jsx("td", { children: index + 1 }), _jsx("td", { children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("div", { className: "me-3", children: _jsx(FaUserCircle, { size: 40, className: "text-gray-400" }) }), _jsxs("div", { children: [_jsx("div", { className: "fw-bold text-dark", children: u.email.split('@')[0] }), _jsx("div", { className: "small text-muted", children: u.email })] })] }) }), _jsx("td", { children: u.createdAt || getRandomDate() }), _jsx("td", { children: _jsxs("select", { className: "form-select form-select-sm", style: { width: 'auto', minWidth: '100px' }, value: selected, onChange: (e) => setPendingRole(u.userId, e.target.value), disabled: !canManageRoles, children: [_jsx("option", { value: "guest", children: "Guest" }), _jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "superadmin", children: "Superadmin" })] }) }), _jsx("td", { children: _jsx("div", { className: "d-flex align-items-center", children: _jsx("button", { className: "btn btn-link text-danger p-0", title: "Delete", onClick: () => openDeleteConfirm(u.userId, u.email), disabled: loading || !canManageRoles, children: _jsx(FaTimesCircle, { size: 18 }) }) }) })] }, u.id));
                                            }) })] }) }), _jsxs("div", { className: "d-flex justify-content-between align-items-center mt-3", children: [_jsxs("div", { className: "small text-muted", children: ["Showing ", users.length, " entries"] }), _jsx("nav", { children: _jsxs("ul", { className: "pagination pagination-sm mb-0", children: [_jsx("li", { className: "page-item disabled", children: _jsx("a", { className: "page-link", href: "#", children: "Previous" }) }), _jsx("li", { className: "page-item active", children: _jsx("a", { className: "page-link", href: "#", children: "1" }) }), _jsx("li", { className: "page-item", children: _jsx("a", { className: "page-link", href: "#", children: "2" }) }), _jsx("li", { className: "page-item", children: _jsx("a", { className: "page-link", href: "#", children: "3" }) }), _jsx("li", { className: "page-item", children: _jsx("a", { className: "page-link", href: "#", children: "Next" }) })] }) })] })] })] }), confirmTarget && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E01\u0E32\u0E23\u0E25\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49" }), _jsx("button", { type: "button", className: "btn-close", onClick: cancelDelete })] }), _jsx("div", { className: "modal-body", children: _jsxs("p", { children: ["\u0E04\u0E38\u0E13\u0E41\u0E19\u0E48\u0E43\u0E08\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48\u0E27\u0E48\u0E32\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49 ", _jsx("strong", { children: confirmTarget.email }), " ? \u0E01\u0E32\u0E23\u0E01\u0E23\u0E30\u0E17\u0E33\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E22\u0E49\u0E2D\u0E19\u0E01\u0E25\u0E31\u0E1A\u0E44\u0E14\u0E49"] }) }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: cancelDelete, children: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01" }), _jsx("button", { type: "button", className: "btn btn-danger", onClick: () => deleteUser(confirmTarget.userId), children: "\u0E25\u0E1A" })] })] }) }) }))] }));
};
