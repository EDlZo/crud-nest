import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { ContactsPage } from './pages/ContactsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { VisibilityPage } from './pages/VisibilityPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { AdminCompaniesPage } from './pages/AdminCompaniesPage';
import Layout from './components/Layout';
function App() {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/contacts", replace: true }) }), _jsx(Route, { path: "/contacts", element: _jsx(ProtectedRoute, { children: _jsx(Layout, { children: _jsx(ContactsPage, {}) }) }) }), _jsx(Route, { path: "/login", element: _jsx(AuthPage, { mode: "login" }) }), _jsx(Route, { path: "/register", element: _jsx(AuthPage, { mode: "register" }) }), _jsx(Route, { path: "/admin/users", element: _jsx(ProtectedRoute, { children: _jsx(Layout, { children: _jsx(AdminUsersPage, {}) }) }) }), _jsx(Route, { path: "/admin/visibility", element: _jsx(ProtectedRoute, { children: _jsx(Layout, { children: _jsx(VisibilityPage, {}) }) }) }), _jsx(Route, { path: "/companies/new", element: _jsx(ProtectedRoute, { children: _jsx(Layout, { children: _jsx(CompaniesPage, {}) }) }) }), _jsx(Route, { path: "/admin/companies", element: _jsx(ProtectedRoute, { children: _jsx(Layout, { children: _jsx(AdminCompaniesPage, {}) }) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}
export default App;
