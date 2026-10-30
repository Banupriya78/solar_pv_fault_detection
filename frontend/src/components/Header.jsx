import React from 'react';
import { Sun, Activity, Database, GitCompare, BarChart3, ShieldAlert } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, backendStatus, activeModel }) {
  const tabs = [
    { id: 'prediction', label: 'Fault Prediction', icon: ShieldAlert },
    { id: 'comparison', label: 'Model Comparison', icon: GitCompare },
    { id: 'overview', label: 'Dataset Overview', icon: Database },
    { id: 'features', label: 'Feature Importance', icon: BarChart3 },
  ];

  return (
    <header className="header-wrapper">
      <div className="header-top">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <Sun size={28} />
          </div>
          <div>
            <h1 className="brand-title">Solar PV Health Monitoring & Fault Classification</h1>
            <div className="brand-subtitle">
              <span>Lightweight ML Software Simulation</span>
              <span className="academic-badge">Final-Year Academic Project</span>
              <span className="academic-badge">UTFPR / Lazzaretti Testbed</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="system-status">
            <div className="status-dot" style={{ backgroundColor: backendStatus ? '#10b981' : '#ef4444', boxShadow: backendStatus ? '0 0 8px #10b981' : '0 0 8px #ef4444' }}></div>
            <span>{backendStatus ? 'System Online' : 'Connecting...'}</span>
          </div>
        </div>
      </div>

      <nav className="nav-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
