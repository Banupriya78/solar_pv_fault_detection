import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Search, Printer, Filter, 
  Calendar, CheckCircle2, ShieldAlert, Wrench, Eye
} from 'lucide-react';
import { fetchPredictionHistory } from '../api';
import MaintenanceReport from './MaintenanceReport';

const DEFAULT_REPORTS = [
  { 
    id: 1259, 
    timestamp: '2026-10-26 16:21:00 UTC', 
    label: 'Shadowing', 
    confidence: 0.474, 
    severity: 'Low',
    readings: { vdc1: 352.75, vdc2: 346.89, idc1: 0.23, idc2: 0.06, irr: 42.0, pvt: 6.22 },
    computed_metrics: { p1_watts: 81.1, p2_watts: 20.8, ptotal_watts: 101.9, voltage_difference_v: 5.86, current_difference_a: 0.17 }
  },
  { 
    id: 1258, 
    timestamp: '2026-10-25 11:03:00 UTC', 
    label: 'Open-Circuit', 
    confidence: 0.621, 
    severity: 'Medium',
    readings: { vdc1: 1.65, vdc2: 274.24, idc1: 0.11, idc2: 8.92, irr: 995.9, pvt: 45.2 },
    computed_metrics: { p1_watts: 0.2, p2_watts: 2446.2, ptotal_watts: 2446.4, voltage_difference_v: 272.6, current_difference_a: 8.81 }
  },
  { 
    id: 1257, 
    timestamp: '2026-10-24 09:17:00 UTC', 
    label: 'Short-Circuit', 
    confidence: 0.713, 
    severity: 'High',
    readings: { vdc1: 263.31, vdc2: 205.91, idc1: 9.32, idc2: 8.98, irr: 989.8, pvt: 43.1 },
    computed_metrics: { p1_watts: 2454.1, p2_watts: 1849.1, ptotal_watts: 4303.1, voltage_difference_v: 57.4, current_difference_a: 0.34 }
  },
  { 
    id: 1256, 
    timestamp: '2026-10-23 14:52:00 UTC', 
    label: 'Degradation', 
    confidence: 0.587, 
    severity: 'Medium',
    readings: { vdc1: 265.38, vdc2: 267.28, idc1: 7.58, idc2: 6.18, irr: 804.1, pvt: 47.0 },
    computed_metrics: { p1_watts: 2011.6, p2_watts: 1651.8, ptotal_watts: 3663.4, voltage_difference_v: 1.9, current_difference_a: 1.40 }
  },
  { 
    id: 1255, 
    timestamp: '2026-10-22 12:15:00 UTC', 
    label: 'Normal Operation', 
    confidence: 1.000, 
    severity: 'Low',
    readings: { vdc1: 291.54, vdc2: 291.92, idc1: 7.01, idc2: 7.00, irr: 831.9, pvt: 22.1 },
    computed_metrics: { p1_watts: 2043.7, p2_watts: 2043.4, ptotal_watts: 4087.1, voltage_difference_v: 0.38, current_difference_a: 0.01 }
  }
];

