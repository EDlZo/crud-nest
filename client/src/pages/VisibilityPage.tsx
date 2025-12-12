import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import '../App.css';

type VisibilityMap = Record<string, Record<string, boolean>>;

export const VisibilityPage = () => {
  const { token, user, logout } = useAuth();
  const [visibility, setVisibility] = useState<VisibilityMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchVisibility = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/visibility`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 403) {
        // forbidden to view visibility settings
        setForbidden(true);
        const text = await res.text();
        setError(text || 'Forbidden');
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVisibility(data || {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const [pageKeys, setPageKeys] = useState<{ key: string; label: string }[]>([]);

  const roles = ['superadmin', 'admin', 'guest'];

  
  // Discover known frontend pages so Visibility can manage every page.
  // This list is derived from client/src/pages/*.tsx and backend PageVisibility usage.
  const discoveredKeys = [
    'dashboard',
    'contacts',
    'companies',
    'activities',
    'admin_users',
    'visibility',
    'notification_settings',
  ];
  // Preferred ordering for display
  const preferred = ['dashboard', 'contacts', 'companies', 'activities', 'admin_users', 'visibility', 'notification_settings'];

  const humanLabel = (key: string) => {
    if (key === 'activities') return 'Activities & Tasks';
    if (key === 'admin_users') return 'User';
    if (key === 'contacts') return 'Contacts';
    if (key === 'notification' || key === 'notification_settings' || key === 'notification-settings') return 'Notification';
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Build pageKeys state after visibility is fetched
  useEffect(() => {
    if (!visibility) return;
    const keys = new Set<string>();
    Object.keys(visibility).forEach((r) => {
      const map = visibility[r] || {};
      Object.keys(map).forEach((k) => keys.add(k));
    });
    discoveredKeys.forEach((k) => keys.add(k));
    // Ensure 'deals' is not shown in the Visibility UI (remove it if present)
    if (keys.has('deals')) keys.delete('deals');

    const ordered: { key: string; label: string }[] = [];
    preferred.forEach((k) => {
      if (keys.has(k)) {
        ordered.push({ key: k, label: humanLabel(k) });
        keys.delete(k);
      }
    });
    Array.from(keys)
      .sort()
      .forEach((k) => ordered.push({ key: k, label: humanLabel(k) }));

    setPageKeys(ordered);
  }, [visibility]);
  const toggle = (role: string, pageKey: string) => {
    setVisibility((v) => {
      const copy: VisibilityMap = JSON.parse(JSON.stringify(v || {}));
      copy[role] = copy[role] || {};
      copy[role][pageKey] = !Boolean(copy[role][pageKey]);
      return copy;
    });
  };

  const save = async () => {
    if (!token || !visibility) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/visibility`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchVisibility();
      alert('Visibility settings saved');
      // Dispatch custom event to notify Sidebar to refresh visibility
      window.dispatchEvent(new CustomEvent('visibilityUpdated'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const canManageVisibility = user?.role === 'superadmin';

  return (
    <div className="container-fluid">
      <h1 className="h3 mb-4 text-gray-800">Visibility Settings</h1>

      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">Select which pages each role can see</h6>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {loading && <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>}
          {forbidden && <div className="alert alert-danger">คุณไม่มีสิทธิ์เข้าถึงหน้า Visibility</div>}
          {!canManageVisibility && (
            <div className="alert alert-warning">You can view these settings, but only Superadmin can edit them</div>
          )}

          {!forbidden && (
            <div>
              
              <div className="table-responsive">
                <table className="table table-sm" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '50%' }} />
                    {roles.map((r) => (
                      <col key={r} style={{ width: `${50 / roles.length}%` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>PAGE</th>
                      {roles.map((r, i) => (
                        <th
                          key={r}
                          className="text-center text-uppercase"
                          style={r === 'admin' ? { borderRight: 'none' } : undefined}
                        >
                          {r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageKeys.map(p => (
                      <tr key={p.key}>
                        <td>{p.label}</td>
                        {roles.map((r) => (
                          <td
                            key={r}
                            className="text-center"
                            style={r === 'admin' ? { borderRight: 'none' } : undefined}
                          >
                            <input type="checkbox" checked={Boolean(visibility?.[r]?.[p.key])} onChange={() => toggle(r, p.key)} disabled={!canManageVisibility} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-3">
            <button className="btn btn-primary me-2" onClick={save} disabled={!canManageVisibility || loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-secondary" onClick={fetchVisibility} disabled={!canManageVisibility || loading}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisibilityPage;
