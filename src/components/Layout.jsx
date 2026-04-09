import React from 'react';
import { FolderTree, Map, Code2, Zap } from 'lucide-react';

const Layout = ({ children }) => {
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Code2 className="text-accent-primary" size={28} />
          <span>ADS Route Gen</span>
        </div>
        
        <nav className="nav-links">
          <div className="nav-button active" style={{ cursor: 'default' }}>
            <Map size={20} />
            Route Optimization
          </div>
        </nav>

        <div className="mt-auto" style={{ marginTop: 'auto' }}>
          <div className="card" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Zap size={20} style={{ color: 'var(--accent-warning)' }} />
            <div style={{ fontSize: '0.875rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Premium Demo</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Prim's Algorithm</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <h2 style={{ fontSize: '1.25rem' }}>
            Delivery Route via Prim's Algorithm
          </h2>
        </header>

        <div className="workspace">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
