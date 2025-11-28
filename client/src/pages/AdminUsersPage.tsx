import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

type User = {
  id: string;
  userId: string;
  email: string;
  role?: string;
};

export const AdminUsersPage = () => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
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
      // track if current user was affected so we can prompt sign-out
      let promptedSignOut = false;
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
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const body = (data && (data.message || JSON.stringify(data))) || (await res.text());
          throw new Error(body || `Failed to update ${userId}`);
        }

        // If backend returned a token for this user, handle it
        if (data?.token) {
          try {
            // If the affected user is the currently logged-in user, prompt them to re-login
            if (user?.userId && data.userId === user.userId) {
              promptedSignOut = true;
            } else {
              // otherwise copy token for admin to deliver
              await navigator.clipboard.writeText(data.token);
              alert('โทเค็นใหม่ของผู้ใช้ถูกคัดลอกไปยังคลิปบอร์ดแล้ว\nส่งให้ผู้ใช้เพื่อให้ล็อกอินใหม่');
            }
          } catch {
            // fallback: show prompt so admin can copy manually
            // eslint-disable-next-line no-alert
            if (!(user?.userId && data.userId === user.userId)) prompt('โทเค็นใหม่ของผู้ใช้ (คัดลอกด้วยมือ):', data.token);
          }
        }
      }

      // refresh list and clear pending
      await fetchUsers();
      setPending({});
      if (promptedSignOut) {
        // show a modal-like alert then sign the user out and redirect to login
        // use confirm to ensure UX in this tab — we can replace with a nicer modal if desired
        // eslint-disable-next-line no-alert
        const ok = confirm('สิทธิ์ของบัญชีคุณถูกเปลี่ยน. ต้องการออกจากระบบและไปยังหน้าเข้าสู่ระบบเพื่อสมัครสิทธิ์ใหม่หรือไม่?');
        if (ok) {
          logout();
          navigate('/login');
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Confirm modal state for deleting a user
  const [confirmTarget, setConfirmTarget] = useState<{ userId: string; email: string } | null>(null);

  const deleteUser = async (userId: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/auth/users/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchUsers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setConfirmTarget(null);
    }
  };

  const openDeleteConfirm = (userId: string, email: string) => setConfirmTarget({ userId, email });
  const cancelDelete = () => setConfirmTarget(null);

  const cancelAll = () => setPending({});

  const canManageRoles = user?.role === 'superadmin';
  // allow any authenticated user to view the users page in read-only mode

  return (
    <div className="container-fluid">
      <h1 className="h3 mb-4 text-gray-800">จัดการผู้ใช้</h1>

      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
          <h6 className="m-0 font-weight-bold text-primary">รายการผู้ใช้และบทบาท</h6>
          <div>
            <button className="btn btn-sm btn-secondary me-2" onClick={fetchUsers} disabled={loading}>
              {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
            {canManageRoles && hasPendingChanges() && (
              <>
                <button className="btn btn-sm btn-primary me-2" onClick={saveAll} disabled={loading}>
                  บันทึกการเปลี่ยนแปลง
                </button>
                <button className="btn btn-sm btn-danger" onClick={cancelAll} disabled={loading}>
                  ยกเลิก
                </button>
              </>
            )}
          </div>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered" width="100%" cellSpacing={0}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>User ID</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const selected = (typeof pending[u.userId] !== 'undefined' ? pending[u.userId] : (u.role ?? 'guest')) as 'admin' | 'superadmin' | 'guest' | undefined;
                  const changed = typeof pending[u.userId] !== 'undefined' && pending[u.userId] !== (u.role ?? 'guest');
                  return (
                    <tr key={u.id} className={changed ? 'table-warning' : ''}>
                      <td>{u.email}</td>
                      <td>{u.userId}</td>
                      <td>
                        <div className="d-flex gap-3">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`role-${u.userId}`}
                              checked={selected === 'admin'}
                              onChange={() => setPendingRole(u.userId, 'admin')}
                              disabled={!canManageRoles}
                            />
                            <label className="form-check-label">Admin</label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`role-${u.userId}`}
                              checked={selected === 'superadmin'}
                              onChange={() => setPendingRole(u.userId, 'superadmin')}
                              disabled={!canManageRoles}
                            />
                            <label className="form-check-label">Super</label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`role-${u.userId}`}
                              checked={selected === 'guest'}
                              onChange={() => setPendingRole(u.userId, 'guest')}
                              disabled={!canManageRoles}
                            />
                            <label className="form-check-label">Guest</label>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => openDeleteConfirm(u.userId, u.email)}
                          disabled={loading || !canManageRoles}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirmTarget && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">ยืนยันการลบผู้ใช้</h5>
                <button type="button" className="btn-close" onClick={cancelDelete}></button>
              </div>
              <div className="modal-body">
                <p>คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ <strong>{confirmTarget.email}</strong> ? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelDelete}>ยกเลิก</button>
                <button type="button" className="btn btn-danger" onClick={() => deleteUser(confirmTarget.userId)}>ลบ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
