import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import { FaTrash } from 'react-icons/fa';

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
    } catch (err) { return null; }
};

const sortNotificationsDesc = (arr: any[]) => {
    try {
        return (arr || []).slice().sort((a: any, b: any) => {
            const aTs = parseNotificationDate(a)?.getTime() || 0;
            const bTs = parseNotificationDate(b)?.getTime() || 0;
            return bTs - aTs;
        });
    } catch (err) { return arr || []; }
};

const formatNotificationDate = (n: any) => {
    try {
        const d = parseNotificationDate(n);
        if (!d) return '';
        const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'th-TH';
        return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
    } catch (err) { return ''; }
};

const NotificationsPage: React.FC = () => {
    const { token } = useAuth();
    const [items, setItems] = useState<any[]>([]);
    const [clearing, setClearing] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const confirmRef = React.useRef<HTMLDivElement | null>(null);
    const btnRef = React.useRef<HTMLButtonElement | null>(null);
    const navigate = useNavigate();

    // Close confirm popover when clicking outside
    useEffect(() => {
        if (!showConfirm) return;
        const onDocClick = (e: MouseEvent) => {
            const t = e.target as Node | null;
            if (confirmRef.current && !confirmRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
                setShowConfirm(false);
            }
        };
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, [showConfirm]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const localRaw = localStorage.getItem('local_notifications');
                let localNotifs: any[] = [];
                try { localNotifs = localRaw ? JSON.parse(localRaw) : []; } catch (err) { localNotifs = []; }

                if (!token) {
                    if (mounted) setItems(sortNotificationsDesc(localNotifs).slice(0,5));
                    return;
                }

                try {
                    const res = await fetch(`${API_BASE_URL}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
                    if (res.ok) {
                        const data = await res.json();
                        const serverNotifs: any[] = Array.isArray(data) ? data : [];
                        const merged = [...serverNotifs];
                        for (const ln of localNotifs) {
                            if (!ln || !ln.id) continue;
                            if (!merged.find(s => s && s.id === ln.id)) merged.unshift(ln);
                        }
                        // dedupe
                        const seen = new Set();
                        const deduped: any[] = [];
                        for (const n of merged) {
                            if (!n || !n.id) continue;
                            if (seen.has(n.id)) continue;
                            seen.add(n.id);
                            deduped.push(n);
                        }
                        if (mounted) setItems(sortNotificationsDesc(deduped));
                        return;
                    }
                } catch (err) {
                    // fallback
                }

                if (mounted) setItems(sortNotificationsDesc(localNotifs));
            } catch (err) {
                console.error('Failed to load notifications page', err);
            }
        };
        load();
        return () => { mounted = false; };
    }, [token]);

    const openItem = (n: any) => {
        try {
            const raw = n?.raw || {};
            const billingId = raw?.id || raw?.billingId || raw?.invoiceId || null;
            if (billingId) {
                navigate(`/billing/preview/${billingId}`);
                return;
            }
            navigate('/calendar');
        } catch (err) { console.error(err); }
    };

    return (
        <div className="container mt-4">
            <div className="card shadow">
                <div className="card-header d-flex align-items-center justify-content-between">
                    <h6 className="m-0">All Notifications</h6>
                    <div className="d-flex align-items-center gap-2">
                        <div style={{ position: 'relative' }} ref={confirmRef}>
                            <button
                                ref={btnRef}
                                className="btn btn-icon p-0"
                                aria-label="Clear notifications"
                                disabled={clearing}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowConfirm(s => !s);
                                }}
                                style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#fff', border: '1px solid transparent' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#ef4444' }}>
                                    <path d="M3 6h18" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M10 11v6M14 11v6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>

                            {showConfirm && (
                                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 1400 }}>
                                    <div style={{ position: 'relative' }}>
                                        <div className="card shadow-sm p-3" style={{ width: 200, borderRadius: 8 }} onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400E', flex: '0 0 auto' }}>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M12 9v4" stroke="#B45309" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M12 17h.01" stroke="#B45309" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M21 12A9 9 0 1112 3a9 9 0 019 9z" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </div>
                                                    <div style={{ fontWeight: 600, textAlign: 'left', fontSize: 14, flex: '1 1 auto' }}>Are you sure?</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', width: '100%', marginTop: 4 }}>
                                                    <button onClick={() => setShowConfirm(false)} style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827', borderRadius: 8, padding: '6px 12px', minWidth: 84, whiteSpace: 'nowrap' }}>Cancel</button>
                                                    <button onClick={async () => {
                                                        try {
                                                            setShowConfirm(false);
                                                            setClearing(true);
                                                            try { localStorage.removeItem('local_notifications'); } catch (e) { }
                                                            if (token && items && items.length) {
                                                                const serverIds = items.filter(i => i && i.id).map(i => i.id);
                                                             for (const id of serverIds) {
                                                                    try {
                                                                        await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
                                                                    } catch (err) { }
                                                                }
                                                            }
                                                            // clear UI and notify other components (Topbar) to update in realtime
                                                            const clearedIds = items && items.length ? items.filter(i => i && i.id).map(i => i.id) : [];
                                                            setItems([]);
                                                            try {
                                                                // Dispatch a global event so Topbar and other listeners can update immediately
                                                                window.dispatchEvent(new CustomEvent('notificationsCleared', { detail: { ids: clearedIds } }));
                                                            } catch (e) { /* ignore */ }
                                                        } catch (err) {
                                                            console.error('Failed to clear notifications', err);
                                                        } finally {
                                                            setClearing(false);
                                                        }
                                                    }} style={{ background: '#ef4444', color: '#fff', borderRadius: 8, padding: '6px 12px', border: 'none', minWidth: 84, whiteSpace: 'nowrap' }}>Delete</button>
                                                </div>
                                            </div>
                                            <svg viewBox="0 0 16 8" style={{ position: 'absolute', right: 14, top: -8, width: 16, height: 8, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.08))' }} aria-hidden>
                                                <path d="M8 0 L16 8 L0 8 Z" fill="#ffffff" stroke="rgba(0,0,0,0.06)" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card-body p-0">
                    {items.length === 0 ? (
                        <div className="p-3 text-muted">No notifications</div>
                    ) : (
                        <ul className="list-unstyled m-0">
                            {items.map(n => (
                                <li key={n.id} className="px-3 py-3 border-bottom" style={{ cursor: 'pointer' }} onClick={() => openItem(n)}>
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                            <div className="fw-bold" style={{ fontSize: 14 }}>{n.title}</div>
                                            <div className="text-muted small" style={{ marginTop: 4 }}>{formatNotificationDate(n)}</div>
                                        </div>
                                        <div className="text-end" style={{ maxWidth: 260 }}>
                                            <div className="small text-truncate" style={{ maxWidth: 260 }}>{n.body}</div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
