import { useEffect, useState } from 'react';
import { FaCog, FaTrash } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../utils/api';

// use apiFetch for network calls (provides better error messages)

export const AdminCompaniesPage = () => {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [misconfigured, setMisconfigured] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // In production, if VITE_API_BASE_URL is not set the config falls back to window.location.origin
    // which means API calls will hit the SPA host and return HTML. Detect and show a clear message.
    try {
      if (!import.meta.env.DEV && API_BASE_URL === window.location.origin) {
        setMisconfigured(true);
        setError('API base URL not configured for production. Set `VITE_API_BASE_URL` to your backend URL so API requests reach the server (not the SPA).');
      }
    } catch (e) {
      // ignore in environments where import.meta is unavailable
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    if (misconfigured) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch('/companies', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (typeof data === 'string') {
        // server returned non-JSON (likely HTML) — show a helpful preview
        const preview = data.slice(0, 300);
        throw new Error(`Expected JSON but server returned non-JSON response. Preview: ${preview}`);
      }

      setCompanies(data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;
    try {
      await apiFetch(`/companies/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchCompanies();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const handleEdit = (company: any) => {
    setEditing(company);
  };

  const handleSave = async (company: any) => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/companies/${company.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(company),
      });
      fetchCompanies();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
      setEditing(null);
    }
  };

  return (
    <div className="container-fluid">
      <h1 className="h3 mb-4 text-gray-800">Companies / Organizations</h1>
      {misconfigured ? (
        <div className="alert alert-danger">
          <p className="mb-2">API base URL not configured for production.</p>
          <p className="mb-2">Set <code>VITE_API_BASE_URL</code> to your backend URL so API requests reach the server (not the SPA). Example:</p>
          <pre className="small">VITE_API_BASE_URL=https://api.example.com</pre>
          <div className="mt-2">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                const example = 'VITE_API_BASE_URL=https://api.example.com';
                try {
                  navigator.clipboard.writeText(example);
                  // eslint-disable-next-line no-alert
                  alert('Copied example to clipboard');
                } catch (e) {
                  // fallback: do nothing
                }
              }}
            >
              Copy example
            </button>
          </div>
        </div>
      ) : (
        error && <div className="alert alert-danger">{error}</div>
      )}
      {loading ? (
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      ) : (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Branch Name</th>
              <th>Tax ID</th>
              <th>Phone</th>
              <th>Fax</th>
              <th>Contact Email</th>
              <th>Avatar</th>
              <th>Website</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company: any) => (
              <tr key={company.id}>
                <td>{company.name}</td>
                <td>{company.branchName}</td>
                <td>{company.taxId}</td>
                <td>{company.phone}</td>
                <td>{company.fax}</td>
                <td>{company.contactEmail}</td>
                <td>{company.avatarUrl}</td>
                <td>{company.website}</td>
                <td>{company.status}</td>
                <td>
                  <button className="btn btn-primary btn-sm" aria-label="edit" title="Edit" onClick={() => handleEdit(company)}>
                    <FaCog />
                  </button>
                  <button className="btn btn-danger btn-sm" aria-label="delete" title="Delete" onClick={() => handleDelete(company.id)}>
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && (
            <div className="card shadow mb-4">
          <div className="card-header py-3">
            <h6 className="m-0 font-weight-bold text-primary">Edit Company</h6>
          </div>
          <div className="card-body">
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSave(editing);
            }}>
              <div className="form-group">
                <label>Company Name</label>
                <input type="text" className="form-control" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Branch Name</label>
                <input type="text" className="form-control" value={editing.branchName} onChange={(e) => setEditing({ ...editing, branchName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Tax ID</label>
                <input type="text" className="form-control" value={editing.taxId} onChange={(e) => setEditing({ ...editing, taxId: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" className="form-control" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Fax</label>
                <input type="text" className="form-control" value={editing.fax} onChange={(e) => setEditing({ ...editing, fax: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input type="email" className="form-control" value={editing.contactEmail} onChange={(e) => setEditing({ ...editing, contactEmail: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Avatar URL</label>
                <input type="text" className="form-control" value={editing.avatarUrl} onChange={(e) => setEditing({ ...editing, avatarUrl: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input type="text" className="form-control" value={editing.website} onChange={(e) => setEditing({ ...editing, website: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
