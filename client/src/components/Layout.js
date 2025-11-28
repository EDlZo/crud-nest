import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Sidebar from './Sidebar';
const Layout = ({ children }) => {
    return (_jsxs("div", { id: "wrapper", className: "d-flex", children: [_jsx(Sidebar, {}), _jsxs("div", { id: "content-wrapper", className: "d-flex flex-column w-100", children: [_jsx("div", { id: "content", children: _jsx("div", { className: "container-fluid", style: { padding: '20px' }, children: children }) }), _jsx("footer", { className: "sticky-footer bg-white", children: _jsx("div", { className: "container my-auto" }) })] })] }));
};
export default Layout;
