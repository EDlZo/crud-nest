import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './NavBar.css';

const decodeJwt = (token?: string | null) => {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // fallback: if context user not set yet, try decode token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('crud-token') : null;
  const decoded = decodeJwt(token);
  const displayEmail = user?.email ?? decoded?.email ?? null;
  // treat missing role as 'guest' so visibility settings for guest apply
  const displayRole = user?.role ?? decoded?.role ?? 'guest';

  const [visibility, setVisibility] = useState<Record<string, Record<string, boolean>> | null>(null);
  const [visLoading, setVisLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    // fetch visibility settings (any authenticated user can read)
    let mounted = true;
    setVisLoading(true);
    fetch('/auth/visibility', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`status:${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        setVisibility(data || null);
      })
      .catch(() => {
        if (!mounted) return;
        setVisibility(null);
      })
      .finally(() => {
        if (!mounted) return;
        setVisLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  const canView = (pageKey: string) => {
    if (visibility && displayRole) {
      // explicit visibility mapping wins
      const roleMap = visibility[displayRole];
      if (roleMap && typeof roleMap[pageKey] !== 'undefined') return Boolean(roleMap[pageKey]);
      return false;
    }
    // fallback: previous behavior while visibility not available
    if (pageKey === 'dashboard') return true;
    if (pageKey === 'admin_users') return displayRole === 'superadmin' || displayRole === 'admin';
    if (pageKey === 'admin_companies') return displayRole === 'superadmin' || displayRole === 'admin';
    if (pageKey === 'visibility') return displayRole === 'superadmin';
    return true;
  };

  return (
    <nav className="app-nav">
      <div className="brand">ระบบจัดการ</div>
      <div style={{ marginBottom: 12, color: '#cbd5e1', fontSize: 13 }}>
        <div>{displayEmail ?? 'กำลังโหลดผู้ใช้...'}</div>
        <div style={{ opacity: 0.9 }}>Role : {displayRole ?? 'Guest'}</div>
      </div>
      <ul>
        {canView('dashboard') && (
          <li>
            <button
              type="button"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              aria-current={location.pathname === '/' ? 'page' : undefined}
              onClick={() => {
                // navigate to home (manage data)
                navigate('/');
                try { window.dispatchEvent(new PopStateEvent('popstate')); } catch (e) {}
              }}
            >
              จัดการข้อมูล
            </button>
          </li>
        )}

        {canView('admin_users') && (
          <li>
            <button
              type="button"
              className={`nav-link ${location.pathname === '/admin/users' ? 'active' : ''}`}
              aria-current={location.pathname === '/admin/users' ? 'page' : undefined}
              onClick={() => {
                navigate('/admin/users');
                try { window.dispatchEvent(new PopStateEvent('popstate')); } catch (e) {}
              }}
            >
              จัดการผู้ใช้
            </button>
          </li>
        )}

        {canView('admin_companies') && (
          <li>
            <button
              type="button"
              className={`nav-link ${location.pathname === '/admin/companies' ? 'active' : ''}`}
              aria-current={location.pathname === '/admin/companies' ? 'page' : undefined}
              onClick={() => {
                navigate('/admin/companies');
                try { window.dispatchEvent(new PopStateEvent('popstate')); } catch (e) {}
              }}
            >
              บริษัท
            </button>
          </li>
        )}

        {canView('visibility') && (
          <li>
            <button
              type="button"
              className={`nav-link ${location.pathname === '/admin/visibility' ? 'active' : ''}`}
              aria-current={location.pathname === '/admin/visibility' ? 'page' : undefined}
              onClick={() => {
                navigate('/admin/visibility');
                try { window.dispatchEvent(new PopStateEvent('popstate')); } catch (e) {}
              }}
            >
              การมองเห็น
            </button>
          </li>
        )}
        <li>
          <button onClick={handleLogout} className="nav-link logout-btn">
            ออกจากระบบ
          </button>
        </li>
        
      </ul>
    </nav>
  );
};
