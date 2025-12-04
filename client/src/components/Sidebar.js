import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaTachometerAlt, FaCog, FaTable, FaUser, FaBuilding, FaUsers, FaSignOutAlt, FaChevronDown, FaChevronRight, FaTasks } from 'react-icons/fa';
import { PiAddressBookFill } from 'react-icons/pi';
import { Dropdown } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, token } = useAuth();
    const isActive = (path) => location.pathname === path;
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [visibility, setVisibility] = useState(null);
    const [expandedSections, setExpandedSections] = useState({
        manage: false,
    });
    useEffect(() => {
        if (token && user) {
            fetchProfileAvatar();
            fetchVisibility();
        }
    }, [token, user]);
    const fetchVisibility = async () => {
        if (!token)
            return;
        try {
            const response = await fetch(`${API_BASE_URL}/auth/visibility`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setVisibility(data || {});
            }
        }
        catch (err) {
            // Silently fail - visibility is optional
            console.error('Failed to fetch visibility:', err);
        }
    };
    // Check if a page is visible for the current user's role
    const isPageVisible = (pageKey) => {
        // If no visibility data yet, hide menu items until data is loaded
        if (!visibility) {
            return false;
        }
        // Use 'guest' as default role if user.role is undefined/null
        const role = (user?.role || 'guest').toLowerCase();
        // Return true only if explicitly set to true in visibility settings
        return Boolean(visibility[role]?.[pageKey]);
    };
    useEffect(() => {
        const handleProfileUpdate = (event) => {
            if (event.detail?.avatarUrl) {
                setAvatarUrl(event.detail.avatarUrl);
            }
            else {
                setAvatarUrl(null);
            }
        };
        const handleVisibilityUpdate = () => {
            if (token) {
                fetchVisibility();
            }
        };
        window.addEventListener('profileUpdated', handleProfileUpdate);
        window.addEventListener('visibilityUpdated', handleVisibilityUpdate);
        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdate);
            window.removeEventListener('visibilityUpdated', handleVisibilityUpdate);
        };
    }, [token]);
    // Collapse manage accordion when navigating to non-admin routes.
    // Keep it open if user navigates within /admin/* so submenu stays visible.
    useEffect(() => {
        if (!expandedSections.manage)
            return;
        const isAdminRoute = location.pathname.startsWith('/admin');
        if (!isAdminRoute) {
            setExpandedSections(prev => ({ ...prev, manage: false }));
        }
    }, [location.pathname]);
    const fetchProfileAvatar = async () => {
        if (!token)
            return;
        try {
            const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                if (data.avatarUrl) {
                    setAvatarUrl(data.avatarUrl);
                }
            }
        }
        catch (err) {
            // Silently fail - avatar is optional
        }
    };
    const handleProfile = () => {
        setShowProfileDropdown(false);
        navigate('/profile');
    };
    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };
    const toggleSection = (section) => {
        setExpandedSections(prev => {
            // If the section is already expanded, close it
            if (prev[section]) {
                return {
                    ...prev,
                    [section]: false,
                };
            }
            // Otherwise, close all sections and open only the selected one
            return {
                manage: false,
                [section]: true,
            };
        });
    };
    return (_jsxs("ul", { className: "navbar-nav bg-gradient-primary sidebar sidebar-dark accordion d-flex flex-column", id: "accordionSidebar", style: { minHeight: '100vh' }, children: [_jsx(Link, { className: "sidebar-brand d-flex align-items-center justify-content-center", to: "/", children: _jsx("div", { className: "sidebar-brand-icon rotate-n-15", children: _jsx(PiAddressBookFill, { size: 50 }) }) }), _jsx("hr", { className: "sidebar-divider my-0" }), _jsx("hr", { className: "sidebar-divider" }), _jsx("div", { className: "sidebar-heading", children: "Interface" }), isPageVisible('dashboard') && (_jsx("li", { className: "nav-item accordion-section", children: _jsx("div", { className: "accordion-card", children: _jsxs(Link, { className: `nav-link accordion-header ${isActive('/dashboard') ? 'active' : ''}`, to: "/dashboard", children: [_jsx(FaTachometerAlt, { className: "me-2" }), _jsx("span", { children: "Dashboard" })] }) }) })), _jsx("hr", { className: "sidebar-divider" }), _jsx("div", { className: "sidebar-heading", children: "CRM" }), isPageVisible('dashboard') && (_jsx("li", { className: "nav-item accordion-section", children: _jsx("div", { className: "accordion-card", children: _jsxs(Link, { className: `nav-link accordion-header ${isActive('/contacts') ? 'active' : ''}`, to: "/contacts", children: [_jsx(FaTable, { className: "me-2" }), _jsx("span", { children: "Contacts" })] }) }) })), isPageVisible('companies') && (_jsx("li", { className: "nav-item accordion-section", children: _jsx("div", { className: "accordion-card", children: _jsxs(Link, { className: `nav-link accordion-header ${isActive('/companies') ? 'active' : ''}`, to: "/companies", children: [_jsx(FaBuilding, { className: "me-2" }), _jsx("span", { children: "Com" })] }) }) })), isPageVisible('activities') && (_jsx("li", { className: "nav-item accordion-section", children: _jsx("div", { className: "accordion-card", children: _jsxs(Link, { className: `nav-link accordion-header ${isActive('/activities') ? 'active' : ''}`, to: "/activities", children: [_jsx(FaTasks, { className: "me-2" }), _jsx("span", { children: "Activities & Tasks" })] }) }) })), (isPageVisible('admin_users') || isPageVisible('visibility')) && (_jsx("li", { className: "nav-item accordion-section", children: _jsxs("div", { className: "accordion-card", children: [_jsxs("a", { className: "nav-link accordion-header collapsed", onClick: () => toggleSection('manage'), style: { cursor: 'pointer' }, children: [_jsx(FaCog, { className: "me-2" }), _jsx("span", { children: "Manage" }), expandedSections.manage ? (_jsx(FaChevronDown, { className: "ms-auto", size: 12 })) : (_jsx(FaChevronRight, { className: "ms-auto", size: 12 }))] }), _jsxs("div", { className: "accordion-content", style: {
                                maxHeight: expandedSections.manage ? '500px' : '0',
                                opacity: expandedSections.manage ? 1 : 0,
                                transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                                overflow: 'hidden'
                            }, children: [isPageVisible('admin_users') && (_jsxs(Link, { className: `accordion-item ${isActive('/admin/users') ? 'active' : ''}`, to: "/admin/users", children: [_jsx(FaUsers, { className: "me-2" }), _jsx("span", { children: "User" })] })), isPageVisible('visibility') && (_jsxs(Link, { className: `accordion-item ${isActive('/admin/visibility') ? 'active' : ''}`, to: "/admin/visibility", children: [_jsx(FaCog, { className: "me-2" }), _jsx("span", { children: "Visibility" })] }))] })] }) })), _jsx("hr", { className: "sidebar-divider d-none d-md-block" }), _jsx("div", { style: { flex: 1 } }), _jsx("hr", { className: "sidebar-divider d-none d-md-block" }), _jsx("div", { className: "sidebar-heading", children: "User Profile" }), _jsx("li", { className: "nav-item sidebar-profile", style: { position: 'sticky', bottom: 0, zIndex: 20 }, children: _jsxs(Dropdown, { show: showProfileDropdown, onToggle: setShowProfileDropdown, align: "end", children: [_jsxs(Dropdown.Toggle, { as: "div", className: "nav-link d-flex align-items-center justify-content-between cursor-pointer", style: { cursor: 'pointer' }, children: [_jsxs("div", { className: "d-flex align-items-center", children: [avatarUrl ? (_jsx("img", { src: avatarUrl, alt: "Profile", className: "rounded-circle me-2", style: { width: 32, height: 32, objectFit: 'cover' }, onError: () => setAvatarUrl(null) })) : (_jsx("div", { className: "rounded-circle bg-white d-flex align-items-center justify-content-center me-2", style: { width: 32, height: 32 }, children: _jsx(FaUser, { className: "text-primary" }) })), _jsxs("div", { className: "d-flex flex-column", children: [_jsx("span", { className: "text-white small font-weight-bold", title: user?.email, children: user?.email || 'Loading...' }), _jsx("span", { className: "text-white-50 x-small", style: { fontSize: '0.75rem' }, children: user?.role || 'Guest' })] })] }), _jsx(FaChevronDown, { className: "text-white-50 ms-2", size: 12 })] }), _jsxs(Dropdown.Menu, { className: "shadow sidebar-dropdown-menu", children: [_jsxs(Dropdown.Item, { onClick: handleProfile, children: [_jsx(FaUser, { className: "me-2 text-gray-400" }), "Profile"] }), _jsx(Dropdown.Divider, {}), _jsxs(Dropdown.Item, { onClick: handleLogout, className: "text-danger", children: [_jsx(FaSignOutAlt, { className: "me-2" }), "Logout"] })] })] }) })] }));
};
export default Sidebar;
