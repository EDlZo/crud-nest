import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import '../App.css';
export const VisibilityPage = () => {
    const { token, user, logout } = useAuth();
    const [visibility, setVisibility] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!token)
            return;
        fetchVisibility();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);
    const fetchVisibility = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/visibility`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok)
                throw new Error(await res.text());
            const data = await res.json();
            setVisibility(data || {});
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const pageKeys = [
        { key: 'dashboard', label: 'Manage Data' },
        { key: 'companies', label: 'Companies' },
        { key: 'activities', label: 'Activities & Tasks' },
        // { key: 'deals', label: 'Deals Pipeline' }, // Hidden temporarily
        { key: 'admin_users', label: 'Manage Users' },
        { key: 'visibility', label: 'Visibility Settings' },
    ];
    const roles = ['superadmin', 'admin', 'guest'];
    const toggle = (role, pageKey) => {
        setVisibility((v) => {
            const copy = JSON.parse(JSON.stringify(v || {}));
            copy[role] = copy[role] || {};
            copy[role][pageKey] = !Boolean(copy[role][pageKey]);
            return copy;
        });
    };
    const save = async () => {
        if (!token || !visibility)
            return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/visibility`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ visibility }),
            });
            if (!res.ok)
                throw new Error(await res.text());
            await fetchVisibility();
            alert('Visibility settings saved');
            // Dispatch custom event to notify Sidebar to refresh visibility
            window.dispatchEvent(new CustomEvent('visibilityUpdated'));
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const canManageVisibility = user?.role === 'superadmin';
    return (_jsxs("div", { className: "container-fluid", children: [_jsx("h1", { className: "h3 mb-4 text-gray-800", children: "Visibility Settings" }), _jsxs("div", { className: "card shadow mb-4", children: [_jsx("div", { className: "card-header py-3", children: _jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Select which pages each role can see" }) }), _jsxs("div", { className: "card-body", children: [error && _jsx("div", { className: "alert alert-danger", children: error }), loading && _jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading..." }) }), !canManageVisibility && (_jsx("div", { className: "alert alert-warning", children: "You can view these settings, but only Superadmin can edit them" })), _jsx("div", { className: "row", children: roles.map((role) => (_jsx("div", { className: "col-md-4 mb-4", children: _jsx("div", { className: "card border-left-primary shadow h-100 py-2", children: _jsx("div", { className: "card-body", children: _jsx("div", { className: "row no-gutters align-items-center", children: _jsxs("div", { className: "col mr-2", children: [_jsx("div", { className: "text-xs font-weight-bold text-primary text-uppercase mb-1", children: role }), _jsx("div", { className: "h5 mb-0 font-weight-bold text-gray-800", children: pageKeys.map((p) => (_jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", checked: Boolean(visibility?.[role]?.[p.key]), onChange: () => toggle(role, p.key), disabled: !canManageVisibility }), _jsx("label", { className: "form-check-label", children: p.label })] }, p.key))) })] }) }) }) }) }, role))) }), _jsxs("div", { className: "mt-3", children: [_jsx("button", { className: "btn btn-primary me-2", onClick: save, disabled: !canManageVisibility || loading, children: loading ? 'Saving...' : 'Save' }), _jsx("button", { className: "btn btn-secondary", onClick: fetchVisibility, disabled: !canManageVisibility || loading, children: "Cancel" })] })] })] })] }));
};
export default VisibilityPage;
