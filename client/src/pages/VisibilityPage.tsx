import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
      const res = await fetch('/auth/visibility', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
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
    { key: 'dashboard', label: 'จัดการข้อมูล' },
    { key: 'admin_users', label: 'จัดการผู้ใช้' },
    { key: 'visibility', label: 'จัดการการมองเห็น (หน้านี้)' },
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
      const res = await fetch('/auth/visibility', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchVisibility();
      alert('บันทึกการตั้งค่าการมองเห็นเรียบร้อยแล้ว');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.role || user.role !== 'superadmin') {
    return (
      <main className="app">
        <section className="card">
          <h2>ไม่พบสิทธิ์</h2>
          <p>หน้านี้สำหรับผู้ดูแลระบบระดับสูงเท่านั้น</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="app__header">
        <div>
          <h1>ตั้งค่าการมองเห็นหน้าเว็บ</h1>
          <p>เลือกหน้าที่แต่ละบทบาทสามารถมองเห็นได้</p>
        </div>
      </header>

      <section className="card">
        {error && <p className="error">{error}</p>}
        {loading && <p className="muted-text">กำลังโหลด...</p>}

        <div style={{ display: 'grid', gap: 12 }}>
          {roles.map((role) => (
            <div key={role} style={{ borderBottom: '1px dashed #e6eef8', paddingBottom: 8 }}>
              <h3 style={{ margin: '0 0 8px' }}>{role}</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {pageKeys.map((p) => (
                  <label key={p.key} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(visibility?.[role]?.[p.key])}
                      onChange={() => toggle(role, p.key)}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={loading}>{loading ? 'กำลังบันทึก...' : 'บันทึก'}</button>
          <button className="secondary" onClick={fetchVisibility} disabled={loading}>ยกเลิก</button>
        </div>
      </section>
    </main>
  );
};

export default VisibilityPage;
