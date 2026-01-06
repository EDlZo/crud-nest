import React, { useEffect, useState } from 'react';
import { FaUser, FaSignOutAlt, FaBell } from 'react-icons/fa';
import { Dropdown } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import { getAvatarColor } from '../utils/avatarColor';

// Helper: parse a notification's timestamp-like fields into a Date (or null)
const parseNotificationDate = (n: any): Date | null => {
    try {
        if (!n) return null;
        const cand = n.createdAt || n.created_at || n.timestamp || n.date || (n.raw && (n.raw.createdAt || n.raw.created_at || n.raw.timestamp || n.raw.date)) || null;
        if (!cand) return null;
        if (typeof cand === 'number') return new Date(cand);
        const s = String(cand).trim();
        const iso = Date.parse(s);
        if (!Number.isNaN(iso)) return new Date(iso);
        const timeOnly = /^\d{1,2}:\d{2}(:\d{2})?$/.test(s);
        if (timeOnly) {
            const today = new Date();
            const [hh, mm, ss] = s.split(':');
            return new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(hh), Number(mm || '0'), Number(ss || '0'));
        }
        return null;
    } catch (err) {
        return null;
    }
};

const formatNotificationDate = (n: any) => {
    try {
        const d = parseNotificationDate(n);
        if (!d) return '';
        const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'th-TH';
        return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
    } catch (err) { return ''; }
};

