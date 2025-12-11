import React, { ReactNode } from 'react';

import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './layout.css';


interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div id="wrapper" className="d-flex">
            <Sidebar />
            <div id="content-wrapper" className="d-flex flex-column w-100">
                <Topbar />
                <div id="content" style={{ flex: 1 }}>
                    <div style={{background: '#f9fafb'}} className="container-fluid app-container" > 
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Layout;
