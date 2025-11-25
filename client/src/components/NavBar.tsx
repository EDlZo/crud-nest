import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './NavBar.css';

export const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="app-nav">
      <div className="brand">ระบบจัดการ</div>
      {user && (
        <div style={{ marginBottom: 12, color: '#cbd5e1', fontSize: 13 }}>
          <div>{user.email}</div>
          <div style={{ opacity: 0.9 }}>{user.role ?? '—'}</div>
        </div>
      )}
      <ul>
        <li>
          <Link to="/">จัดการข้อมูล</Link>
        </li>
        {user?.role === 'superadmin' && (
          <li>
            <Link to="/admin/users">จัดการผู้ใช้</Link>
          </li>
        )}
        <li>
          <button onClick={handleLogout} className="secondary logout-btn">
            ออกจากระบบ
          </button>
        </li>
      </ul>
    </nav>
  );
};
