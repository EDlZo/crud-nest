import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { ContactsPage } from './pages/ContactsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CompanyDetailsPage } from './pages/CompanyDetailsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { VisibilityPage } from './pages/VisibilityPage';
import { DashboardPage } from './pages/DashboardPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { NotificationSettingsPage } from './pages/NotificationSettingsPage';
import { BillingPage } from './pages/BillingPage';
import { BillingCreatePage } from './pages/BillingCreatePage';
import { BillingPreviewPage } from './pages/BillingPreviewPage';
import CalendarPage from './pages/CalendarPage';
import NotificationsPage from './pages/NotificationsPage';
// import { DealsPage } from './pages/DealsPage'; // Hidden temporarily
import Layout from './components/Layout';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const RequireAuthRedirect = () => {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const publicPaths = ['/login', '/register'];
    if (!token && !publicPaths.includes(location.pathname)) {
      // if not authenticated and trying to access a protected path, redirect to login
      navigate('/login', { replace: true });
    }
  }, [token, location.pathname, navigate]);

  return null;
};

function App() {
  return (
    <BrowserRouter>
      <RequireAuthRedirect />
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <Layout>
                <ContactsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies"
          element={
            <ProtectedRoute>
              <Layout>
                <CompaniesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <CompanyDetailsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <Layout>
                <AdminUsersPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/visibility"
          element={
            <ProtectedRoute>
              <Layout>
                <VisibilityPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <NotificationSettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <ProtectedRoute>
              <Layout>
                <ActivitiesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Layout>
                <CalendarPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <NotificationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <Layout>
                <BillingPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/create"
          element={
            <ProtectedRoute>
              <Layout>
                <BillingCreatePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/preview/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <BillingPreviewPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Deals Pipeline - Hidden temporarily */}
        {/* <Route
          path="/deals"
          element={
            <ProtectedRoute>
              <Layout>
                <DealsPage />
              </Layout>
            </ProtectedRoute>
          }
        /> */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

