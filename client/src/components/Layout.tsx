import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div id="wrapper" className="d-flex">
            <Sidebar />
            <div id="content-wrapper" className="d-flex flex-column w-100">
                <div id="content">
                    <Topbar />
                    <div className="container-fluid">
                        {children}
                    </div>
                </div>
                <footer className="sticky-footer bg-white">
                    <div className="container my-auto">
                        <div className="copyright text-center my-auto">
                            <span>Copyright &copy; Your Website 2025</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default Layout;
