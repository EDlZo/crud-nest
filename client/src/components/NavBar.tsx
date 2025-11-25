import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './NavBar.css';

export const NavBar = () => {
  const { user } = useAuth();

  return (
    <nav className="app-nav">
      <ul>
        <li>
          <Link to="/">จัดการข้อมูล</Link>
        </li>
        {user?.role === 'superadmin' && (
          <li>
            <Link to="/admin/users">จัดการผู้ใช้</Link>
          </li>
        )}
      </ul>
    </nav>
  );
};
