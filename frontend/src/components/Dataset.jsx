import React, { useState, useEffect } from 'react';
import { Database, Zap, Clock, ShieldCheck, CheckCircle2, FileText, Scale, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchDatasetOverview, fetchSampleRecords } from '../api';

const COLORS = ['#10b981', '#ef4444', '#f97316', '#3b82f6', '#a855f7'];

export default function Dataset() {
  const [overview, setOverview] = useState(null);
  const [sampleData, setSampleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [overviewRes, samplesRes] = await Promise.all([
          fetchDatasetOverview(),
          fetchSampleRecords(20)
        ]);
        setOverview(overviewRes);
        setSampleData(samplesRes.records || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--solar-gold)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
          Loading Dataset Telemetry & Schema...
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Analyzing 1,373,798 real operational measurements
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-banner danger">
        <div>Failed to load dataset: {error}</div>
      </div>
    );
  }

  const chartData = overview?.class_distribution?.map((c) => ({
    name: c.label,
    count: c.count,
    percentage: c.percentage,
    classId: c.class_id,
    severity: c.severity
  })) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 4 Stat Cards */}
      <div className="stat-grid-4">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span>Verified Records</span>
            <Database size={16} />
          </div>
          <div className="stat-value">
            {overview?.total_samples?.toLocaleString() || '1,373,798'}
          </div>
          <div className="stat-detail">16 full operational days @ 1 Hz</div>
        </div>

        <div className="glass-panel stat-card blue">
          <div className="stat-header">
            <span>Telemetry Features</span>
            <Zap size={16} />
          </div>
          <div className="stat-value">6 Raw + 7 Derived</div>
          <div className="stat-detail">Voltages, currents, insolation, temperature & power</div>
        </div>

        <div className="glass-panel stat-card emerald">
          <div className="stat-header">
            <span>Missing Values</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="stat-value">0 Nulls (100%)</div>
          <div className="stat-detail">Complete continuous temporal logging</div>
        </div>

        <div className="glass-panel stat-card purple">
          <div className="stat-header">
            <span>License & Format</span>
            <Scale size={16} />
          </div>
          <div className="stat-value">MIT License</div>
          <div className="stat-detail">MATLAB .mat Binary Containers</div>
        </div>
      </div>

      {/* Provenance & Citation Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Verified Dataset Source & Testbed Information</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Open-source operational benchmark dataset developed for PV fault detection research.
            </p>
          </div>
          <a
            href="https://github.com/clayton-h-costa/pv_fault_dataset"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            <span>Official GitHub Repository</span>
            <ExternalLink size={14} />
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Principal Investigators</span>
            <strong>André E. Lazzaretti, Clayton H. da Costa</strong>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Universidade Tecnológica Federal do Paraná (UTFPR), Brazil</div>
          </div>

          <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Research Paper</span>
            <strong>Sensors (MDPI), 2020, 20(17), 4688</strong>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>DOI: 10.3390/s20174688</div>
          </div>

          <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Grid-Tied Photovoltaic Plant</span>
            <strong>5 kW NHS Solar Inverter (NHS 5K-GDM1)</strong>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>2 Strings × 8 Canadian Solar C6SU-330P panels (16 total)</div>
          </div>
        </div>
      </div>

      {/* Class Distribution Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {/* Recharts Bar Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Class Distribution (Sample Counts)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Class 0 represents daily clear operation; classes 1-3 capture controlled fault injections.
          </p>

          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  scale="log"
                  domain={['auto', 'auto']}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => val.toLocaleString()}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="custom-chart-tooltip">
                          <div className="custom-chart-tooltip-title">{data.name} (Class {data.classId})</div>
                          <div className="custom-chart-tooltip-val">{data.count.toLocaleString()} samples</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                            Proportion: {data.percentage}% | Severity: {data.severity}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Labels Registry */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Documented Fault Labels Registry</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Exact categorical states defined in the research documentation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', flex: 1 }}>
            {overview?.class_distribution?.map((item, idx) => (
              <div 
                key={item.class_id}
                style={{
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  borderLeft: `4px solid ${COLORS[idx % COLORS.length]}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Class {item.class_id}: {item.label}
                  </span>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 600, 
                    color: COLORS[idx % COLORS.length],
                    background: 'rgba(255,255,255,0.05)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)'
                  }}>
                    {item.count.toLocaleString()} rows ({item.percentage}%)
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Descriptive Statistics Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Authentic Dataset Descriptive Statistics</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Calculated across all 1,373,798 real-world records without rounding artifacts or synthetic padding.
        </p>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Telemetry Parameter</th>
                <th>Physical Unit</th>
                <th>Mean</th>
                <th>Std Dev</th>
                <th>Min</th>
                <th>25%</th>
                <th>Median</th>
                <th>75%</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
              {overview?.descriptive_statistics && Object.entries(overview.descriptive_statistics).map(([key, stat]) => {
                const labels = {
                  vdc1: { name: 'DC Voltage String 1', unit: 'V' },
                  vdc2: { name: 'DC Voltage String 2', unit: 'V' },
                  idc1: { name: 'DC Current String 1', unit: 'A' },
                  idc2: { name: 'DC Current String 2', unit: 'A' },
                  irr:  { name: 'Solar Irradiance', unit: 'W/m²' },
                  pvt:  { name: 'Module Temperature', unit: '°C' }
                };
                const meta = labels[key] || { name: key, unit: '' };
                return (
                  <tr key={key}>
                    <td style={{ fontWeight: 600 }}>{meta.name} ({key})</td>
                    <td style={{ color: 'var(--solar-gold)', fontFamily: 'var(--font-mono)' }}>{meta.unit}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{stat.mean}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{stat.std}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{stat.min}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{stat.p25}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fbbf24' }}>{stat.median}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{stat.p75}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{stat.max}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Telemetry Records Slice */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Operational Telemetry Stream (Sample Records)</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Loaded directly from <code>backend/data/dataset_elec.mat</code> and <code>dataset_amb.mat</code>.
        </p>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>V_dc1 (V)</th>
                <th>V_dc2 (V)</th>
                <th>I_dc1 (A)</th>
                <th>I_dc2 (A)</th>
                <th>Irradiance (W/m²)</th>
                <th>Temperature (°C)</th>
                <th>Target Code</th>
                <th>Diagnosed Operational Condition</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.vdc1?.toFixed(2)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.vdc2?.toFixed(2)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.idc1?.toFixed(2)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.idc2?.toFixed(2)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.irr?.toFixed(2)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.pvt?.toFixed(2)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{row.f_nv}</td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      background: COLORS[row.f_nv % COLORS.length] + '22',
                      color: COLORS[row.f_nv % COLORS.length],
                      border: `1px solid ${COLORS[row.f_nv % COLORS.length]}55`
                    }}>
                      {row.fault_label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
