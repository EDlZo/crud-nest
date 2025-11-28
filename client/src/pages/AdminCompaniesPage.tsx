import { useEffect, useState } from 'react';
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
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลบริษัทได้');
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
    if (!confirm('ยืนยันลบบริษัทนี้?')) return;
    try {
      const res = await fetch(withBase(`/companies/${id}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('ไม่สามารถลบได้');
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
      <h1 className="h3 mb-4 text-gray-800">บริษัท/องค์กร</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      ) : (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>ชื่อบริษัท</th>
              <th>ชื่อสาขา</th>
              <th>เลขผู้เสียภาษี</th>
              <th>เบอร์โทรศัพท์</th>
              <th>เบอร์แฟกซ์</th>
              <th>อีเมลติดต่อ</th>
              <th>รูปโปรไฟล์</th>
              <th>เว็บไซต์</th>
              <th>สถานะ</th>
              <th>การจัดการ</th>
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
                  <button className="btn btn-primary btn-sm" onClick={() => handleEdit(company)}>แก้ไข</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(company.id)}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && (
        <div className="card shadow mb-4">
          <div className="card-header py-3">
            <h6 className="m-0 font-weight-bold text-primary">แก้ไขบริษัท</h6>
          </div>
          <div className="card-body">
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSave(editing);
            }}>
              <div className="form-group">
                <label>ชื่อบริษัท</label>
                <input type="text" className="form-control" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>ชื่อสาขา</label>
                <input type="text" className="form-control" value={editing.branchName} onChange={(e) => setEditing({ ...editing, branchName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>เลขผู้เสียภาษี</label>
                <input type="text" className="form-control" value={editing.taxId} onChange={(e) => setEditing({ ...editing, taxId: e.target.value })} />
              </div>
              <div className="form-group">
                <label>เบอร์โทรศัพท์</label>
                <input type="text" className="form-control" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>เบอร์แฟกซ์</label>
                <input type="text" className="form-control" value={editing.fax} onChange={(e) => setEditing({ ...editing, fax: e.target.value })} />
              </div>
              <div className="form-group">
                <label>อีเมลติดต่อ</label>
                <input type="email" className="form-control" value={editing.contactEmail} onChange={(e) => setEditing({ ...editing, contactEmail: e.target.value })} />
              </div>
              <div className="form-group">
                <label>รูปโปรไฟล์</label>
                <input type="text" className="form-control" value={editing.avatarUrl} onChange={(e) => setEditing({ ...editing, avatarUrl: e.target.value })} />
              </div>
              <div className="form-group">
                <label>เว็บไซต์</label>
                <input type="text" className="form-control" value={editing.website} onChange={(e) => setEditing({ ...editing, website: e.target.value })} />
              </div>
              <div className="form-group">
                <label>สถานะ</label>
                <select className="form-control" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">บันทึก</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
