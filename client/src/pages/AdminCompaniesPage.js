import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
const withBase = (path) => `${API_BASE_URL}${path}`;
export const AdminCompaniesPage = () => {
    const { token } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const fetchCompanies = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(withBase('/companies'), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok)
                throw new Error('ไม่สามารถดึงข้อมูลบริษัทได้');
            const data = await res.json();
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
        if (!confirm('ยืนยันลบบริษัทนี้?'))
            return;
        try {
            const res = await fetch(withBase(`/companies/${id}`), {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok)
                throw new Error('ไม่สามารถลบได้');
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
            const res = await fetch(withBase(`/companies/${company.id}`), {
                method: 'PUT',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: JSON.stringify(company),
            });
            if (!res.ok)
                throw new Error('ไม่สามารถแก้ไขได้');
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
    return (_jsxs("div", { className: "container-fluid", children: [_jsx("h1", { className: "h3 mb-4 text-gray-800", children: "\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17/\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E23" }), error && _jsx("div", { className: "alert alert-danger", children: error }), loading ? (_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "sr-only", children: "Loading..." }) })) : (_jsxs("table", { className: "table table-striped", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "\u0E0A\u0E37\u0E48\u0E2D\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17" }), _jsx("th", { children: "\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E02\u0E32" }), _jsx("th", { children: "\u0E40\u0E25\u0E02\u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E35\u0E22\u0E20\u0E32\u0E29\u0E35" }), _jsx("th", { children: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C" }), _jsx("th", { children: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E41\u0E1F\u0E01\u0E0B\u0E4C" }), _jsx("th", { children: "\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D" }), _jsx("th", { children: "\u0E23\u0E39\u0E1B\u0E42\u0E1B\u0E23\u0E44\u0E1F\u0E25\u0E4C" }), _jsx("th", { children: "\u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E15\u0E4C" }), _jsx("th", { children: "\u0E2A\u0E16\u0E32\u0E19\u0E30" }), _jsx("th", { children: "\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23" })] }) }), _jsx("tbody", { children: companies.map((company) => (_jsxs("tr", { children: [_jsx("td", { children: company.name }), _jsx("td", { children: company.branchName }), _jsx("td", { children: company.taxId }), _jsx("td", { children: company.phone }), _jsx("td", { children: company.fax }), _jsx("td", { children: company.contactEmail }), _jsx("td", { children: company.avatarUrl }), _jsx("td", { children: company.website }), _jsx("td", { children: company.status }), _jsxs("td", { children: [_jsx("button", { className: "btn btn-primary btn-sm", onClick: () => handleEdit(company), children: "\u0E41\u0E01\u0E49\u0E44\u0E02" }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: () => handleDelete(company.id), children: "\u0E25\u0E1A" })] })] }, company.id))) })] })), editing && (_jsxs("div", { className: "card shadow mb-4", children: [_jsx("div", { className: "card-header py-3", children: _jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "\u0E41\u0E01\u0E49\u0E44\u0E02\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17" }) }), _jsx("div", { className: "card-body", children: _jsxs("form", { onSubmit: (e) => {
                                e.preventDefault();
                                handleSave(editing);
                            }, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0E0A\u0E37\u0E48\u0E2D\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17" }), _jsx("input", { type: "text", className: "form-control", value: editing.name, onChange: (e) => setEditing({ ...editing, name: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E02\u0E32" }), _jsx("input", { type: "text", className: "form-control", value: editing.branchName, onChange: (e) => setEditing({ ...editing, branchName: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0E40\u0E25\u0E02\u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E35\u0E22\u0E20\u0E32\u0E29\u0E35" }), _jsx("input", { type: "text", className: "form-control", value: editing.taxId, onChange: (e) => setEditing({ ...editing, taxId: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C" }), _jsx("input", { type: "text", className: "form-control", value: editing.phone, onChange: (e) => setEditing({ ...editing, phone: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E41\u0E1F\u0E01\u0E0B\u0E4C" }), _jsx("input", { type: "text", className: "form-control", value: editing.fax, onChange: (e) => setEditing({ ...editing, fax: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D" }), _jsx("input", { type: "email", className: "form-control", value: editing.contactEmail, onChange: (e) => setEditing({ ...editing, contactEmail: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0E23\u0E39\u0E1B\u0E42\u0E1B\u0E23\u0E44\u0E1F\u0E25\u0E4C" }), _jsx("input", { type: "text", className: "form-control", value: editing.avatarUrl, onChange: (e) => setEditing({ ...editing, avatarUrl: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E15\u0E4C" }), _jsx("input", { type: "text", className: "form-control", value: editing.website, onChange: (e) => setEditing({ ...editing, website: e.target.value }) })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "\u0E2A\u0E16\u0E32\u0E19\u0E30" }), _jsxs("select", { className: "form-control", value: editing.status, onChange: (e) => setEditing({ ...editing, status: e.target.value }), children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "inactive", children: "Inactive" })] })] }), _jsx("button", { type: "submit", className: "btn btn-primary", children: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01" })] }) })] }))] }));
};
