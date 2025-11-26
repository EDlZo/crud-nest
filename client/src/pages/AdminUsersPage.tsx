import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../App.css';

type User = {
  id: string;
  userId: string;
  email: string;
  role?: string;
};

export const AdminUsersPage = () => {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    // pending role changes keyed by userId => role ('admin'|'superadmin'|'guest')
    const [pending, setPending] = useState<Record<string, 'admin' | 'superadmin' | 'guest' | undefined>>({});

  useEffect(() => {
    if (!token) return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/auth/users/list', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUsers(data || []);
      // reset pending when we refetch authoritative data
      setPending({});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (userId: string, role: 'admin' | 'superadmin') => {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch('/auth/users/role', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.message) ? data.message : (await res.text()));
      await fetchUsers();

      // If backend returned a token for the user, copy it to clipboard and notify admin
      if (data?.token) {
        try {
          await navigator.clipboard.writeText(data.token);
          alert('โทเค็นใหม่ของผู้ใช้ถูกคัดลอกไปยังคลิปบอร์ดแล้ว\nส่งให้ผู้ใช้เพื่อให้ล็อกอินใหม่');
        } catch {
          // fallback: show prompt so admin can copy manually
          // eslint-disable-next-line no-alert
          prompt('โทเค็นใหม่ของผู้ใช้ (คัดลอกด้วยมือ):', data.token);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // -- New: batched changes UI handlers --
  const setPendingRole = (userId: string, role: 'admin' | 'superadmin' | 'guest' | undefined) => {
    setPending((p) => ({ ...p, [userId]: role }));
  };

  const hasPendingChanges = () => {
    return Object.keys(pending).some((id) => {
      const newRole = pending[id];
      if (typeof newRole === 'undefined') return false;
      const current = users.find((u) => u.userId === id)?.role ?? 'guest';
      return newRole !== current;
    });
  };

  const saveAll = async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const changes = Object.entries(pending).filter(([id, role]) => {
        if (typeof role === 'undefined') return false;
        const current = users.find((u) => u.userId === id)?.role ?? 'guest';
        return role !== current;
      });

      // sequentially apply changes (server expects single user per request)
      for (const [userId, role] of changes) {
        if (!role) continue;
        const res = await fetch('/auth/users/role', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, role }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `Failed to update ${userId}`);
        }
        // optionally process returned token
        // const data = await res.json().catch(() => null);
      }

      // refresh list and clear pending
      await fetchUsers();
      setPending({});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const cancelAll = () => setPending({});

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
          <h1>จัดการผู้ใช้</h1>
          <p>รายการผู้ใช้และบทบาท</p>
        </div>
      </header>

      <section className="card">
        {error && <p className="error">{error}</p>}
        <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="secondary" onClick={fetchUsers} disabled={loading}>
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={saveAll} disabled={!hasPendingChanges() || loading} style={{ marginRight: 8 }}>
              บันทึกการเปลี่ยนแปลง
            </button>
            <button onClick={cancelAll} disabled={!hasPendingChanges() || loading} className="secondary">
              ยกเลิก
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>email</th>
                <th>userId</th>
                <th>role</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const selected = (typeof pending[u.userId] !== 'undefined' ? pending[u.userId] : (u.role ?? 'guest')) as 'admin' | 'superadmin' | 'guest' | undefined;
                const changed = typeof pending[u.userId] !== 'undefined' && pending[u.userId] !== (u.role ?? 'guest');
                return (
                  <tr key={u.id} style={changed ? { background: 'rgba(110, 231, 183, 0.06)' } : undefined}>
                    <td>{u.email}</td>
                    <td>{u.userId}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="radio"
                            name={`role-${u.userId}`}
                            checked={selected === 'admin'}
                            onChange={() => setPendingRole(u.userId, 'admin')}
                          />
                          <span>Admin</span>
                        </label>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="radio"
                            name={`role-${u.userId}`}
                            checked={selected === 'superadmin'}
                            onChange={() => setPendingRole(u.userId, 'superadmin')}
                          />
                          <span>Super</span>
                        </label>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="radio"
                            name={`role-${u.userId}`}
                            checked={selected === 'guest'}
                            onChange={() => setPendingRole(u.userId, 'guest')}
                          />
                          <span>Guest</span>
                        </label>
                      </div>
                    </td>
                    <td />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};
