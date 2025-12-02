import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FaBars, FaSearch, FaUserCircle, FaCog } from 'react-icons/fa';
import { Dropdown } from 'react-bootstrap';
const Topbar = () => {
    const handleLogout = () => {
        localStorage.removeItem('crud-token');
        window.location.href = '/login';
    };
    return (_jsxs("nav", { className: "navbar navbar-expand navbar-light bg-white topbar mb-4 static-top shadow", children: [_jsx("button", { id: "sidebarToggleTop", className: "btn btn-link d-md-none rounded-circle mr-3", children: _jsx(FaBars, {}) }), _jsx("form", { className: "d-none d-sm-inline-block form-inline mr-auto ml-md-3 my-2 my-md-0 mw-100 navbar-search", children: _jsx("div", { className: "input-group", children: _jsx("div", { className: "input-group-append", children: _jsx("button", { className: "btn btn-primary", type: "button", children: _jsx(FaSearch, {}) }) }) }) }), _jsx("ul", { className: "navbar-nav ml-auto", children: _jsx("li", { className: "nav-item dropdown no-arrow", children: _jsxs(Dropdown, { align: "end", children: [_jsxs(Dropdown.Toggle, { variant: "link", id: "userDropdown", className: "nav-link dropdown-toggle", children: [_jsx("span", { className: "mr-2 d-none d-lg-inline text-gray-600 small", children: "User" }), _jsx(FaUserCircle, { size: 28 })] }), _jsxs(Dropdown.Menu, { className: "shadow animated--grow-in", children: [_jsxs(Dropdown.Item, { href: "#", children: [_jsx(FaUserCircle, { className: "mr-2 text-gray-400" }), "Profile"] }), _jsxs(Dropdown.Item, { href: "#", children: [_jsx(FaCog, { className: "mr-2 text-gray-400" }), "Settings"] }), _jsx(Dropdown.Divider, {}), _jsx(Dropdown.Item, { onClick: handleLogout, children: _jsx("span", { className: "text-danger", children: "Logout" }) })] })] }) }) })] }));
};
export default Topbar;
