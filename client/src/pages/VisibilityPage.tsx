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
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVisibility(data || {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const pageKeys: { key: string; label: string }[] = [
    { key: 'dashboard', label: 'Manage Data' },
    { key: 'companies', label: 'Companies' },
    { key: 'admin_users', label: 'Manage Users' },
    { key: 'visibility', label: 'Visibility Settings' },
  ];

  const roles = ['superadmin', 'admin', 'guest'];

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
          {!canManageVisibility && (
            <div className="alert alert-warning">You can view these settings, but only Superadmin can edit them</div>
          )}

          <div className="row">
            {roles.map((role) => (
              <div key={role} className="col-md-4 mb-4">
                <div className="card border-left-primary shadow h-100 py-2">
                  <div className="card-body">
                    <div className="row no-gutters align-items-center">
                      <div className="col mr-2">
                        <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">{role}</div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                          {pageKeys.map((p) => (
                            <div key={p.key} className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={Boolean(visibility?.[role]?.[p.key])}
                                onChange={() => toggle(role, p.key)}
                                disabled={!canManageVisibility}
                              />
                              <label className="form-check-label">{p.label}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

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
