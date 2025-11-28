import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaLaughWink, FaTachometerAlt, FaCog, FaFolder, FaChartArea, FaTable, FaUser, FaBuilding, FaUsers, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const isActive = (path: string) => location.pathname === path;

    return (
        <ul className="navbar-nav bg-gradient-primary sidebar sidebar-dark accordion" id="accordionSidebar">
            {/* Sidebar - Brand */}
            <Link className="sidebar-brand d-flex align-items-center justify-content-center" to="/">
                <div className="sidebar-brand-icon rotate-n-15">
                    <FaLaughWink size={32} />
                </div>
            </Link>

            {/* Divider */}
            <hr className="sidebar-divider my-0" />

            {/* Nav Item - Dashboard */}
            <li className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                <Link className="nav-link" to="/">
                    <FaTachometerAlt className="me-2" />
                    <span>Dashboard</span>
                </Link>
            </li>

            {/* Divider */}
            <hr className="sidebar-divider" />

            {/* Heading */}
            <div className="sidebar-heading">
                Interface
            </div>

            {/* Nav Item - Contacts */}
            <li className={`nav-item ${isActive('/contacts') ? 'active' : ''}`}>
                <Link className="nav-link" to="/contacts">
                    <FaTable className="me-2" />
                    <span>Contacts</span>
                </Link>
            </li>

            {/* Nav Item - Companies */}
            <li className={`nav-item ${isActive('/admin/companies') ? 'active' : ''}`}>
                <Link className="nav-link" to="/admin/companies">
                    <FaBuilding className="me-2" />
                    <span>Companies</span>
                </Link>
            </li>

            {/* Nav Item - Users */}
            <li className={`nav-item ${isActive('/admin/users') ? 'active' : ''}`}>
                <Link className="nav-link" to="/admin/users">
                    <FaUsers className="me-2" />
                    <span>Users</span>
                </Link>
            </li>

            {/* Nav Item - Visibility */}
            <li className={`nav-item ${isActive('/admin/visibility') ? 'active' : ''}`}>
                <Link className="nav-link" to="/admin/visibility">
                    <FaCog className="me-2" />
                    <span>Visibility</span>
                </Link>
            </li>

            {/* Divider */}
            <hr className="sidebar-divider d-none d-md-block" />

            {/* Divider */}
            <hr className="sidebar-divider d-none d-md-block" />

            {/* User Profile & Logout */}
            <div className="sidebar-heading">
                User Profile
            </div>

            <li className="nav-item">
                <div className="nav-link d-flex flex-column align-items-start">
                    <div className="d-flex align-items-center mb-2">
                        <div className="rounded-circle bg-white d-flex align-items-center justify-content-center me-2" style={{ width: 32, height: 32 }}>
                            <FaUser className="text-primary" />
                        </div>
                        <div className="d-flex flex-column">
                            <span className="text-white small font-weight-bold" title={user?.email}>{user?.email || 'Loading...'}</span>
                            <span className="text-white-50 x-small" style={{ fontSize: '0.75rem' }}>{user?.role || 'Guest'}</span>
                        </div>
                    </div>
                    <button
                        className="btn btn-danger btn-sm w-100 d-flex align-items-center justify-content-center"
                        onClick={(e) => {
                            e.preventDefault();
                            logout();
                            window.location.href = '/login';
                        }}
                    >
                        <FaSignOutAlt className="me-2" />
                        Logout
                    </button>
                </div>
            </li>

        </ul>
    );
};

export default Sidebar;
