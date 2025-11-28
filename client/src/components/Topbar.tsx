import React from 'react';
import { FaBars, FaSearch, FaBell, FaEnvelope, FaUserCircle, FaCog } from 'react-icons/fa';
import { Dropdown } from 'react-bootstrap';

const Topbar = () => {
    const handleLogout = () => {
        localStorage.removeItem('crud-token');
        window.location.href = '/login';
    };

    return (
        <nav className="navbar navbar-expand navbar-light bg-white topbar mb-4 static-top shadow">
            {/* Sidebar Toggle (Topbar) */}
            <button id="sidebarToggleTop" className="btn btn-link d-md-none rounded-circle mr-3">
                <FaBars />
            </button>

            {/* Topbar Search */}
            <form className="d-none d-sm-inline-block form-inline mr-auto ml-md-3 my-2 my-md-0 mw-100 navbar-search">
                <div className="input-group">
                    <div className="input-group-append">
                        <button className="btn btn-primary" type="button">
                            <FaSearch />
                        </button>
                    </div>
                </div>
            </form>

            {/* Topbar Navbar */}
            <ul className="navbar-nav ml-auto">
                {/* Nav Item - User Information */}
                <li className="nav-item dropdown no-arrow">
                    <Dropdown align="end">
                        <Dropdown.Toggle variant="link" id="userDropdown" className="nav-link dropdown-toggle">
                            <span className="mr-2 d-none d-lg-inline text-gray-600 small">User</span>
                            <FaUserCircle size={28} />
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="shadow animated--grow-in">
                            <Dropdown.Item href="#">
                                <FaUserCircle className="mr-2 text-gray-400" />
                                Profile
                            </Dropdown.Item>
                            <Dropdown.Item href="#">
                                <FaCog className="mr-2 text-gray-400" />
                                Settings
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item onClick={handleLogout}>
                                <span className="text-danger">Logout</span>
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </li>
            </ul>
        </nav>
    );
};

export default Topbar;
