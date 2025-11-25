import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NavBar } from './NavBar';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div>
      <NavBar />
      <main>{children}</main>
    </div>
  );
};

