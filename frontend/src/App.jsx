import React, { useState, useEffect } from 'react';
import { Calendar, Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import FaultPrediction from './components/FaultPrediction';
import DiagnosisHistory from './components/DiagnosisHistory';
import MaintenanceReportsPage from './components/MaintenanceReportsPage';
import { fetchHealth, fetchPredictionSummary } from './api';

export function formatTimestamp(ts) {
  if (!ts) return null;
  try {
    const clean = ts.replace(' UTC', 'Z').replace(' ', 'T');
    const d = new Date(clean.endsWith('Z') ? clean : clean + 'Z');
    if (isNaN(d.getTime())) return ts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getUTCDate();
    const month = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${mins} UTC`;
  } catch {
    return ts;
  }
}

export default function App() {
  const [activePage, setActivePage] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('prediction') || path.includes('fault')) return 'prediction';
      if (path.includes('history')) return 'history';
      if (path.includes('report')) return 'reports';
      if (path.includes('dashboard')) return 'dashboard';
    }
    return 'dashboard';
  });

  const [backendStatus, setBackendStatus] = useState(false);
  const [lastPredictionTime, setLastPredictionTime] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Synchronize URL and title
  useEffect(() => {
    const pageTitles = {
      dashboard: 'PV Monitor - Dashboard',
      prediction: 'PV Monitor - Fault Prediction',
      history: 'PV Monitor - Diagnosis History',
      reports: 'PV Monitor - Maintenance Reports'
    };
    document.title = pageTitles[activePage] || 'PV Monitor';

    const pathMap = {
      dashboard: '/dashboard',
      prediction: '/fault-prediction',
      history: '/history',
      reports: '/reports'
    };
    const targetPath = pathMap[activePage] || '/dashboard';
    if (window.location.pathname !== targetPath) {
      window.history.replaceState(null, '', targetPath);
    }
  }, [activePage]);

  // Initial and periodic health check
  useEffect(() => {
    async function checkHealthAndSummary() {
      try {
        const health = await fetchHealth();
        setBackendStatus(health && health.status === 'healthy');
      } catch {
        setBackendStatus(false);
      }

      try {
        const summary = await fetchPredictionSummary();
        if (summary && summary.last_prediction_time) {
          setLastPredictionTime(summary.last_prediction_time);
        }
      } catch {
        // keep prior timestamp
      }
    }

    checkHealthAndSummary();
    const interval = setInterval(checkHealthAndSummary, 15000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const handlePredictionSuccess = (pred) => {
    if (pred && pred.timestamp) {
      setLastPredictionTime(pred.timestamp);
    }
    setRefreshKey(prev => prev + 1);
  };

  const pageHeaders = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Diagnose PV faults from panel telemetry and monitor array health'
    },
    prediction: {
      title: 'Solar PV Fault Prediction',
      subtitle: 'Enter panel voltage, current, and environmental telemetry to diagnose system health'
    },
    history: {
      title: 'Diagnosis History',
      subtitle: 'Review complete history of previous predictions, timestamps, fault types, and confidence'
    },
    reports: {
      title: 'Maintenance Reports',
      subtitle: 'Generate, inspect, and download technical maintenance reports for array diagnoses'
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const formattedTimestamp = formatTimestamp(lastPredictionTime);

  return (
    <div className="app-shell">
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={(page) => {
          setActivePage(page);
          setSidebarOpen(false);
        }}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Body */}
      <div className="main-wrapper">
        {/* Top Header Bar for all pages */}
        <header className="app-header">
          <div className="header-content-left" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 style={{ 
                fontSize: '1.4rem', 
                fontWeight: 700, 
                color: '#0f172a', 
                letterSpacing: '-0.02em', 
                margin: 0, 
                fontFamily: 'var(--font-heading)',
                lineHeight: 1.2
              }}>
                {pageHeaders[activePage]?.title || 'PV Monitor'}
              </h1>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>
                {pageHeaders[activePage]?.subtitle || ''}
              </div>
            </div>
          </div>

          <div className="header-badge-wrapper">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              color: '#1e40af', 
              fontSize: '0.82rem', 
              fontWeight: 500,
              background: '#eff6ff',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              whiteSpace: 'nowrap'
            }}>
              <Calendar size={15} color="#2563eb" />
              <span>
                {formattedTimestamp 
                  ? `Last diagnosis: ${formattedTimestamp}` 
                  : 'Last diagnosis: 26 Oct 2026, 16:21 UTC'}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body">
          {activePage === 'dashboard' && (
            <Dashboard 
              setActivePage={setActivePage} 
              lastPredictionTime={lastPredictionTime}
              refreshKey={refreshKey}
              onPredictionUpdate={(ts) => setLastPredictionTime(ts)}
            />
          )}
          {activePage === 'prediction' && (
            <FaultPrediction 
              onPredictionSuccess={handlePredictionSuccess}
            />
          )}
          {activePage === 'history' && (
            <DiagnosisHistory />
          )}
          {activePage === 'reports' && (
            <MaintenanceReportsPage />
          )}
        </main>
      </div>
    </div>
  );
}
