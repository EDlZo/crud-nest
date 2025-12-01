import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaTachometerAlt, FaCog, FaFolder, FaChartArea, FaTable, FaUser, FaBuilding, FaUsers, FaSignOutAlt, FaChevronDown, FaChevronRight, FaCubes } from 'react-icons/fa';
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
        component: false,
        manage: false,
    });

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
        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
            window.removeEventListener('visibilityUpdated', handleVisibilityUpdate as EventListener);
        };
    }, [token]);

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
                component: false,
                manage: false,
                [section]: true,
            };
        });
    };

    return (
        <ul className="navbar-nav bg-gradient-primary sidebar sidebar-dark accordion d-flex flex-column" id="accordionSidebar" style={{ minHeight: '100vh' }}>
            {/* Sidebar - Brand */}
            <Link className="sidebar-brand d-flex align-items-center justify-content-center" to="/">
                <div className="sidebar-brand-icon rotate-n-15">
                    <PiAddressBookFill size={50} />
                </div>
            </Link>

            {/* Divider */}
            <hr className="sidebar-divider my-0" />



            {/* Divider */}
            <hr className="sidebar-divider" />

            {/* Heading */}
            <div className="sidebar-heading">
                Interface
            </div>

            {/* Component Section */}
            {(isPageVisible('dashboard') || isPageVisible('companies')) && (
                <li className="nav-item accordion-section">
                    <div className="accordion-card">
                        <a 
                            className="nav-link accordion-header collapsed" 
                            onClick={() => toggleSection('component')}
                            style={{ cursor: 'pointer' }}
                        >
                            <FaCubes className="me-2" />
                            <span>Component</span>
                            {expandedSections.component ? (
                                <FaChevronDown className="ms-auto" size={12} />
                            ) : (
                                <FaChevronRight className="ms-auto" size={12} />
                            )}
                        </a>
                        {expandedSections.component && (
                            <div className="accordion-content">
                                {isPageVisible('dashboard') && (
                                    <Link className={`accordion-item ${isActive('/contacts') ? 'active' : ''}`} to="/contacts">
                                        <FaTable className="me-2" />
                                        <span>Contacts</span>
                                    </Link>
                                )}
                                {isPageVisible('companies') && (
                                    <Link className={`accordion-item ${isActive('/companies') ? 'active' : ''}`} to="/companies">
                                        <FaBuilding className="me-2" />
                                        <span>Companies</span>
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </li>
            )}

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
                        {expandedSections.manage && (
                            <div className="accordion-content">
                                {isPageVisible('admin_users') && (
                                    <Link className={`accordion-item ${isActive('/admin/users') ? 'active' : ''}`} to="/admin/users">
                                        <FaUsers className="me-2" />
                                        <span>User</span>
                                    </Link>
                                )}
                                {isPageVisible('visibility') && (
                                    <Link className={`accordion-item ${isActive('/admin/visibility') ? 'active' : ''}`} to="/admin/visibility">
                                        <FaCog className="me-2" />
                                        <span>Visibility</span>
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </li>
            )}

            {/* Divider */}
            <hr className="sidebar-divider d-none d-md-block" />

            {/* Spacer to push User Profile to bottom */}
            <div style={{ flex: 1 }}></div>

            {/* Divider */}
            <hr className="sidebar-divider d-none d-md-block" />

            {/* User Profile & Logout - Moved to bottom */}
            <div className="sidebar-heading">
                User Profile
            </div>

            <li className="nav-item" style={{ position: 'relative' }}>
                <Dropdown show={showProfileDropdown} onToggle={setShowProfileDropdown} align="end">
                    <Dropdown.Toggle 
                        as="div" 
                        className="nav-link d-flex align-items-center justify-content-between cursor-pointer"
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="d-flex align-items-center">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Profile"
                                    className="rounded-circle me-2"
                                    style={{ width: 32, height: 32, objectFit: 'cover' }}
                                    onError={() => setAvatarUrl(null)}
                                />
                            ) : (
                                <div className="rounded-circle bg-white d-flex align-items-center justify-content-center me-2" style={{ width: 32, height: 32 }}>
                                    <FaUser className="text-primary" />
                                </div>
                            )}
                            <div className="d-flex flex-column">
                                <span className="text-white small font-weight-bold" title={user?.email}>
                                    {user?.email || 'Loading...'}
                                </span>
                                <span className="text-white-50 x-small" style={{ fontSize: '0.75rem' }}>
                                    {user?.role || 'Guest'}
                                </span>
                            </div>
                        </div>
                        <FaChevronDown className="text-white-50 ms-2" size={12} />
                    </Dropdown.Toggle>

                    <Dropdown.Menu className="shadow sidebar-dropdown-menu">
                        <Dropdown.Item onClick={handleProfile}>
                            <FaUser className="me-2 text-gray-400" />
                            Profile
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item onClick={handleLogout} className="text-danger">
                            <FaSignOutAlt className="me-2" />
                            Logout
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </li>

        </ul>
    );
};

export default Sidebar;
