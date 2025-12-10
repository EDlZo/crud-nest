import React from 'react';
import { FaUser } from 'react-icons/fa';
import { Dropdown } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Topbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    // ดึง avatar จริงจาก user (ถ้ามี) หรือใช้ Gravatar/email
    // สมมติ user.avatarUrl จะถูกเซ็ตหลัง login หรือ fetch profile
    const avatarUrl = user?.avatarUrl
        ? user.avatarUrl
        : user?.email
            ? `https://www.gravatar.com/avatar/${btoa(user.email.trim().toLowerCase())}?d=identicon`
            : undefined;
    // กำหนดสี pastel สำหรับ avatar เหมือนหน้า ContactsPage
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3d8', '#60a5fa', '#a78bfa', '#f472b6'];
    const colorIndex = (user?.email?.charCodeAt(0) || 0) % colors.length;
    const avatarColor = colors[colorIndex];
    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };
    const handleProfile = () => {
        navigate('/profile');
    };

    return (
        <div className="w-full flex items-center justify-between px-8 py-4 bg-white shadow-sm"
            style={{ minHeight: 64, position: 'sticky', top: 0, zIndex: 100 }}>
            <div className="font-bold text-lg flex items-center gap-2">

            </div>
            <div className="flex items-center gap-4">
                <Dropdown align="end">
                    <Dropdown.Toggle variant="link" id="userDropdown" className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-gray-100">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={user?.email} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: avatarColor }}
                            >
                                {user?.email?.charAt(0).toUpperCase() || <FaUser />}
                            </div>
                        )}
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="shadow animated--grow-in" style={{ minWidth: 180 }}>
                        <div className="px-3 py-2 text-right">
                            <div className="font-semibold">{user?.email || 'User'}</div>
                            <div className="text-xs text-gray-500 capitalize">{user?.role || 'User'}</div>
                        </div>
                        <Dropdown.Item onClick={handleProfile} className="d-flex justify-content-center align-items-center">
                            <FaUser className="me-2 text-gray-400" /> Profile
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item onClick={handleLogout} className="d-flex justify-content-center">
                            <span className="text-danger">Logout</span>
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </div>
        </div>
    );
};

export default Topbar;
