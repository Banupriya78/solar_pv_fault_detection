import React, { useState, useEffect } from 'react';
import { BarChart3, HelpCircle, Layers, Cpu, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { fetchFeatureImportance } from '../api';

const FEATURE_DESCRIPTIONS = {
  v_diff: 'Voltage Differential |vdc1 - vdc2|: Primary indicator for module-level short-circuits.',
  v_ratio: 'Voltage Ratio vdc1 / vdc2: Normalizes voltage deviations independent of solar irradiance levels.',
  i_diff: 'Current Differential |idc1 - idc2|: Directly flags string open-circuits and severe shading current mismatch.',
  i_ratio: 'Current Ratio idc1 / idc2: Detects partial string disconnection and bypass diode conduction.',
  ptotal: 'Total DC Power (P1 + P2): Measures gross plant generation against theoretical clear-sky output.',
  p1: 'String 1 DC Power (vdc1 × idc1): String health and power tracking.',
  p2: 'String 2 DC Power (vdc2 × idc2): Reference string production.',
  vdc1: 'String 1 DC Voltage: Raw string voltage.',
  vdc2: 'String 2 DC Voltage: Raw string voltage.',
  idc1: 'String 1 DC Current: Raw string current.',
  idc2: 'String 2 DC Current: Raw string current.',
  irr: 'Solar Irradiance: Key ambient normalizer; separates shading from low-sun dusk/dawn.',
  pvt: 'PV Cell Temperature: Accounts for negative temperature coefficient of Voc in crystalline silicon.'
};

export default function FeatureImportance() {
  const [model, setModel] = useState('random_forest');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadImportances() {
      try {
        setLoading(true);
        const res = await fetchFeatureImportance(model);
        setData(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadImportances();
  }, [model]);

  const chartData = data?.feature_importances?.map((f) => ({
    feature: f.feature,
    importance: Math.round(f.importance * 10000) / 100, // as percentage
    raw: f.importance,
    description: FEATURE_DESCRIPTIONS[f.feature] || ''
  })) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header and Model Selector */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Feature Importance & Physical Attribution</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Quantitative ranking of telemetry indicators derived from tree-based Gini impurity reduction.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setModel('random_forest')}
              className={`btn-secondary ${model === 'random_forest' ? 'active' : ''}`}
              style={{
                background: model === 'random_forest' ? 'var(--solar-gold)' : undefined,
                color: model === 'random_forest' ? '#070b14' : undefined,
                fontWeight: model === 'random_forest' ? 700 : 500
              }}
            >
              Random Forest
            </button>
            <button
              onClick={() => setModel('decision_tree')}
              className={`btn-secondary ${model === 'decision_tree' ? 'active' : ''}`}
              style={{
                background: model === 'decision_tree' ? 'var(--solar-gold)' : undefined,
                color: model === 'decision_tree' ? '#070b14' : undefined,
                fontWeight: model === 'decision_tree' ? 700 : 500
              }}
            >
              Decision Tree
            </button>
          </div>
        </div>
      </div>

      {/* Note about SVM */}
      <div className="alert-banner info">
        <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Note on Model Support:</strong> Feature importance via mean decrease in impurity is native to <strong>Decision Trees</strong> and <strong>Random Forests</strong>. Support Vector Machines utilizing non-linear RBF kernels project samples into infinite-dimensional Hilbert space where individual 1D feature importances are not directly decomposable.
        </div>
      </div>

      {/* Horizontal Bar Chart & Feature List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        {/* Recharts Bar Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Gini Impurity Reduction (%)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Relative contribution of each telemetry feature to overall fault classification accuracy.
          </p>

          <div style={{ width: '100%', height: 420 }}>
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <XAxis type="number" domain={[0, 'dataMax + 5']} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="feature" type="category" tick={{ fill: '#fbbf24', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="custom-chart-tooltip" style={{ maxWidth: '280px' }}>
                          <div className="custom-chart-tooltip-title">{item.feature}</div>
                          <div className="custom-chart-tooltip-val">{item.importance}% importance</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                            {item.description}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="importance" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index < 3 ? '#f59e0b' : index < 6 ? '#38bdf8' : '#64748b'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Attribution Explanations */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Physical Interpretation of Dominant Features</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Why engineered differential telemetry provides lightweight, noise-resilient classification.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {chartData.slice(0, 6).map((item, idx) => (
              <div 
                key={item.feature}
                style={{
                  padding: '0.85rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fbbf24', fontSize: '0.95rem' }}>
                    #{idx + 1} {item.feature}
                  </span>
                  <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '0.8rem', 
                    fontWeight: 700,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)'
                  }}>
                    {item.importance}%
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
