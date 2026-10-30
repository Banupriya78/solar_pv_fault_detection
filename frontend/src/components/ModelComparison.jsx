import React, { useState, useEffect } from 'react';
import { GitCompare, Cpu, HardDrive, Timer, CheckCircle, BarChart2, Award, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { fetchModelComparison } from '../api';

const FAULT_NAMES = ['Normal', 'Short-Circ', 'Degradation', 'Open-Circ', 'Shadowing'];

export default function ModelComparison() {
  const [comparison, setComparison] = useState(null);
  const [selectedMatrixModel, setSelectedMatrixModel] = useState('random_forest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchModelComparison();
        setComparison(data);
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
          Loading Benchmark Evaluation Results...
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Comparing Decision Tree, Random Forest, and SVM on held-out test split
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="alert-banner danger">
        <div>Failed to load model comparison: {error}</div>
      </div>
    );
  }

  const models = comparison.models;
  const dt = models.decision_tree;
  const rf = models.random_forest;
  const svm = models.svm;

  const chartMetrics = [
    {
      metric: 'Accuracy',
      'Decision Tree': Math.round(dt.accuracy * 1000) / 10,
      'Random Forest': Math.round(rf.accuracy * 1000) / 10,
      'SVM (RBF)': Math.round(svm.accuracy * 1000) / 10,
    },
    {
      metric: 'Precision (Macro)',
      'Decision Tree': Math.round(dt.precision * 1000) / 10,
      'Random Forest': Math.round(rf.precision * 1000) / 10,
      'SVM (RBF)': Math.round(svm.precision * 1000) / 10,
    },
    {
      metric: 'Recall (Macro)',
      'Decision Tree': Math.round(dt.recall * 1000) / 10,
      'Random Forest': Math.round(rf.recall * 1000) / 10,
      'SVM (RBF)': Math.round(svm.recall * 1000) / 10,
    },
    {
      metric: 'Macro-F1',
      'Decision Tree': Math.round(dt.macro_f1 * 1000) / 10,
      'Random Forest': Math.round(rf.macro_f1 * 1000) / 10,
      'SVM (RBF)': Math.round(svm.macro_f1 * 1000) / 10,
    },
  ];

  const currentModelForMatrix = models[selectedMatrixModel] || rf;
  const confMatrix = currentModelForMatrix?.confusion_matrix || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Leakage-safe methodology badge */}
      <div className="alert-banner info">
        <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Leakage-Safe Academic Methodology:</strong> All models were trained and benchmarked strictly using a stratified 80/20 train/test partition (Held-Out Test Set: <strong>{comparison.dataset_info?.test_samples?.toLocaleString()} samples</strong>). Feature scalers were fitted exclusively on training data to guarantee zero optimistic evaluation bias.
        </div>
      </div>

      {/* Model Benchmark Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Decision Tree Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Decision Tree</h3>
            <span className="winner-pill">Fastest Inference</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Macro F1-Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                {(dt.macro_f1 * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Test Accuracy</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                {(dt.accuracy * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inference Latency</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {dt.inference_latency_ms} ms
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Disk Size</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {dt.model_size_kb} KB
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Single interpretable tree. Ultra-compact footprint suited for low-power edge microcontrollers.
          </div>
        </div>

        {/* Random Forest Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Random Forest (100 Trees)</h3>
            <span className="winner-pill">Highest Macro-F1</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Macro F1-Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                {(rf.macro_f1 * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Test Accuracy</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                {(rf.accuracy * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inference Latency</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {rf.inference_latency_ms} ms
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Disk Size</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {rf.model_size_kb.toLocaleString()} KB
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Ensemble of 100 decorrelated trees. Superior generalization and noise resistance on complex irradiance shifts.
          </div>
        </div>

        {/* Support Vector Machine Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem' }}>SVM (RBF Kernel)</h3>
            <span className="winner-pill">Compact Non-Linear</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Macro F1-Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                {(svm.macro_f1 * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Test Accuracy</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                {(svm.accuracy * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inference Latency</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {svm.inference_latency_ms} ms
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Disk Size</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {svm.model_size_kb} KB
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Support Vector Machine with Radial Basis Function kernel and Platt scaling calibrated probabilities.
          </div>
        </div>
      </div>

      {/* Comparative Metrics Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>Measured Quantitative Performance Table</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Exact metrics computed on the test partition without rounding artifacts.
        </p>
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Model Architecture</th>
                <th>Accuracy</th>
                <th>Precision (Macro)</th>
                <th>Recall (Macro)</th>
                <th>Macro-F1</th>
                <th>Model File Size</th>
                <th>Inference Latency</th>
                <th>Training Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Decision Tree</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(dt.accuracy * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(dt.precision * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(dt.recall * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fbbf24' }}>{(dt.macro_f1 * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{dt.model_size_kb} KB</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 600 }}>{dt.inference_latency_ms} ms</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{dt.training_time_seconds} s</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Random Forest</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(rf.accuracy * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(rf.precision * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(rf.recall * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fbbf24' }}>{(rf.macro_f1 * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{rf.model_size_kb.toLocaleString()} KB</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{rf.inference_latency_ms} ms</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{rf.training_time_seconds} s</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Support Vector Machine (RBF)</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(svm.accuracy * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(svm.precision * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{(svm.recall * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fbbf24' }}>{(svm.macro_f1 * 100).toFixed(2)}%</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{svm.model_size_kb} KB</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{svm.inference_latency_ms} ms</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{svm.training_time_seconds} s</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recharts Bar Chart Comparison & Confusion Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {/* Metric Bar Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Performance Comparison (%)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Benchmarking Accuracy, Precision, Recall and Macro-F1 across models.
          </p>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={chartMetrics} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[95, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="custom-chart-tooltip">
                          <div className="custom-chart-tooltip-title">{label}</div>
                          {payload.map((p, idx) => (
                            <div key={idx} style={{ color: p.color, fontSize: '0.8rem', margin: '2px 0' }}>
                              {p.name}: <strong>{p.value}%</strong>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Decision Tree" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Random Forest" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="SVM (RBF)" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confusion Matrix Viewer */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>5×5 Confusion Matrix</h3>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['decision_tree', 'random_forest', 'svm'].map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedMatrixModel(key)}
                  className={`btn-secondary ${selectedMatrixModel === key ? 'active' : ''}`}
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.75rem',
                    background: selectedMatrixModel === key ? 'var(--solar-gold)' : undefined,
                    color: selectedMatrixModel === key ? '#070b14' : undefined,
                    fontWeight: selectedMatrixModel === key ? 700 : 500
                  }}
                >
                  {key === 'decision_tree' ? 'Decision Tree' : key === 'random_forest' ? 'Random Forest' : 'SVM'}
                </button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Held-out test set classification matrix for <strong>{currentModelForMatrix.name}</strong>. Diagonal entries represent true positives.
          </p>

          <table className="matrix-table">
            <thead>
              <tr>
                <th className="matrix-th">True \ Pred</th>
                {FAULT_NAMES.map((name, i) => (
                  <th key={i} className="matrix-th">{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {confMatrix.map((row, trueIdx) => (
                <tr key={trueIdx}>
                  <td className="matrix-th" style={{ textAlign: 'left', fontWeight: 600 }}>{FAULT_NAMES[trueIdx]}</td>
                  {row.map((val, predIdx) => {
                    const isDiagonal = trueIdx === predIdx;
                    const cellClass = isDiagonal ? 'diagonal' : val > 0 ? 'off-error' : 'off-zero';
                    return (
                      <td key={predIdx} className={`matrix-cell ${cellClass}`}>
                        {val.toLocaleString()}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
