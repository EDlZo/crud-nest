import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Sidebar from './Sidebar';
import './layout.css';
const Layout = ({ children }) => {
    return (_jsxs("div", { id: "wrapper", className: "d-flex", children: [_jsx(Sidebar, {}), _jsx("div", { id: "content-wrapper", className: "d-flex flex-column w-100", children: _jsx("div", { id: "content", style: { flex: 1 }, children: _jsx("div", { className: "container-fluid app-container", children: children }) }) })] }));
};
export default Layout;