const Topbar = () => {
    const { user, logout, setUser, token } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const unreadCount = notifications.filter(n => !n.read).length;
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

    const sortNotificationsDesc = (arr: any[]) => {
        const parseTs = (n: any) => {
            try {
                if (!n) return 0;
                const cand = n.createdAt || n.created_at || n.timestamp || n.date || n.time || n.at || null;
                if (!cand) return 0;
                // numeric timestamp
                if (typeof cand === 'number') return cand;
                const s = String(cand).trim();
                // ISO or full date parse
                const iso = Date.parse(s);
                if (!Number.isNaN(iso)) return iso;
                // time-only like HH:mm or HH:mm:ss -> assume today
                const timeOnly = /^\d{1,2}:\d{2}(:\d{2})?$/.test(s);
                if (timeOnly) {
                    const today = new Date();
                    const [hh, mm, ss] = s.split(':');
                    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(hh), Number(mm || '0'), Number(ss || '0'));
                    return d.getTime();
                }
                return 0;
            } catch (err) { return 0; }
        };

        try {
            return (arr || []).slice().sort((a: any, b: any) => {
                const aTs = parseTs(a);
                const bTs = parseTs(b);
                return bTs - aTs;
            });
        } catch (err) {
            return arr || [];
        }
    };

    useEffect(() => {
        // fetch notifications for current user when token available
        const fetchNotifications = async () => {
            // Always load local persisted notifications first so they show after reload
            try {
                const localRaw = localStorage.getItem('local_notifications');
                const localNotifs: any[] = localRaw ? JSON.parse(localRaw) : [];
                if (localNotifs && localNotifs.length) setNotifications(sortNotificationsDesc(localNotifs));
            } catch (err) {
                console.warn('Failed to load local notifications', err);
            }

            // If logged in, fetch server notifications and merge with local ones
                if (!token) return;
            try {
                const res = await fetch(`${API_BASE_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
                                if (res.ok) {
                                        const data = await res.json();
                                        const localRaw = localStorage.getItem('local_notifications');
                                        let localNotifs: any[] = [];
                                        try { localNotifs = localRaw ? JSON.parse(localRaw) : []; } catch (err) { localNotifs = []; }
                                        const merged = [...localNotifs, ...(Array.isArray(data) ? data : [])];
                                        // dedupe by id, prefer server items when ids clash
                                        const seen = new Set();
                                        const deduped: any[] = [];
                                        for (const n of merged) {
                                            if (!n || !n.id) continue;
                                            if (seen.has(n.id)) continue;
                                            seen.add(n.id);
                                            deduped.push(n);
                                        }
                                        setNotifications(sortNotificationsDesc(deduped));
                                }
            } catch (err) {
                console.error('Failed to load notifications', err);
            }
        };
        fetchNotifications();

        // Listen for profile updates dispatched elsewhere (e.g., ProfilePage)
        const onProfileUpdated = (e: Event) => {
            try {
                const detail = (e as CustomEvent).detail;
                console.debug('Topbar received profileUpdated event:', detail);
                if (detail && setUser) {
                    setUser({ ...(user || {}), ...(detail || {}) });
                }
            } catch (err) {
                console.error('Error handling profileUpdated in Topbar:', err);
            }
        };
        window.addEventListener('profileUpdated', onProfileUpdated as EventListener);
        return () => window.removeEventListener('profileUpdated', onProfileUpdated as EventListener);
    }, [setUser]);

    // Polling + event listener for notifications
    useEffect(() => {
        let mounted = true;
        let timer: any = null;

        const fetchNotifications = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    if (!mounted) return;
                    // Merge server notifications with locally persisted ones instead of overwriting.
                    // This prevents local `localNotification` items from disappearing when server returns an empty list.
                    try {
                        const localRaw = localStorage.getItem('local_notifications');
                        const localNotifs: any[] = localRaw ? JSON.parse(localRaw) : [];
                        const serverNotifs: any[] = Array.isArray(data) ? data : [];
                        // Build merged list: prefer server items for matching ids, keep local-only items as well.
                        const merged: any[] = [...serverNotifs];
                        for (const ln of localNotifs) {
                            if (!ln || !ln.id) continue;
                            if (!merged.find(s => s && s.id === ln.id)) merged.unshift(ln);
                        }
                        // dedupe and sort newest-first
                        const seen = new Set();
                        const deduped: any[] = [];
                        for (const n of merged) {
                            if (!n || !n.id) continue;
                            if (seen.has(n.id)) continue;
                            seen.add(n.id);
                            deduped.push(n);
                        }
                        setNotifications(sortNotificationsDesc(deduped));
                    } catch (err) {
                        // fallback to server-only list
                        setNotifications(sortNotificationsDesc(Array.isArray(data) ? data : []));
                    }
                }
            } catch (err) {
                console.error('Failed to load notifications', err);
            }
        };

        const start = () => {
            // initial fetch
            fetchNotifications();
            // poll every 20 seconds
            timer = setInterval(fetchNotifications, 20000);
        };

        const onNotificationCreated = () => {
            // immediate refresh when other parts of the app dispatch this event
            fetchNotifications();
        };

        const onLocalNotification = (e: Event) => {
            try {
                const detail = (e as CustomEvent).detail;
                console.debug('Topbar received localNotification', detail);
                if (detail) {
                    // persist to local storage history
                    try {
                        const key = 'local_notifications';
                        const raw = localStorage.getItem(key);
                        const arr = raw ? JSON.parse(raw) : [];
                        // avoid duplicates
                        if (!arr.find((x: any) => x.id === detail.id)) arr.unshift(detail);
                        try { localStorage.setItem(key, JSON.stringify(sortNotificationsDesc(arr))); } catch (err) { /* ignore */ }
                    } catch (err) { /* ignore persistence errors */ }

                    setNotifications(prev => {
                        const next = prev && Array.isArray(prev) ? ([detail, ...prev]) : [detail];
                        // dedupe just in case
                        const seen = new Set();
                        const dedup: any[] = [];
                        for (const n of next) {
                            if (!n || !n.id) continue;
                            if (seen.has(n.id)) continue;
                            seen.add(n.id);
                            dedup.push(n);
                        }
                        return sortNotificationsDesc(dedup);
                    });

                    // Show a desktop notification as a fallback so users notice immediately
                    try {
                        if ('Notification' in window) {
                            // @ts-ignore
                            if (Notification.permission === 'granted') {
                                // @ts-ignore
                                new Notification(detail.title || 'Notification', { body: detail.body || '' });
                            } else if (Notification.permission !== 'denied') {
                                // request permission then show
                                // @ts-ignore
                                Notification.requestPermission().then(p => {
                                    if (p === 'granted') {
                                        // @ts-ignore
                                        new Notification(detail.title || 'Notification', { body: detail.body || '' });
                                    }
                                }).catch(() => {});
                            }
                        }
                    } catch (err) {
                        console.warn('Desktop notification failed', err);
                    }
                }
            } catch (err) {
                console.error('Failed to handle localNotification', err);
            }
        };
        if (token) start();
        window.addEventListener('notificationCreated', onNotificationCreated as EventListener);
        window.addEventListener('localNotification', onLocalNotification as EventListener);

        const onNotificationsCleared = (e: Event) => {
            try {
                const detail = (e as CustomEvent).detail || {};
                const ids: string[] = Array.isArray(detail.ids) ? detail.ids : (detail.ids ? [detail.ids] : []);
                // If no ids provided, assume all cleared and wipe notifications
                if (!ids || ids.length === 0) {
                    try { localStorage.removeItem('local_notifications'); } catch (err) { /* ignore */ }
                    setNotifications([]);
                    return;
                }

                // Remove cleared ids from local storage and in-memory state
                try {
                    const key = 'local_notifications';
                    const raw = localStorage.getItem(key);
                    const arr = raw ? JSON.parse(raw) : [];
                    const next = (arr || []).filter((n: any) => !ids.includes(n.id));
                    try { localStorage.setItem(key, JSON.stringify(sortNotificationsDesc(next))); } catch (err) { /* ignore */ }
                } catch (err) { /* ignore */ }

                setNotifications((prev) => (prev || []).filter(n => !ids.includes(n.id)));
            } catch (err) {
                console.error('Failed to handle notificationsCleared in Topbar', err);
            }
        };
        window.addEventListener('notificationsCleared', onNotificationsCleared as EventListener);

        return () => {
            mounted = false;
            if (timer) clearInterval(timer);
            window.removeEventListener('notificationCreated', onNotificationCreated as EventListener);
            window.removeEventListener('localNotification', onLocalNotification as EventListener);
            window.removeEventListener('notificationsCleared', onNotificationsCleared as EventListener);
        };
    }, [token]);

    const markRead = async (id: string) => {
        try {
            // local-only notifications: update local storage and UI
            if (String(id).startsWith('local-')) {
                try {
                    const key = 'local_notifications';
                    const raw = localStorage.getItem(key);
                    const arr = raw ? JSON.parse(raw) : [];
                    const next = arr.map((n: any) => n.id === id ? { ...n, read: true } : n);
                    localStorage.setItem(key, JSON.stringify(next));
                } catch (err) { /* ignore */ }
                setNotifications((prev) => sortNotificationsDesc((prev || []).map(n => n.id === id ? { ...n, read: true } : n)));
                return;
            }

            if (!token) return;
            const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                setNotifications((prev) => sortNotificationsDesc((prev || []).map(n => n.id === id ? { ...n, read: true } : n)));
            }
        } catch (err) {
            console.error('Failed to mark notification read', err);
        }
    };

    const handleNotificationClick = async (n: any) => {
        try {
            // Navigate based on notification content
            const raw = n?.raw || {};
            const data = n?.data || {};

            // 1) If server-side data explicitly contains billing/event IDs, prefer those
            if (data && data.billingId) {
                await markRead(n.id);
                navigate(`/billing/preview/${data.billingId}`);
                return;
            }
            if (data && data.eventId) {
                await markRead(n.id);
                // go to calendar and include state to hint opening the event (CalendarPage can implement handling)
                navigate('/calendar', { state: { openEventId: String(data.eventId) } });
                return;
            }

            // 2) If payload includes an explicit source marker for activity, route to Activities
            const src = n?.source || raw?.source || null;
            if (src === 'activity' || raw?.type) {
                // extract activity id from raw payload where possible
                const activityId = raw && (raw.id || raw._id) ? (raw.id || raw._id) : null;
                await markRead(n.id);
                if (activityId) {
                    navigate('/activities', { state: { openActivityId: String(activityId) } });
                } else {
                    navigate('/activities');
                }
                return;
            }

            // 3) Fallback: check common billing id keys on raw (legacy support)
            const billingId = raw?.billingId || raw?.invoiceId || raw?.id || null;
            if (billingId) {
                await markRead(n.id);
                navigate(`/billing/preview/${billingId}`);
                return;
            }

            // Default fallback: go to calendar
            await markRead(n.id);
            navigate('/calendar');
        } catch (err) {
            console.error('Error handling notification click', err);
        }
    };

    return (
        <div className="w-full flex items-center justify-between px-8 py-4 bg-white shadow-sm"
            style={{ minHeight: 64, position: 'sticky', top: 0, zIndex: 100 ,height: '20px'}}>
            <div className="font-bold text-lg flex items-center gap-2">

            </div>
             <div className="flex items-center gap-4">
                {/* <Dropdown align="end" className="notification-dropdown">
                    <Dropdown.Toggle id="notifDropdown" className="p-0 bg-transparent border-0 no-hover-shadow topbar-bell-toggle" style={{ boxShadow: 'none' }}>
                        <div className="topbar-bell">
                            <FaBell />
                            {unreadCount > 0 && <span className="topbar-bell-count">{unreadCount}</span>}
                        </div>
                    </Dropdown.Toggle>
                    <Dropdown.Menu align="end" className="shadow rounded-lg p-2" style={{ minWidth: 260 }}>
                        <div className="px-3 py-2 text-muted small">Notifications</div>
                        <Dropdown.Divider />
                        {notifications.length === 0 ? (
                            <div className="px-3 py-2 text-center text-muted">No notifications</div>
                        ) : (
                            notifications.slice(0,5).map(n => (
                                <div
                                    key={n.id}
                                    className={`px-3 py-2 ${n.read ? 'text-muted' : ''}`}
                                    style={{ borderBottom: '1px solid #f1f3f5', background: n.read ? '#fff' : '#f3f4f6', cursor: 'pointer' }}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div className="fw-bold" style={{ fontSize: 13 }}>{n.title}</div>
                                                <div className="text-muted small" style={{ fontSize: 12, marginTop: 2 }}>{formatNotificationDate(n)}</div>
                                                <div className="small text-truncate" style={{ maxWidth: 240, marginTop: 4 }}>{n.body}</div>
                                    <div className="mt-1 d-flex justify-content-end">
                                        
                                    </div>
                                </div>
                            ))
                        )}
                        <div className="px-3 py-2 text-center">
                            <button className="btn btn-link p-0" onClick={() => navigate('/notifications')}>View all</button>
                        </div> 
                    </Dropdown.Menu>
                </Dropdown> */}

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
