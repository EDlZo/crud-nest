import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaImage, FaFacebook, FaInstagram } from 'react-icons/fa';
import { SiLine } from 'react-icons/si';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
const withBase = (path) => `${API_BASE_URL}${path}`;
export const ProfilePage = () => {
    const navigate = useNavigate();
    const { token, user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [formData, setFormData] = useState({
        avatarUrl: '',
        line: '',
        facebook: '',
        instagram: '',
    });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchProfile();
    }, [token, navigate]);
    const fetchProfile = async () => {
        if (!token)
            return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(withBase('/auth/profile'), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 401) {
                logout();
                navigate('/login');
                return;
            }
            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                const body = contentType.includes('application/json') ? await response.json() : await response.text();
                throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
            }
            const data = await response.json();
            setProfile(data);
            setFormData({
                avatarUrl: data.avatarUrl || '',
                line: data.socials?.line || '',
                facebook: data.socials?.facebook || '',
                instagram: data.socials?.instagram || '',
            });
            // Set preview if avatarUrl exists and is a data URL or external URL
            if (data.avatarUrl) {
                setAvatarPreview(data.avatarUrl);
            }
            else {
                setAvatarPreview(null);
            }
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleChange = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };
    const resizeImage = (file, maxWidth, maxHeight, quality = 0.8) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    }
                    else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = e.target?.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };
    const handleAvatarChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('กรุณาเลือกรูปภาพเท่านั้น');
            return;
        }
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('ขนาดไฟล์ต้องไม่เกิน 5MB');
            return;
        }
        setAvatarFile(file);
        setError(null);
        try {
            // Resize image to max 800x800 and compress to reduce base64 size
            const resizedDataUrl = await resizeImage(file, 800, 800, 0.8);
            setAvatarPreview(resizedDataUrl);
            // Store as data URL for submission
            setFormData((prev) => ({ ...prev, avatarUrl: resizedDataUrl }));
        }
        catch (err) {
            setError('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
            console.error('Image resize error:', err);
        }
    };
    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(null);
        setFormData((prev) => ({ ...prev, avatarUrl: '' }));
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!token)
            return;
        setSubmitting(true);
        setError(null);
        const socials = {
            ...(formData.line.trim() && { line: formData.line.trim() }),
            ...(formData.facebook.trim() && { facebook: formData.facebook.trim() }),
            ...(formData.instagram.trim() && { instagram: formData.instagram.trim() }),
        };
        // Build payload - use type assertion to allow conditional socials
        const payload = {
            avatarUrl: formData.avatarUrl.trim() || undefined,
            // Send empty object if no socials - backend will delete the field
            socials: Object.keys(socials).length > 0 ? socials : {},
        };
        try {
            const response = await fetch(withBase('/auth/profile'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            if (response.status === 401) {
                logout();
                navigate('/login');
                return;
            }
            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                const body = contentType.includes('application/json') ? await response.json() : await response.text();
                throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
            }
            const updated = await response.json();
            setProfile(updated);
            if (updated.avatarUrl) {
                setAvatarPreview(updated.avatarUrl);
            }
            // Trigger custom event to refresh sidebar avatar
            window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updated }));
            alert('บันทึกข้อมูลสำเร็จ');
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setSubmitting(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "container-fluid", children: _jsx("div", { className: "d-flex justify-content-center align-items-center", style: { minHeight: '400px' }, children: _jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading..." }) }) }) }));
    }
    return (_jsxs("div", { className: "container-fluid", children: [_jsx("div", { className: "d-sm-flex align-items-center justify-content-between mb-4", children: _jsx("h1", { className: "h3 mb-0 text-gray-800", children: "Edit Profile" }) }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-8", children: _jsxs("div", { className: "card shadow mb-4", children: [_jsx("div", { className: "card-header py-3", children: _jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Profile Information" }) }), _jsxs("div", { className: "card-body", children: [error && _jsx("div", { className: "alert alert-danger", children: error }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "mb-4", children: [_jsxs("label", { className: "form-label d-flex align-items-center", children: [_jsx(FaImage, { className: "me-2" }), "Profile Photo"] }), _jsxs("div", { className: "mb-3", children: [_jsx("input", { type: "file", className: "form-control", accept: "image/*", onChange: handleAvatarChange }), _jsx("small", { className: "form-text text-muted" })] }), avatarPreview && (_jsxs("div", { className: "mt-3 position-relative d-inline-block", children: [_jsx("img", { src: avatarPreview, alt: "Avatar Preview", style: {
                                                                        width: '180px',
                                                                        height: '180px',
                                                                        borderRadius: '50%',
                                                                        objectFit: 'cover',
                                                                        border: '4px solid #dee2e6',
                                                                        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                                                                    }, onError: (e) => {
                                                                        e.target.style.display = 'none';
                                                                    } }), _jsx("button", { type: "button", className: "btn btn-sm btn-danger position-absolute", style: {
                                                                        top: '10px',
                                                                        right: '10px',
                                                                        borderRadius: '50%',
                                                                        width: '36px',
                                                                        height: '36px',
                                                                        padding: 0,
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    }, onClick: handleRemoveAvatar, title: "\u0E25\u0E1A\u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E", children: "\u00D7" })] }))] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "form-label fw-bold", children: "Social Media" }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label d-flex align-items-center", children: [_jsx(SiLine, { className: "me-2", style: { color: '#00C300' } }), "LINE"] }), _jsx("input", { type: "text", className: "form-control", placeholder: "LINE ID \u0E2B\u0E23\u0E37\u0E2D URL", value: formData.line, onChange: (e) => handleChange('line', e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label d-flex align-items-center", children: [_jsx(FaFacebook, { className: "me-2", style: { color: '#1877F2' } }), "Facebook"] }), _jsx("input", { type: "url", className: "form-control", placeholder: "https://facebook.com/yourprofile", value: formData.facebook, onChange: (e) => handleChange('facebook', e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label d-flex align-items-center", children: [_jsx(FaInstagram, { className: "me-2", style: { color: '#E4405F' } }), "Instagram"] }), _jsx("input", { type: "url", className: "form-control", placeholder: "https://instagram.com/yourprofile", value: formData.instagram, onChange: (e) => handleChange('instagram', e.target.value) })] })] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { type: "submit", className: "btn btn-primary", disabled: submitting, children: submitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: fetchProfile, disabled: submitting, children: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01" })] })] })] })] }) }), _jsx("div", { className: "col-lg-4", children: _jsxs("div", { className: "card shadow mb-4", children: [_jsx("div", { className: "card-header py-3", children: _jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Profile Information" }) }), _jsxs("div", { className: "card-body text-center", children: [profile?.avatarUrl ? (_jsx("img", { src: profile.avatarUrl, alt: "Profile", className: "rounded-circle mb-3", style: { width: '150px', height: '150px', objectFit: 'cover' }, onError: (e) => {
                                                e.target.src = 'https://via.placeholder.com/150';
                                            } })) : (_jsx("div", { className: "rounded-circle bg-primary d-flex align-items-center justify-content-center mx-auto mb-3", style: { width: '150px', height: '150px' }, children: _jsx(FaUser, { size: 60, className: "text-white" }) })), _jsx("h5", { className: "mb-1", children: profile?.email || user?.email }), _jsx("p", { className: "text-muted mb-3", children: profile?.role || user?.role || 'Guest' }), profile?.socials && Object.keys(profile.socials).length > 0 && (_jsxs("div", { className: "mt-4", children: [_jsx("h6", { className: "mb-3", children: "Social Media" }), _jsxs("div", { className: "d-flex justify-content-center gap-3", children: [profile.socials.line && (_jsx("a", { href: profile.socials.line.startsWith('http') ? profile.socials.line : `https://line.me/ti/p/${profile.socials.line}`, target: "_blank", rel: "noopener noreferrer", className: "text-decoration-none", children: _jsx(SiLine, { size: 24, style: { color: '#00C300' } }) })), profile.socials.facebook && (_jsx("a", { href: profile.socials.facebook, target: "_blank", rel: "noopener noreferrer", className: "text-decoration-none", children: _jsx(FaFacebook, { size: 24, style: { color: '#1877F2' } }) })), profile.socials.instagram && (_jsx("a", { href: profile.socials.instagram, target: "_blank", rel: "noopener noreferrer", className: "text-decoration-none", children: _jsx(FaInstagram, { size: 24, style: { color: '#E4405F' } }) }))] })] }))] })] }) })] })] }));
};
