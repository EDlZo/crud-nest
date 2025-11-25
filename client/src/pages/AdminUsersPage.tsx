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
      if (!res.ok) throw new Error(await res.text());
      await fetchUsers();
    } catch (err) {
      setError((err as Error).message);
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
          <h1>จัดการผู้ใช้</h1>
          <p>รายการผู้ใช้และบทบาท</p>
        </div>
      </header>

      <section className="card">
        {error && <p className="error">{error}</p>}
        <div style={{ marginBottom: 12 }}>
          <button className="secondary" onClick={fetchUsers} disabled={loading}>
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
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
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.userId}</td>
                  <td>{u.role ?? '—'}</td>
                  <td>
                    <button onClick={() => changeRole(u.userId, 'admin')}>Make Admin</button>
                    <button onClick={() => changeRole(u.userId, 'superadmin')}>Make Super</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};
