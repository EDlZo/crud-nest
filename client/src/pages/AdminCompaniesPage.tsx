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
    <main className="page-container">
      <section className="card">
        <h1>จัดการบริษัท</h1>
        {loading && <p>กำลังโหลด...</p>}
        {error && <p className="error">{error}</p>}
        <table className="table">
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
                    <button onClick={() => startEdit({ ...c, id: c.id || c._id })}>แก้ไข</button>
                    <button onClick={() => handleDelete(c.id || c._id)}>ลบ</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
          {editing && (
            <div className="card" style={{ marginTop: 12 }}>
              <h3>แก้ไขบริษัท</h3>
              <label>
                ชื่อ
                <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <label>
                ที่อยู่
                <input value={editing.address || ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
              </label>
              <label>
                เบอร์โทร
                <input value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </label>
              <label>
                อีเมลติดต่อ
                <input value={editing.contactEmail || ''} onChange={(e) => setEditing({ ...editing, contactEmail: e.target.value })} />
              </label>
              <div style={{ marginTop: 8 }}>
                <button onClick={saveEdit} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                <button onClick={cancelEdit} style={{ marginLeft: 8 }}>ยกเลิก</button>
              </div>
            </div>
          )}
      </section>
    </main>
  );
};
