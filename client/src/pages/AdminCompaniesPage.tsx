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
      alert((err as Error).message);
    }
  };

  const startEdit = (c: any) => {
    setEditing({ ...c });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing || !editing.id) return;
    setSaving(true);
    try {
      const res = await fetch(withBase(`/companies/${editing.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editing),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error((payload && (payload.message || payload.error)) || 'ไม่สามารถบันทึกข้อมูลได้');
      }
      setEditing(null);
      fetchCompanies();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid">
      {/* Page Heading */}
      <h1 className="h3 mb-4 text-gray-800">จัดการบริษัท</h1>

      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">รายชื่อบริษัททั้งหมด</h6>
        </div>
        <div className="card-body">
          {loading && <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>}
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered" width="100%" cellSpacing={0}>
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>ที่อยู่</th>
                  <th>เบอร์</th>
                  <th>อีเมลผู้สร้าง</th>
                  <th>วันที่สร้าง</th>
                  <th>การกระทำ</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c: any) => (
                  <tr key={c.id || c._id || c.name}>
                    <td>{c.name}</td>
                    <td>{c.address}</td>
                    <td>{c.phone}</td>
                    <td>{c.ownerEmail || c.createdByEmail || '-'}</td>
                    <td>{c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}</td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-sm btn-warning" onClick={() => startEdit({ ...c, id: c.id || c._id })}>แก้ไข</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id || c._id)}>ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <div className="card shadow mb-4">
          <div className="card-header py-3">
            <h6 className="m-0 font-weight-bold text-primary">แก้ไขบริษัท</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">ชื่อ</label>
                <input className="form-control" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">เบอร์โทร</label>
                <input className="form-control" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">อีเมลติดต่อ</label>
                <input className="form-control" value={editing.contactEmail || ''} onChange={(e) => setEditing({ ...editing, contactEmail: e.target.value })} />
              </div>
              <div className="col-md-12 mb-3">
                <label className="form-label">ที่อยู่</label>
                <input className="form-control" value={editing.address || ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
              <button className="btn btn-secondary" onClick={cancelEdit}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
