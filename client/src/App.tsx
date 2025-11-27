import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { ContactsPage } from './pages/ContactsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { VisibilityPage } from './pages/VisibilityPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { AdminCompaniesPage } from './pages/AdminCompaniesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ContactsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/visibility"
          element={
            <ProtectedRoute>
              <VisibilityPage />
            </ProtectedRoute>
          }
        />
        <Route path="/companies/new" element={<CompaniesPage />} />
        <Route
          path="/admin/companies"
          element={
            <ProtectedRoute>
              <AdminCompaniesPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

