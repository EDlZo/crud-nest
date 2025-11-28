import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import '../App.css';
import { API_BASE_URL } from '../config';
const withBase = (path) => `${API_BASE_URL}${path}`;
export const CompaniesPage = () => {
    const [form, setForm] = useState({
        name: '',
        address: '',
        phone: '',
        fax: '',
        taxId: '',
        branchName: '',
        branchNumber: '',
        website: '',
        contactEmail: '',
        // Socials
        lineId: '',
        facebook: '',
        instagram: '',
        avatarUrl: '',
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!form.name) {
            setError('กรุณากรอกชื่อบริษัท');
            return;
        }
        setSubmitting(true);
        try {
            // Construct payload matching Backend DTO
            const payload = {
                name: form.name,
                address: form.address,
                phone: form.phone,
                fax: form.fax,
                taxId: form.taxId,
                branchName: form.branchName,
                branchNumber: form.branchNumber,
                avatarUrl: form.avatarUrl,
                // Map flat social fields to socials object
                socials: {
                    line: form.lineId,
                    facebook: form.facebook,
                    instagram: form.instagram,
                    website: form.website, // Assuming we put website in socials or keep it separate if backend supports it. 
                    // Based on DTO, socials is Record<string, string>. I'll put website there too if it's not a direct field.
                    // But wait, previous code had website in form. I'll keep it in socials for now as DTO didn't show website field.
                },
                // contactEmail: form.contactEmail // DTO didn't show this, but I'll send it just in case or maybe it's unused.
            };
            const res = await fetch(withBase('/companies'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const payload = await res.json().catch(() => null);
                const message = (payload && (payload.message || payload.error)) || 'ไม่สามารถส่งข้อมูลได้';
                throw new Error(Array.isArray(message) ? message[0] : message);
            }
            setSuccess('ส่งข้อมูลเรียบร้อยแล้ว ขอบคุณครับ');
            setForm({
                name: '', address: '', phone: '', fax: '', taxId: '', branchName: '', branchNumber: '',
                website: '', contactEmail: '', lineId: '', facebook: '', instagram: '', avatarUrl: ''
            });
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "container-fluid", children: [_jsx("h1", { className: "h3 mb-4 text-gray-800", children: "\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17/\u0E2D\u0E07\u0E04\u0E4C\u0E01\u0E23" }), _jsxs("div", { className: "card shadow mb-4", children: [_jsx("div", { className: "card-header py-3", children: _jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B" }) }), _jsx("div", { className: "card-body", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsxs("label", { className: "form-label", children: ["\u0E0A\u0E37\u0E48\u0E2D\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17 ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { className: "form-control", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), required: true })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E40\u0E25\u0E02\u0E1C\u0E39\u0E49\u0E40\u0E2A\u0E35\u0E22\u0E20\u0E32\u0E29\u0E35" }), _jsx("input", { className: "form-control", value: form.taxId, onChange: (e) => setForm({ ...form, taxId: e.target.value }) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E0A\u0E37\u0E48\u0E2D\u0E2A\u0E32\u0E02\u0E32" }), _jsx("input", { className: "form-control", value: form.branchName, onChange: (e) => setForm({ ...form, branchName: e.target.value }) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E23\u0E2B\u0E31\u0E2A\u0E2A\u0E32\u0E02\u0E32" }), _jsx("input", { className: "form-control", value: form.branchNumber, onChange: (e) => setForm({ ...form, branchNumber: e.target.value }) })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48" }), _jsx("textarea", { className: "form-control", rows: 3, value: form.address, onChange: (e) => setForm({ ...form, address: e.target.value }) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C" }), _jsx("input", { className: "form-control", value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E41\u0E1F\u0E01\u0E0B\u0E4C" }), _jsx("input", { className: "form-control", value: form.fax, onChange: (e) => setForm({ ...form, fax: e.target.value }) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D" }), _jsx("input", { type: "email", className: "form-control", value: form.contactEmail, onChange: (e) => setForm({ ...form, contactEmail: e.target.value }) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "\u0E23\u0E39\u0E1B\u0E42\u0E1B\u0E23\u0E44\u0E1F\u0E25\u0E4C (URL)" }), _jsx("input", { className: "form-control", value: form.avatarUrl, onChange: (e) => setForm({ ...form, avatarUrl: e.target.value }), placeholder: "https://example.com/logo.png" })] })] }), _jsx("hr", {}), _jsx("h6", { className: "m-0 font-weight-bold text-primary mb-3", children: "Social Media" }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Website" }), _jsx("input", { className: "form-control", value: form.website, onChange: (e) => setForm({ ...form, website: e.target.value }) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "LINE ID" }), _jsx("input", { className: "form-control", value: form.lineId, onChange: (e) => setForm({ ...form, lineId: e.target.value }) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Facebook" }), _jsx("input", { className: "form-control", value: form.facebook, onChange: (e) => setForm({ ...form, facebook: e.target.value }) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", children: "Instagram" }), _jsx("input", { className: "form-control", value: form.instagram, onChange: (e) => setForm({ ...form, instagram: e.target.value }) })] })] }), error && _jsx("div", { className: "alert alert-danger", children: error }), success && _jsx("div", { className: "alert alert-success", children: success }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: submitting, children: submitting ? 'กำลังส่งข้อมูล...' : 'บันทึกข้อมูล' })] }) })] })] }));
};
