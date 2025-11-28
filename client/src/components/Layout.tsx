import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';


interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div id="wrapper" className="d-flex">
            <Sidebar />
            <div id="content-wrapper" className="d-flex flex-column w-100" style={{ backgroundColor: '#f8f9fc' }}>
                <div id="content" style={{ flex: 1 }}>
                    <div className="container-fluid" style={{ padding: '1.5rem' }}>
                        {children}
                    </div>
                </div>
                <footer className="sticky-footer bg-white">
                    <div className="container my-auto">
                        <div className="text-center my-auto">
                            <span className="text-muted small">Copyright &copy; Your Website 2024</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default Layout;
