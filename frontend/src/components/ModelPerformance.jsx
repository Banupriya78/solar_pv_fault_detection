import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitCompare, Cpu, HardDrive, Timer, CheckCircle, 
  BarChart2, Award, Info, Layers, CheckCircle2, ShieldCheck, 
  ExternalLink, Sparkles, BookOpen, ArrowRight, Grid3X3, Eye
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Legend, Cell, CartesianGrid 
} from 'recharts';
import { fetchModelComparison, fetchFeatureImportance } from '../api';

const FAULT_NAMES = ['Normal', 'Short-Circ', 'Degradation', 'Open-Circ', 'Shadowing'];
const FULL_FAULT_NAMES = [
  'Normal Operation (0)',
  'Short-Circuit (1)',
  'Degradation (2)',
  'Open-Circuit (3)',
  'Shadowing (4)'
];

export default function ModelPerformance({ setActivePage }) {
  const [comparison, setComparison] = useState(null);
  const [selectedMatrixModel, setSelectedMatrixModel] = useState('random_forest');
  const [matrixViewMode, setMatrixViewMode] = useState('single'); // 'single' or 'all'
  const [featureModel, setFeatureModel] = useState('random_forest');
  const [featureData, setFeatureData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [compData, featData] = await Promise.all([
          fetchModelComparison(),
          fetchFeatureImportance('random_forest').catch(() => null)
        ]);
        setComparison(compData);
        setFeatureData(featData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function updateFeatureImportance() {
      try {
        const feat = await fetchFeatureImportance(featureModel);
        setFeatureData(feat);
      } catch (err) {
        console.error('Error fetching feature importance', err);
      }
    }
    updateFeatureImportance();
  }, [featureModel]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--solar-gold)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Loading Benchmark Evaluation Results...
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Fetching leakage-safe metrics for Decision Tree, Random Forest, and SVM on 9,354 held-out temporal samples.
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="alert-banner danger">
        <div>Failed to load model performance: {error}</div>
      </div>
    );
  }

  const models = comparison.models;
  const dt = models.decision_tree;
  const rf = models.random_forest;
  const svm = models.svm;

  // Comparison bar chart data
  const chartMetrics = [
    {
      metric: 'Accuracy',
      'Decision Tree': Math.round(dt.accuracy * 1000) / 10,
      'Random Forest': Math.round(rf.accuracy * 1000) / 10,
      'SVM (RBF)': Math.round(svm.accuracy * 1000) / 10,
    },
    {
      metric: 'Macro-F1',
      'Decision Tree': Math.round(dt.macro_f1 * 1000) / 10,
      'Random Forest': Math.round(rf.macro_f1 * 1000) / 10,
      'SVM (RBF)': Math.round(svm.macro_f1 * 1000) / 10,
    },
    {
      metric: 'Precision',
      'Decision Tree': Math.round(dt.precision * 1000) / 10,
      'Random Forest': Math.round(rf.precision * 1000) / 10,
      'SVM (RBF)': Math.round(svm.precision * 1000) / 10,
    },
    {
      metric: 'Recall',
      'Decision Tree': Math.round(dt.recall * 1000) / 10,
      'Random Forest': Math.round(rf.recall * 1000) / 10,
      'SVM (RBF)': Math.round(svm.recall * 1000) / 10,
    },
  ];

  const featChartData = featureData?.feature_importances?.map((f) => ({
    feature: f.feature,
    importance: Math.round(f.importance * 10000) / 100
  })) || [];

  const renderMatrix = (modelKey, modelObj, isCompact = false) => {
    const matrix = modelObj.confusion_matrix || [];
    const rowSums = matrix.map(r => r.reduce((a, b) => a + b, 0));

    return (
      <div key={modelKey} style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <div>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{modelObj.name}</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              ({(modelObj.macro_f1 * 100).toFixed(1)}% F1 • {modelObj.inference_latency_ms} ms)
            </span>
          </div>
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: modelKey === 'random_forest' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.15)',
            color: modelKey === 'random_forest' ? '#fbbf24' : '#38bdf8',
            fontWeight: 700
          }}>
            Accuracy: {(modelObj.accuracy * 100).toFixed(1)}%
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="matrix-table" style={{ width: '100%', minWidth: isCompact ? '380px' : '520px' }}>
            <thead>
              <tr>
                <th className="matrix-th" style={{ textAlign: 'left', width: isCompact ? '110px' : '150px' }}>True \ Pred</th>
                {FAULT_NAMES.map((name, i) => (
                  <th key={i} className="matrix-th" style={{ fontSize: isCompact ? '0.65rem' : '0.72rem' }}>{name}</th>
                ))}
                <th className="matrix-th" style={{ color: 'var(--solar-gold)', fontSize: isCompact ? '0.65rem' : '0.72rem' }}>Recall</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, trueIdx) => {
                const totalInRow = rowSums[trueIdx] || 1;
                const diagVal = row[trueIdx];
                const recallPct = ((diagVal / totalInRow) * 100).toFixed(1);

                return (
                  <tr key={trueIdx}>
                    <td className="matrix-th" style={{ textAlign: 'left', fontWeight: 600, fontSize: isCompact ? '0.68rem' : '0.75rem' }}>
                      {isCompact ? FAULT_NAMES[trueIdx] : FULL_FAULT_NAMES[trueIdx]}
                    </td>
                    {row.map((val, predIdx) => {
                      const isDiagonal = trueIdx === predIdx;
                      const cellPct = ((val / totalInRow) * 100).toFixed(1);
                      
                      let bgStyle = 'rgba(255,255,255,0.02)';
                      let textColor = 'var(--text-muted)';
                      
                      if (isDiagonal) {
                        const intensity = Math.min(val / totalInRow, 1.0);
                        bgStyle = `rgba(16, 185, 129, ${0.15 + intensity * 0.35})`;
                        textColor = '#34d399';
                      } else if (val > 0) {
                        const intensity = Math.min(val / totalInRow, 1.0);
                        bgStyle = `rgba(239, 68, 68, ${0.1 + intensity * 0.35})`;
                        textColor = '#f87171';
                      }

                      return (
                        <td 
                          key={predIdx} 
                          style={{
                            padding: isCompact ? '0.45rem 0.3rem' : '0.65rem 0.45rem',
                            textAlign: 'center',
                            background: bgStyle,
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '3px'
                          }}
                        >
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: isCompact ? '0.75rem' : '0.85rem', color: textColor }}>
                            {val.toLocaleString()}
                          </div>
                          {!isCompact && (
                            <div style={{ fontSize: '0.64rem', color: 'var(--text-dim)', marginTop: '1px' }}>
                              {cellPct}%
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: isCompact ? '0.72rem' : '0.8rem',
                      color: parseFloat(recallPct) > 90 ? '#10b981' : '#f59e0b',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      {recallPct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Sleek Methodology Reference Strip */}
      <div className="glass-panel" style={{ 
        padding: '0.85rem 1.25rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '0.75rem',
        background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08), rgba(56, 189, 248, 0.04))',
        border: '1px solid rgba(16, 185, 129, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem' }}>
          <ShieldCheck size={18} color="#10b981" style={{ flexShrink: 0 }} />
          <span>
            <strong>Verified Benchmark Protocol:</strong> All three models evaluated on the identical <strong>{comparison.dataset_info?.test_samples?.toLocaleString()} held-out temporal block test samples</strong> (balanced operational subset of the UTFPR 5.0 kW dataset).
          </span>
        </div>
        {setActivePage && (
          <button 
            onClick={() => setActivePage('methodology')}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#10b981', 
              fontWeight: 700, 
              fontSize: '0.78rem', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem' 
            }}
          >
            <span>Methodology Details</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* 3 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        
        {/* Random Forest Card (Top Performer) */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', border: '1px solid rgba(245, 158, 11, 0.45)', boxShadow: '0 0 20px rgba(245, 158, 11, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Random Forest (100 Trees)</h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ensemble Classifier</div>
            </div>
            <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              Top Macro-F1
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Macro F1-Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                {(rf.macro_f1 * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Held-Out Accuracy</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                {(rf.accuracy * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CPU Inference Latency</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {rf.inference_latency_ms} ms
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Model Disk Size</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {rf.model_size_kb.toLocaleString()} KB
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Optimal generalization across non-linear partial shading and degradation boundaries. Recommended for gateway diagnostics.
          </div>
        </div>

        {/* Support Vector Machine Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>SVM (RBF Kernel)</h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Kernel Support Vector Machine</div>
            </div>
            <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
              Calibrated Probabilities
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Macro F1-Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                {(svm.macro_f1 * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Held-Out Accuracy</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                {(svm.accuracy * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CPU Inference Latency</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                {svm.inference_latency_ms} ms
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Model Disk Size</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {svm.model_size_kb} KB
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            High boundary margin with Platt scaling. Fast 1.3 ms execution with compact 203 KB memory footprint.
          </div>
        </div>

        {/* Decision Tree Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Decision Tree</h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Single-Tree Whitebox</div>
            </div>
            <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
              Ultra-Fast 0.15ms
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Macro F1-Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                {(dt.macro_f1 * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Held-Out Accuracy</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                {(dt.accuracy * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CPU Inference Latency</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                {dt.inference_latency_ms} ms
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Model Disk Size</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {dt.model_size_kb} KB
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Minimalist footprint with max depth 12. Suitable for direct C/C++ compilation on solar inverter microcontrollers.
          </div>
        </div>

      </div>

      {/* 5x5 Confusion Matrix Heatmaps (Featured Prominently) */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>5×5 Confusion Matrix Heatmaps</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Evaluated on <strong>{comparison.dataset_info?.test_samples?.toLocaleString()} held-out test samples</strong>. Green diagonal indicates true positives; red tint shows off-diagonal errors.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* View Mode Switcher */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
              <button
                onClick={() => setMatrixViewMode('single')}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: matrixViewMode === 'single' ? 'var(--solar-gold)' : 'transparent',
                  color: matrixViewMode === 'single' ? '#070b14' : 'var(--text-muted)'
                }}
              >
                Focus View
              </button>
              <button
                onClick={() => setMatrixViewMode('all')}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: matrixViewMode === 'all' ? 'var(--solar-gold)' : 'transparent',
                  color: matrixViewMode === 'all' ? '#070b14' : 'var(--text-muted)'
                }}
              >
                Side-by-Side (3 Models)
              </button>
            </div>

            {/* Model Selector for Single View */}
            {matrixViewMode === 'single' && (
              <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
                {['random_forest', 'svm', 'decision_tree'].map((key) => {
                  const isActive = selectedMatrixModel === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedMatrixModel(key)}
                      style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: isActive ? 'var(--solar-gold)' : 'transparent',
                        color: isActive ? '#070b14' : 'var(--text-muted)'
                      }}
                    >
                      {key === 'random_forest' ? 'Random Forest' : key === 'svm' ? 'SVM' : 'Decision Tree'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Render Matrix / Matrices */}
        {matrixViewMode === 'single' ? (
          renderMatrix(selectedMatrixModel, models[selectedMatrixModel] || rf, false)
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
            {['random_forest', 'svm', 'decision_tree'].map((k) => renderMatrix(k, models[k], true))}
          </div>
        )}
      </div>

      {/* Per-Class Precision, Recall, and F1 Breakdown Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Per-Class Precision, Recall & F1-Score Breakdown</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Detailed class-level performance on the 9,354 held-out test samples (balanced operational subset).
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="comparison-table" style={{ fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th rowSpan="2" style={{ verticalAlign: 'bottom', borderRight: '1px solid var(--border-subtle)' }}>Fault Class</th>
                <th rowSpan="2" style={{ verticalAlign: 'bottom', textAlign: 'center', borderRight: '1px solid var(--border-subtle)' }}>Test Samples</th>
                <th colSpan="3" style={{ textAlign: 'center', borderRight: '1px solid var(--border-subtle)', color: '#fbbf24' }}>Random Forest (Top)</th>
                <th colSpan="3" style={{ textAlign: 'center', borderRight: '1px solid var(--border-subtle)', color: '#c084fc' }}>SVM (RBF)</th>
                <th colSpan="3" style={{ textAlign: 'center', color: '#38bdf8' }}>Decision Tree</th>
              </tr>
              <tr>
                <th style={{ textAlign: 'center', fontSize: '0.72rem' }}>Prec</th>
                <th style={{ textAlign: 'center', fontSize: '0.72rem' }}>Rec</th>
                <th style={{ textAlign: 'center', fontSize: '0.72rem', borderRight: '1px solid var(--border-subtle)' }}>F1</th>
                <th style={{ textAlign: 'center', fontSize: '0.72rem' }}>Prec</th>
                <th style={{ textAlign: 'center', fontSize: '0.72rem' }}>Rec</th>
                <th style={{ textAlign: 'center', fontSize: '0.72rem', borderRight: '1px solid var(--border-subtle)' }}>F1</th>
                <th style={{ textAlign: 'center', fontSize: '0.72rem' }}>Prec</th>
                <th style={{ textAlign: 'center', fontSize: '0.72rem' }}>Rec</th>
                <th style={{ textAlign: 'center', fontSize: '0.72rem' }}>F1</th>
              </tr>
            </thead>
            <tbody>
              {FULL_FAULT_NAMES.map((fullName, idx) => {
                const reportKey = [
                  'Normal Operation',
                  'Short-Circuit',
                  'Degradation',
                  'Open-Circuit',
                  'Shadowing'
                ][idx];

                const rfCls = rf.classification_report?.[reportKey] || {};
                const svmCls = svm.classification_report?.[reportKey] || {};
                const dtCls = dt.classification_report?.[reportKey] || {};
                const support = rfCls.support || svmCls.support || dtCls.support || 0;

                return (
                  <tr key={reportKey}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)', borderRight: '1px solid var(--border-subtle)' }}>
                      {fullName}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', borderRight: '1px solid var(--border-subtle)' }}>
                      {Math.round(support).toLocaleString()}
                    </td>
                    {/* RF */}
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{(rfCls.precision * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#10b981' }}>{(rfCls.recall * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fbbf24', borderRight: '1px solid var(--border-subtle)' }}>{(rfCls['f1-score'] * 100).toFixed(1)}%</td>
                    {/* SVM */}
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{(svmCls.precision * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#10b981' }}>{(svmCls.recall * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#c084fc', borderRight: '1px solid var(--border-subtle)' }}>{(svmCls['f1-score'] * 100).toFixed(1)}%</td>
                    {/* DT */}
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{(dtCls.precision * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#10b981' }}>{(dtCls.recall * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>{(dtCls['f1-score'] * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Column: Multi-Model Evaluation Comparison Bar Chart + Model Trade-off Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem' }}>
        
        {/* Model Comparison Metrics Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Comparative Evaluation Metrics</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Accuracy, Macro-F1, Precision, and Recall on held-out test split
            </p>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartMetrics} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[75, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="custom-chart-tooltip">
                          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{payload[0].payload.metric}</div>
                          {payload.map((p, i) => (
                            <div key={i} style={{ color: p.color }}>{p.name}: {p.value}%</div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                <Bar dataKey="Random Forest" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="SVM (RBF)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Decision Tree" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Architecture Trade-Offs (F1 vs Latency vs Size) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>Deployment Trade-Off Matrix</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Macro-F1 accuracy vs memory footprint and real-time CPU latency
            </p>

            <table className="comparison-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Architecture</th>
                  <th>Macro-F1</th>
                  <th>Inference</th>
                  <th>Footprint</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700, color: '#fbbf24' }}>Random Forest</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{(rf.macro_f1 * 100).toFixed(1)}%</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{rf.inference_latency_ms} ms</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{rf.model_size_kb.toLocaleString()} KB</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: '#c084fc' }}>SVM (RBF)</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{(svm.macro_f1 * 100).toFixed(1)}%</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{svm.inference_latency_ms} ms</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{svm.model_size_kb} KB</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: '#38bdf8' }}>Decision Tree</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{(dt.macro_f1 * 100).toFixed(1)}%</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>{dt.inference_latency_ms} ms</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{dt.model_size_kb} KB</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginTop: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--solar-gold)', marginBottom: '2px' }}>
              Deployment Recommendation:
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Deploy <strong>Random Forest</strong> on central gateways for highest discrimination. Deploy <strong>Decision Tree</strong> or <strong>SVM</strong> on edge microcontrollers.
            </p>
          </div>
        </div>

      </div>

      {/* Feature Importance (Gini Impurity Reduction) */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Feature Importance Ranking (Gini Impurity Reduction)</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Quantitative ranking demonstrating that engineered string differentials (v_diff, p1, p2) dominate classification.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
            <button
              onClick={() => setFeatureModel('random_forest')}
              style={{
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: featureModel === 'random_forest' ? 'var(--solar-gold)' : 'transparent',
                color: featureModel === 'random_forest' ? '#070b14' : 'var(--text-muted)'
              }}
            >
              Random Forest
            </button>
            <button
              onClick={() => setFeatureModel('decision_tree')}
              style={{
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: featureModel === 'decision_tree' ? 'var(--solar-gold)' : 'transparent',
                color: featureModel === 'decision_tree' ? '#070b14' : 'var(--text-muted)'
              }}
            >
              Decision Tree
            </button>
          </div>
        </div>

        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <BarChart layout="vertical" data={featChartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
              <YAxis dataKey="feature" type="category" tick={{ fill: '#fbbf24', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="custom-chart-tooltip">
                        <div style={{ fontWeight: 700 }}>{payload[0].payload.feature}</div>
                        <div className="custom-chart-tooltip-val">{payload[0].value}% relative importance</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="importance" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                {featChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? '#fbbf24' : index < 3 ? '#f59e0b' : '#38bdf8'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
