import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();

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
                </div>
                <div className="card-body">
                    {items.length === 0 ? (
                        <div className="text-muted">No notifications</div>
                    ) : (
                        <ul className="list-unstyled">
                            {items.map(n => (
                                <li key={n.id} className="py-2 border-bottom" style={{ cursor: 'pointer' }} onClick={() => openItem(n)}>
                                    <div className="fw-bold">{n.title}</div>
                                    <div className="text-muted small">{formatNotificationDate(n)}</div>
                                    <div className="small text-truncate">{n.body}</div>
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
