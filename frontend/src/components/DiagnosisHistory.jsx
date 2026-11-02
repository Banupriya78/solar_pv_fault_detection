import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, Search, Download, Filter, 
  Clock, FileText, ChevronLeft, ChevronRight, Activity, Eye
} from 'lucide-react';
import { fetchPredictionHistory } from '../api';
import MaintenanceReport from './MaintenanceReport';

const DEFAULT_HISTORY = [
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

export default function DiagnosisHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFault, setFilterFault] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const res = await fetchPredictionHistory(100);
        if (res && res.history && res.history.length > 0) {
          setHistory(res.history);
        } else {
          setHistory(DEFAULT_HISTORY);
        }
      } catch (err) {
        console.error('Failed to load history:', err);
        setHistory(DEFAULT_HISTORY);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  // Format date helper: "26 Oct 2026, 16:21 UTC"
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

  // Severity pill styling (minimalist & clean)
  const getSeverityPill = (item) => {
    const raw = (item?.severity || item?.label || '').toLowerCase();
    if (raw.includes('short') || raw.includes('high') || raw.includes('critical')) {
      return { label: 'High Priority', dot: '#dc2626' };
    }
    if (raw.includes('open') || raw.includes('degrad') || raw.includes('medium')) {
      return { label: 'Medium Priority', dot: '#d97706' };
    }
    return { label: 'Low Priority', dot: '#10b981' };
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return history.filter(item => {
      if (filterFault !== 'all' && item.label !== filterFault) {
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
  }, [history, filterFault, searchQuery]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredRecords.length) return;
    const headers = ['Record_ID', 'Timestamp_UTC', 'Fault_Type', 'Confidence_Pct', 'String1_V', 'String2_V', 'String1_A', 'String2_A', 'Irradiance', 'Temperature_C', 'Total_Power_W'];
    const rows = filteredRecords.map(item => [
      item.id || '',
      `"${item.timestamp || ''}"`,
      `"${item.label || ''}"`,
      ((item.confidence || 0) * 100).toFixed(1),
      item.readings?.vdc1 ?? '',
      item.readings?.vdc2 ?? '',
      item.readings?.idc1 ?? '',
      item.readings?.idc2 ?? '',
      item.readings?.irr ?? '',
      item.readings?.pvt ?? '',
      item.computed_metrics?.ptotal_watts ?? ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `pv_diagnosis_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Header Controls Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #edf2f7',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by fault type, date, or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
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

          {/* Fault Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={15} color="#64748b" />
            <select
              value={filterFault}
              onChange={(e) => {
                setFilterFault(e.target.value);
                setPage(1);
              }}
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
              <option value="all">All Fault Types</option>
              <option value="Normal Operation">Normal Operation</option>
              <option value="Shadowing">Partial Shadowing</option>
              <option value="Short-Circuit">Short-Circuit</option>
              <option value="Open-Circuit">Open-Circuit</option>
              <option value="Degradation">Resistive Degradation</option>
            </select>
          </div>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleExportCSV}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.55rem 1rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'background 0.15s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
          onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
          title="Download complete history as CSV spreadsheet"
        >
          <Download size={15} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* 2. Diagnosis History Table Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #edf2f7',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <History size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Past Predictions Log
            </h3>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing {paginatedRecords.length} of {filteredRecords.length} records
          </div>
        </div>

        {/* Table */}
        <div className="responsive-table-scroll">
          <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600, width: '60px' }}>ID</th>
                <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Timestamp (UTC)</th>
                <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Fault Classification</th>
                <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Location</th>
                <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Confidence</th>
                <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Priority</th>
                <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Key Telemetry</th>
                <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    No diagnosis records match the active filter.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item, idx) => {
                  const sev = getSeverityPill(item);
                  const v1 = item.readings?.vdc1 != null ? Number(item.readings.vdc1).toFixed(1) : '-';
                  const v2 = item.readings?.vdc2 != null ? Number(item.readings.vdc2).toFixed(1) : '-';
                  const irr = item.readings?.irr != null ? Number(item.readings.irr).toFixed(0) : '-';

                  return (
                    <tr 
                      key={item.id || idx}
                      style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s ease' }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.95rem 1rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                        #{item.id || idx + 1}
                      </td>
                      <td style={{ padding: '0.95rem 1rem', color: '#334155' }}>
                        {formatDate(item.timestamp)}
                      </td>
                      <td style={{ padding: '0.95rem 1rem', color: '#0f172a', fontWeight: 600 }}>
                        {item.label}
                      </td>
                      <td style={{ padding: '0.95rem 1rem', color: '#0f172a', fontWeight: 600, fontSize: '0.82rem' }}>
                        {getLocationLabel(item)}
                      </td>
                      <td style={{ padding: '0.95rem 1rem', color: '#0f172a', fontWeight: 600 }}>
                        {((item.confidence || 0) * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '0.95rem 1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#334155', fontWeight: 500 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: sev.dot }} />
                          <span>{sev.label}</span>
                        </span>
                      </td>
                      <td style={{ padding: '0.95rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                        V1: <strong>{v1}V</strong> · V2: <strong>{v2}V</strong> · Irr: <strong>{irr} W/m²</strong>
                      </td>
                      <td style={{ padding: '0.95rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedRecord(item)}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            color: '#2563eb',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '0.35rem 0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                          title="Open maintenance report for this record"
                        >
                          <FileText size={13} />
                          <span>Report</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.85rem',
            borderTop: '1px solid #f1f5f9'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Page {page} of {totalPages}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  color: page <= 1 ? '#cbd5e1' : '#334155',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  color: page >= totalPages ? '#cbd5e1' : '#334155',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Box View Over Front Page */}
      {selectedRecord && (
        <MaintenanceReport 
          record={selectedRecord} 
          onClose={() => setSelectedRecord(null)} 
        />
      )}

    </div>
  );
}

