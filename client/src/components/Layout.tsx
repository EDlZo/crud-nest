import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';


interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div id="wrapper" className="d-flex">
            <Sidebar />
            <div id="content-wrapper" className="d-flex flex-column w-100">
                <div id="content">
                    <div className="container-fluid pt-4">
                        {children}
                    </div>
                </div>
                <footer className="sticky-footer bg-white">
                    <div className="container my-auto">
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default Layout;
