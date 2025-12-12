import React, { useEffect } from 'react';
import { FaUser, FaSignOutAlt } from 'react-icons/fa';
import { Dropdown } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAvatarColor } from '../utils/avatarColor';

const Topbar = () => {
    const { user, logout, setUser } = useAuth();
    const navigate = useNavigate();
    // Use uploaded avatar when present; prefer initials when there's no uploaded avatar.
    // Do NOT fall back to Gravatar/identicon — user expects a letter initial instead.
    const avatarUrl = (user as any)?.avatarUrl ? (user as any).avatarUrl : undefined;
    // กำหนดสี pastel สำหรับ avatar (shared util)
    const avatarColor = getAvatarColor((user as any)?.firstName || user?.email || '');
        // Compute a display name fallback: prefer displayName or stored first/last name, otherwise use email prefix
        const displayName = (user?.displayName && user.displayName.trim())
            || ((user as any)?.firstName || (user as any)?.lastName ? `${(user as any)?.firstName || ''} ${(user as any)?.lastName || ''}`.trim() : '')
            || (user?.email ? user.email.split('@')[0] : 'User');
        // Show only first name (either stored firstName, or first token of displayName)
        const firstNameToShow = (user as any)?.firstName ? (user as any).firstName : (displayName ? displayName.split(' ')[0] : 'User');
    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };
    const handleProfile = () => {
        navigate('/profile');
    };

    useEffect(() => {
        // Listen for profile updates dispatched elsewhere (e.g., ProfilePage)
        const onProfileUpdated = (e: Event) => {
            try {
                const detail = (e as CustomEvent).detail;
                console.debug('Topbar received profileUpdated event:', detail);
                if (detail && setUser) {
                    setUser((prev) => ({ ...(prev || {}), ...(detail || {}) } as any));
                }
            } catch (err) {
                console.error('Error handling profileUpdated in Topbar:', err);
            }
        };
        window.addEventListener('profileUpdated', onProfileUpdated as EventListener);
        return () => window.removeEventListener('profileUpdated', onProfileUpdated as EventListener);
    }, [setUser]);

    return (
        <div className="w-full flex items-center justify-between px-8 py-4 bg-white shadow-sm"
            style={{ minHeight: 64, position: 'sticky', top: 0, zIndex: 100 }}>
            <div className="font-bold text-lg flex items-center gap-2">

            </div>
            <div className="flex items-center gap-4">
                <Dropdown align="end">
                    <Dropdown.Toggle
                        id="userDropdown"
                        className="flex items-center gap-3 p-0 text-decoration-none bg-transparent border-0 focus:outline-none focus:ring-0 hover:bg-transparent active:bg-transparent"
                        style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}
                    >
                            {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt={firstNameToShow}
                                            className="w-8 h-8 rounded-full object-cover"
                                            style={{ border: '2px solid #fff', boxShadow: '0 6px 14px rgba(15,23,42,0.08)' }}
                                        />
                                    ) : (
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                                            style={{ backgroundColor: avatarColor, border: '2px solid #fff', boxShadow: '0 6px 14px rgba(15,23,42,0.08)' }}
                                        >
                                            {firstNameToShow?.charAt(0).toUpperCase() || <FaUser />}
                                        </div>
                                    )}
                            <div className="flex flex-col text-left">
                                <span className="font-semibold text-sm text-gray-800">{firstNameToShow || 'User'}</span>
                                <span className="text-xs text-gray-500">{user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Guest'}</span>
                            </div>
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="shadow rounded-lg p-2" style={{ minWidth: 200 }}>
                        <Dropdown.Item onClick={handleProfile} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50">
                            <FaUser className="text-gray-600" />
                            <span className="text-sm">Profile</span>
                        </Dropdown.Item>
                        <Dropdown.Item onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50">
                            <FaSignOutAlt className="text-red-500" />
                            <span className="text-sm text-red-600">Logout</span>
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </div>
        </div>
    );
};

export default Topbar;
