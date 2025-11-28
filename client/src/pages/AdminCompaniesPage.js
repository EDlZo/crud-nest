import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { FaCog, FaTrash } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../utils/api';
// use apiFetch for network calls (provides better error messages)
export const AdminCompaniesPage = () => {
    const { token } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [misconfigured, setMisconfigured] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        // In production, if VITE_API_BASE_URL is not set the config falls back to window.location.origin
        // which means API calls will hit the SPA host and return HTML. Detect and show a clear message.
        try {
            if (!import.meta.env.DEV && API_BASE_URL === window.location.origin) {
                setMisconfigured(true);
                setError('API base URL not configured for production. Set `VITE_API_BASE_URL` to your backend URL so API requests reach the server (not the SPA).');
            }
        }
        catch (e) {
            // ignore in environments where import.meta is unavailable
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const fetchCompanies = async () => {
        setLoading(true);
        setError(null);
        if (misconfigured) {
            setLoading(false);
            return;
        }
        try {
            const data = await apiFetch('/companies', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (typeof data === 'string') {
                // server returned non-JSON (likely HTML) — show a helpful preview
                const preview = data.slice(0, 300);
                throw new Error(`Expected JSON but server returned non-JSON response. Preview: ${preview}`);
            }
            setCompanies(data || []);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchCompanies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this company?'))
            return;
        try {
            await apiFetch(`/companies/${id}`, {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            fetchCompanies();
        }
        catch (err) {
            setError(err.message);
        }
    };
    const handleEdit = (company) => {
        setEditing(company);
    };
    const handleSave = async (company) => {
        setSaving(true);
        setError(null);
        try {
            await apiFetch(`/companies/${company.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(company),
            });
            fetchCompanies();
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSaving(false);
            setEditing(null);
        }
    };
    return (_jsxs("div", { className: "container-fluid", children: [_jsx("h1", { className: "h3 mb-4 text-gray-800", children: "Companies / Organizations" }), misconfigured ? (_jsxs("div", { className: "alert alert-danger", children: [_jsx("p", { className: "mb-2", children: "API base URL not configured for production." }), _jsxs("p", { className: "mb-2", children: ["Set ", _jsx("code", { children: "VITE_API_BASE_URL" }), " to your backend URL so API requests reach the server (not the SPA). Example:"] }), _jsx("pre", { className: "small", children: "VITE_API_BASE_URL=https://api.example.com" }), _jsx("div", { className: "mt-2", children: _jsx("button", { type: "button", className: "btn btn-sm btn-secondary", onClick: () => {
                                const example = 'VITE_API_BASE_URL=https://api.example.com';
                                try {
                                    navigator.clipboard.writeText(example);
                                    // eslint-disable-next-line no-alert
                                    alert('Copied example to clipboard');
                                }
                                catch (e) {
                                    // fallback: do nothing
                                }
                            }, children: "Copy example" }) })] })) : (error && _jsx("div", { className: "alert alert-danger", children: error })), loading ? (_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "sr-only", children: "Loading..." }) })) : (_jsxs("table", { className: "table table-striped", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Company Name" }), _jsx("th", { children: "Branch Name" }), _jsx("th", { children: "Tax ID" }), _jsx("th", { children: "Phone" }), _jsx("th", { children: "Fax" }), _jsx("th", { children: "Contact Email" }), _jsx("th", { children: "Avatar" }), _jsx("th", { children: "Website" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: companies.map((company) => (_jsxs("tr", { children: [_jsx("td", { children: company.name }), _jsx("td", { children: company.branchName }), _jsx("td", { children: company.taxId }), _jsx("td", { children: company.phone }), _jsx("td", { children: company.fax }), _jsx("td", { children: company.contactEmail }), _jsx("td", { children: company.avatarUrl }), _jsx("td", { children: company.website }), _jsx("td", { children: company.status }), _jsxs("td", { children: [_jsx("button", { className: "btn btn-primary btn-sm", "aria-label": "edit", title: "Edit", onClick: () => handleEdit(company), children: _jsx(FaCog, {}) }), _jsx("button", { className: "btn btn-danger btn-sm", "aria-label": "delete", title: "Delete", onClick: () => handleDelete(company.id), children: _jsx(FaTrash, {}) })] })] }, company.id))) })] })), editing && (_jsxs("div", { className: "card shadow mb-4", children: [_jsx("div", { className: "card-header py-3", children: _jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Edit Company" }) }), _jsx("div", { className: "card-body", children: _jsxs("form", { onSubmit: (e) => {
                                e.preventDefault();
                                handleSave(editing);
                            }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Company Name" }), _jsx("input", { type: "text", className: "form-control", value: editing.name, onChange: (e) => setEditing({ ...editing, name: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Branch Name" }), _jsx("input", { type: "text", className: "form-control", value: editing.branchName, onChange: (e) => setEditing({ ...editing, branchName: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Tax ID" }), _jsx("input", { type: "text", className: "form-control", value: editing.taxId, onChange: (e) => setEditing({ ...editing, taxId: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Phone" }), _jsx("input", { type: "text", className: "form-control", value: editing.phone, onChange: (e) => setEditing({ ...editing, phone: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Fax" }), _jsx("input", { type: "text", className: "form-control", value: editing.fax, onChange: (e) => setEditing({ ...editing, fax: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Contact Email" }), _jsx("input", { type: "email", className: "form-control", value: editing.contactEmail, onChange: (e) => setEditing({ ...editing, contactEmail: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Avatar URL" }), _jsx("input", { type: "text", className: "form-control", value: editing.avatarUrl, onChange: (e) => setEditing({ ...editing, avatarUrl: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Website" }), _jsx("input", { type: "text", className: "form-control", value: editing.website, onChange: (e) => setEditing({ ...editing, website: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Status" }), _jsxs("select", { className: "form-control", value: editing.status, onChange: (e) => setEditing({ ...editing, status: e.target.value }), children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "inactive", children: "Inactive" })] })] }), _jsx("button", { type: "submit", className: "btn btn-primary", children: "Save" })] }) })] }))] }));
};
