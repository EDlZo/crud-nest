import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaTachometerAlt, FaCog, FaFolder, FaChartArea, FaTable, FaUser, FaBuilding, FaUsers, FaSignOutAlt, FaChevronDown, FaChevronRight, FaCubes, FaTasks, FaEllipsisV, FaBell } from 'react-icons/fa';
import { PiAddressBookFill } from 'react-icons/pi';
import { Dropdown } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

type VisibilityMap = Record<string, Record<string, boolean>>;

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, token } = useAuth();
    const isActive = (path: string) => location.pathname === path;
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<VisibilityMap | null>(null);
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
        manage: false,
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMini, setIsMini] = useState(false);

    useEffect(() => {
        if (token && user) {
            fetchProfileAvatar();
            fetchVisibility();
        }
    }, [token, user]);

    const fetchVisibility = async () => {
        if (!token) return;
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
        } catch (err) {
            // Silently fail - visibility is optional
            console.error('Failed to fetch visibility:', err);
        }
    };

    // Check if a page is visible for the current user's role
    const isPageVisible = (pageKey: string): boolean => {
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
        const handleProfileUpdate = (event: CustomEvent) => {
            if (event.detail?.avatarUrl) {
                setAvatarUrl(event.detail.avatarUrl);
            } else {
                setAvatarUrl(null);
            }
        };

        const handleVisibilityUpdate = () => {
            if (token) {
                fetchVisibility();
            }
        };

        window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
        window.addEventListener('visibilityUpdated', handleVisibilityUpdate as EventListener);
        // close sidebar on navigation for small screens
        const handleRouteChange = () => setMobileOpen(false);
        window.addEventListener('hashchange', handleRouteChange);

        // set mini mode based on window width (medium screens)
        const checkMini = () => setIsMini(window.innerWidth <= 1200 && window.innerWidth > 992);
        checkMini();
        window.addEventListener('resize', checkMini);
        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
            window.removeEventListener('visibilityUpdated', handleVisibilityUpdate as EventListener);
            window.removeEventListener('hashchange', handleRouteChange);
            window.removeEventListener('resize', checkMini);
        };
    }, [token]);

    // Collapse manage accordion when navigating to non-admin routes.
    // Keep it open if user navigates within /admin/* so submenu stays visible.
    useEffect(() => {
        if (!expandedSections.manage) return;
        const isAdminRoute = location.pathname.startsWith('/admin');
        if (!isAdminRoute) {
            setExpandedSections(prev => ({ ...prev, manage: false }));
        }
    }, [location.pathname]);

    const fetchProfileAvatar = async () => {
        if (!token) return;
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
        } catch (err) {
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

    const toggleSection = (section: string) => {
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

    return (
        <>
        {/* Mobile hamburger - only visible on small screens via CSS */}
        <button className="mobile-sidebar-toggle" aria-label="Toggle sidebar" onClick={() => setMobileOpen(v => !v)}>
            <span className="hamburger" />
        </button>

        <div className={`sidebar-backdrop ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />

                <ul className={`navbar-nav bg-gradient-primary sidebar sidebar-dark accordion d-flex flex-column ${mobileOpen ? 'open-mobile' : ''} ${isMini ? 'mini' : ''}`} id="accordionSidebar" style={{ minHeight: '100vh' }}>
            {/* Sidebar - Brand */}
            <Link className="sidebar-brand d-flex align-items-center justify-content-center" to="/" onClick={() => setMobileOpen(false)}>
                <div className="sidebar-brand-icon rotate-n-15">
                    <PiAddressBookFill size={50} />
                </div>
            </Link>
                        {/* mini toggle removed per request */}

            {/* Divider */}
            <hr className="sidebar-divider my-0" />



            {/* Divider */}
            <hr className="sidebar-divider" />

            {/* Heading */}
            

            {/* Dashboard */}
            {isPageVisible('dashboard') && (
                <li className="nav-item accordion-section">
                    <div className="accordion-card">
                        <Link
                            className={`nav-link accordion-header ${isActive('/dashboard') ? 'active' : ''}`}
                            to="/dashboard"
                            onClick={() => setMobileOpen(false)}
                        >
                            <FaTachometerAlt className="me-2" />
                            <span>Dashboard</span>
                        </Link>
                    </div>
                </li>
            )}

            {/* Divider */}
            <hr className="sidebar-divider" />

            {/* Heading */}
            <div className="sidebar-heading">
                PAGE
            </div>

            {/* Contacts */}
            {isPageVisible('contacts') && (
                <li className="nav-item accordion-section">
                    <div className="accordion-card">
                        <Link
                            className={`nav-link accordion-header ${isActive('/contacts') ? 'active' : ''}`}
                            to="/contacts"
                            onClick={() => setMobileOpen(false)}
                        >
                            <FaTable className="me-2" />
                            <span>Contacts</span>
                        </Link>
                    </div>
                </li>
            )}

            {/* Companies */}
            {isPageVisible('companies') && (
                <li className="nav-item accordion-section">
                    <div className="accordion-card">
                        <Link
                            className={`nav-link accordion-header ${isActive('/companies') ? 'active' : ''}`}
                            to="/companies"
                            onClick={() => setMobileOpen(false)}
                        >
                            <FaBuilding className="me-2" />
                            <span>Companies</span>
                        </Link>
                    </div>
                </li>
            )}

            {/* Activities */}
            {isPageVisible('activities') && (
                <li className="nav-item accordion-section">
                    <div className="accordion-card">
                        <Link
                            className={`nav-link accordion-header ${isActive('/activities') ? 'active' : ''}`}
                            to="/activities"
                            onClick={() => setMobileOpen(false)}
                        >
                            <FaTasks className="me-2" />
                            <span>Activities & Tasks</span>
                        </Link>
                    </div>
                </li>
            )}

            {/* Deals - Hidden temporarily */}
            {/* {isPageVisible('deals') && (
                <li className="nav-item accordion-section">
                    <div className="accordion-card">
                        <Link 
                            className={`nav-link accordion-header ${isActive('/deals') ? 'active' : ''}`} 
                            to="/deals"
                        >
                            <FaDollarSign className="me-2" />
                            <span>Deals Pipeline</span>
                        </Link>
                    </div>
                </li>
            )} */}

            {/* Manage Section */}
            {(isPageVisible('admin_users') || isPageVisible('visibility')) && (
                <li className="nav-item accordion-section">
                    <div className="accordion-card">
                        <a
                            className="nav-link accordion-header collapsed"
                            onClick={() => toggleSection('manage')}
                            style={{ cursor: 'pointer' }}
                        >
                            <FaCog className="me-2" />
                            <span>Manage</span>
                            {expandedSections.manage ? (
                                <FaChevronDown className="ms-auto" size={12} />
                            ) : (
                                <FaChevronRight className="ms-auto" size={12} />
                            )}
                        </a>
                        <div
                            className="accordion-content"
                            style={{
                                maxHeight: expandedSections.manage ? '500px' : '0',
                                opacity: expandedSections.manage ? 1 : 0,
                                transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                                overflow: 'hidden'
                            }}
                        >
                            {isPageVisible('admin_users') && (
                                <Link className={`accordion-item ${isActive('/admin/users') ? 'active' : ''}`} to="/admin/users" onClick={() => setMobileOpen(false)}>
                                    <FaUsers className="me-2" />
                                    <span>User</span>
                                </Link>
                            )}
                            {isPageVisible('visibility') && (
                                <Link className={`accordion-item ${isActive('/admin/visibility') ? 'active' : ''}`} to="/admin/visibility" onClick={() => setMobileOpen(false)}>
                                    <FaCog className="me-2" />
                                    <span>Visibility</span>
                                </Link>
                            )}
                            {(isPageVisible('admin_users') || isPageVisible('visibility')) && (
                                <Link className={`accordion-item ${isActive('/admin/notifications') ? 'active' : ''}`} to="/admin/notifications" onClick={() => setMobileOpen(false)}>
                                    <FaBell className="me-2" />
                                    <span>Notifications</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </li>
            )}

            {/* Divider */}
            <hr className="sidebar-divider d-none d-md-block" />

            {/* Spacer to push User Profile to bottom */}
            <div style={{ flex: 1 }}></div>



        </ul>
        </>
    );
};

export default Sidebar;
