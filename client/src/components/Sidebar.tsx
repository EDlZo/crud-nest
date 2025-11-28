import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaLaughWink, FaTachometerAlt, FaCog, FaFolder, FaChartArea, FaTable, FaUser, FaBuilding, FaUsers } from 'react-icons/fa';

const Sidebar = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    return (
        <ul className="navbar-nav bg-gradient-primary sidebar sidebar-dark accordion" id="accordionSidebar">
            {/* Sidebar - Brand */}
            <Link className="sidebar-brand d-flex align-items-center justify-content-center" to="/">
                <div className="sidebar-brand-icon rotate-n-15">
                    <FaLaughWink size={32} />
                </div>
                <div className="sidebar-brand-text mx-3">SB Admin <sup>2</sup></div>
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

        </ul>
    );
};

export default Sidebar;
