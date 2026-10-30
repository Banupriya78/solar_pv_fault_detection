import React, { useState } from 'react';
import { 
  ShieldCheck, AlertTriangle, AlertCircle, HelpCircle, 
  Settings2, ChevronDown, ChevronUp, Zap 
} from 'lucide-react';
import { evaluateFaultSeverity, DEFAULT_SEVERITY_CONFIG } from '../utils/faultSeverity';

/**
 * Fault Severity & Priority Indicator Component
 * =============================================
 * Displays evidence-based severity and maintenance priority, clearly distinguished
 * from model confidence, with a short explanation and telemetry evidence list.
 */
export default function FaultSeverityIndicator({ record, showDetails = true }) {
  const [expanded, setExpanded] = useState(false);

  if (!record) {
    return (
      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        No diagnosis selected
      </div>
    );
  }

  const severity = evaluateFaultSeverity(record, DEFAULT_SEVERITY_CONFIG);
  const confidencePct = record.confidence != null ? (record.confidence * 100).toFixed(1) : null;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
      {/* Top Row: Severity Badge + Priority Level */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={18} color={severity.color} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Fault Severity & Priority:
          </span>
          <span style={{
            background: severity.bgColor,
            color: severity.color,
            border: `1px solid ${severity.borderColor}`,
            fontWeight: 700,
            fontSize: '0.78rem',
            padding: '2px 10px',
            borderRadius: '6px'
          }}>
            {severity.level} ({severity.priority})
          </span>
        </div>

        {/* Model Confidence side-by-side distinction */}
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>Model Confidence:</span>
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {confidencePct != null ? `${confidencePct}%` : 'Not available'}
          </strong>
        </div>
      </div>

      {/* Short explanation of why severity was assigned */}
      <div style={{
        background: 'var(--surface-ground)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '0.65rem 0.85rem',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.45
      }}>
        <strong style={{ color: 'var(--text-primary)' }}>Justification: </strong>
        {severity.reason}
      </div>

      {/* Telemetry Evidence & Distinction Toggle */}
      {showDetails && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#2563eb',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span>{expanded ? 'Hide Telemetry Evidence & Engineering Criteria' : 'View Telemetry Evidence & Engineering Criteria'}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
              {/* Telemetry Evidence Items */}
              {severity.evidence && severity.evidence.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                    Supporting Telemetry Evidence:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569' }}>
                    {severity.evidence.map((item, idx) => (
                      <li key={idx} style={{ marginTop: '2px' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confidence vs Severity distinction note */}
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>
                <strong>Distinction Note:</strong> Model confidence reflects classifier pattern recognition certainty based on training data. Severity reflects physical electrical hazard, power loss, and urgency based on measured inter-string voltage/current deltas.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