export default function MaintenanceReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [activeModalReport, setActiveModalReport] = useState(null);

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const res = await fetchPredictionHistory(100);
        if (res && res.history && res.history.length > 0) {
          setReports(res.history);
        } else {
          setReports(DEFAULT_REPORTS);
        }
      } catch (err) {
        console.error('Failed to load reports:', err);
        setReports(DEFAULT_REPORTS);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const formatDate = (ts) => {
    if (!ts) return '26 Oct 2026, 16:21 UTC';
    try {
      const clean = ts.replace(' UTC', 'Z').replace(' ', 'T');
      const d = new Date(clean.endsWith('Z') ? clean : clean + 'Z');
      if (isNaN(d.getTime())) return ts;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
    } catch {
      return ts;
    }
  };

  const getPriorityInfo = (item) => {
    const raw = (item?.severity || item?.label || '').toLowerCase();
    if (raw.includes('short') || raw.includes('high') || raw.includes('critical')) {
      return { priority: 'high', label: 'High Priority', dot: '#dc2626' };
    }
    if (raw.includes('open') || raw.includes('degrad') || raw.includes('medium')) {
      return { priority: 'medium', label: 'Medium Priority', dot: '#d97706' };
    }
    return { priority: 'low', label: 'Low Priority', dot: '#10b981' };
  };

  const getLocationLabel = (item) => {
    if (item?.fault_location) return item.fault_location;
    if (item?.class_id === 0 || item?.label === 'Normal Operation') return 'All Lines Healthy';
    const v1 = Number(item?.readings?.vdc1 || 0);
    const v2 = Number(item?.readings?.vdc2 || 0);
    const i1 = Number(item?.readings?.idc1 || 0);
    const i2 = Number(item?.readings?.idc2 || 0);
    if (v1 < v2 - 8.0) return 'Panel Line 1';
    if (v2 < v1 - 8.0) return 'Panel Line 2';
    if (i1 < i2 - 0.4) return 'Panel Line 1';
    if (i2 < i1 - 0.4) return 'Panel Line 2';
    return 'Panel Line 1';
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(item => {
      const pInfo = getPriorityInfo(item);
      if (filterPriority !== 'all' && pInfo.priority !== filterPriority) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.label?.toLowerCase().includes(q) ||
          item.timestamp?.toLowerCase().includes(q) ||
          String(item.id || '').includes(q)
        );
      }
      return true;
    });
  }, [reports, filterPriority, searchQuery]);

  // Counts
  const highCount = reports.filter(r => getPriorityInfo(r).priority === 'high').length;
  const mediumCount = reports.filter(r => getPriorityInfo(r).priority === 'medium').length;
  const lowCount = reports.filter(r => getPriorityInfo(r).priority === 'low').length;

  const handlePrintReport = (reportItem) => {
    setActiveModalReport(reportItem);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Stat Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.25rem'
      }}>
        <div style={{ background: '#ffffff', border: '1px solid #edf2f7', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>Total Reports Generated</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0' }}>{reports.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Technical maintenance logs</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #edf2f7', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>High Priority (Immediate)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#dc2626', margin: '0.2rem 0' }}>{highCount}</div>
          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Short-circuit or hazards</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #edf2f7', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>Medium Priority</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#d97706', margin: '0.2rem 0' }}>{mediumCount}</div>
          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Degradation & open circuits</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #edf2f7', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>Routine / Healthy</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10b981', margin: '0.2rem 0' }}>{lowCount}</div>
          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Normal operation & shadowing</div>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #edf2f7',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search reports by condition or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem 0.55rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                outline: 'none',
                color: '#0f172a',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} color="#64748b" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#334155',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
          {filteredReports.length} Reports Ready for Download
        </div>
      </div>

      {/* 3. Reports Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
        gap: '1.25rem'
      }}>
        {filteredReports.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', background: '#ffffff', borderRadius: '16px', padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b', border: '1px solid #edf2f7' }}>
            No maintenance reports match your search query.
          </div>
        ) : (
          filteredReports.map((item, idx) => {
            const pInfo = getPriorityInfo(item);
            const v1 = item.readings?.vdc1 != null ? Number(item.readings.vdc1).toFixed(1) : '291.5';
            const v2 = item.readings?.vdc2 != null ? Number(item.readings.vdc2).toFixed(1) : '291.9';
            const ptotal = item.computed_metrics?.ptotal_watts != null ? Number(item.computed_metrics.ptotal_watts).toFixed(0) : '4087';

            return (
              <div 
                key={item.id || idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid #edf2f7',
                  borderRadius: '16px',
                  padding: '1.35rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.95rem',
                  transition: 'border-color 0.15s ease'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} color="#2563eb" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      Report #{item.id || idx + 1}
                    </span>
                  </div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#334155',
                    background: '#f8fafc',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: pInfo.dot }} />
                    <span>{pInfo.label}</span>
                  </span>
                </div>

                {/* Condition, Location & Timestamp */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '2px 0' }}>
                      {item.label}
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: item.label === 'Normal Operation' ? '#10b981' : '#2563eb' }}>
                      {getLocationLabel(item)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Calendar size={13} color="#64748b" />
                    <span>{formatDate(item.timestamp)}</span>
                  </div>
                </div>

                {/* Telemetry Strip */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  fontSize: '0.72rem',
                  color: '#64748b'
                }}>
                  <div>
                    <span>Line 1</span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.82rem', marginTop: '1px' }}>{v1} V</strong>
                  </div>
                  <div>
                    <span>Line 2</span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.82rem', marginTop: '1px' }}>{v2} V</strong>
                  </div>
                  <div>
                    <span>Power</span>
                    <strong style={{ display: 'block', color: '#2563eb', fontSize: '0.82rem', marginTop: '1px' }}>{ptotal} W</strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.65rem', marginTop: 'auto', paddingTop: '0.45rem' }}>
                  <button
                    onClick={() => setActiveModalReport(item)}
                    style={{
                      flex: 1,
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
                    }}
                    title="Generate and view report modal"
                  >
                    <Eye size={14} />
                    <span>View Report</span>
                  </button>

                  <button
                    onClick={() => handlePrintReport(item)}
                    style={{
                      background: '#ffffff',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.5rem 0.85rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                    title="Download or Print PDF"
                  >
                    <Printer size={14} />
                    <span>Print PDF</span>
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Modal Box View Over Front Page */}
      {activeModalReport && (
        <MaintenanceReport 
          record={activeModalReport} 
          onClose={() => setActiveModalReport(null)} 
        />
      )}

    </div>
  );
}

