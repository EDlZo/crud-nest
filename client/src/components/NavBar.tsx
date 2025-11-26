import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  const displayRole = user?.role ?? decoded?.role ?? null;

  return (
    <nav className="app-nav">
      <div className="brand">ระบบจัดการ</div>
      <div style={{ marginBottom: 12, color: '#cbd5e1', fontSize: 13 }}>
        <div>{displayEmail ?? 'กำลังโหลดผู้ใช้...'}</div>
        <div style={{ opacity: 0.9 }}>{displayRole ?? '—'}</div>
      </div>
      <ul>
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
          {displayRole === 'superadmin' ? (
          <li>
            <button
              type="button"
              className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
              aria-current={location.pathname.startsWith('/admin') ? 'page' : undefined}
              onClick={() => {
                // eslint-disable-next-line no-console
                console.log('NavBar: admin users button clicked');
                navigate('/admin/users');
                // force router update in case SPA navigation didn't trigger render
                try {
                  // dispatch popstate so Router picks up the change
                  window.dispatchEvent(new PopStateEvent('popstate'));
                } catch (e) {
                  // ignore
                }
              }}
            >
              จัดการผู้ใช้
            </button>
          </li>
        ) : null}
        <li>
          <button onClick={handleLogout} className="nav-link logout-btn">
            ออกจากระบบ
          </button>
        </li>
        
      </ul>
    </nav>
  );
};
