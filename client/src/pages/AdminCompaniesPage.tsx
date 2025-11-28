import { useEffect, useState } from 'react';
import { FaCog, FaTrash } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const AdminCompaniesPage = () => {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withBase('/companies'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Unable to fetch companies');
      const data = await res.json();
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
      const res = await fetch(withBase(`/companies/${id}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Unable to delete');
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
      const res = await fetch(withBase(`/companies/${company.id}`), {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(company),
      });
      if (!res.ok) throw new Error('ไม่สามารถแก้ไขได้');
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
      {error && <div className="alert alert-danger">{error}</div>}
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
