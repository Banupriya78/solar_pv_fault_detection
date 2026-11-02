import React from 'react';
import { Home, Zap, Sun, History, FileText, X } from 'lucide-react';

export default function Sidebar({ 
  activePage, 
  setActivePage,
  sidebarOpen,
  setSidebarOpen
}) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'prediction', label: 'Fault Prediction', icon: Zap },
    { id: 'history', label: 'Diagnosis History', icon: History },
    { id: 'reports', label: 'Maintenance Reports', icon: FileText },
  ];

  return (
    <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
      {/* Upper-Left Project Name Branding + Mobile Close Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.25rem 0.5rem 1.25rem 0.5rem',
        marginBottom: '0.85rem',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            background: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sun size={22} color="#2563eb" />
          </div>
          <div>
            <div style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0f172a',
              fontFamily: 'var(--font-heading)',
              lineHeight: 1.2
            }}>
              PV Monitor
            </div>
            <div style={{
              fontSize: '0.72rem',
              color: '#64748b',
              marginTop: '2px'
            }}>
              Solar PV Fault Detection
            </div>
          </div>
        </div>

        {/* Close Button on Mobile Drawer */}
        <button
          type="button"
          onClick={() => setSidebarOpen && setSidebarOpen(false)}
          className="mobile-close-btn"
          aria-label="Close navigation sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id);
                if (setSidebarOpen) setSidebarOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                width: '100%',
                background: isActive ? '#e0f2fe' : 'transparent',
                color: isActive ? '#0284c7' : '#475569',
                borderRadius: '12px',
                border: 'none',
                padding: '0.75rem 1rem',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.92rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#0f172a';
                }
              }}
              onMouseOut={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#475569';
                }
              }}
            >
              <Icon 
                size={20} 
                color={isActive ? '#0284c7' : '#64748b'} 
                strokeWidth={isActive ? 2.2 : 1.8} 
                style={{ flexShrink: 0 }} 
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
