import React, { useState } from 'react';
import { 
  Lightbulb, AlertTriangle, ShieldAlert, 
  HelpCircle, Wrench, Shield, Info 
} from 'lucide-react';
import { getRecommendationForFault } from '../utils/faultRecommendations';
import { evaluateFaultSeverity } from '../utils/faultSeverity';

/**
 * Intelligent Solution Recommendation Component
 * ==============================================
 * Renders tailored maintenance recommendations, possible causes,
 * recommended inspection steps, and safety precautions for a selected diagnosis.
 */
export default function IntelligentRecommendations({ record }) {
  const [activeTab, setActiveTab] = useState('causes');

  if (!record) {
    return (
      <div className="recommendation-panel" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No diagnosis selected. Run a prediction or choose a record from the history table to view intelligent recommendations.
        </div>
      </div>
    );
  }

  const label = record.label || 'Normal Operation';
  const rec = getRecommendationForFault(label);
  const severityInfo = evaluateFaultSeverity(record);

  return (
    <div className="recommendation-panel">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem' }}>
            <Lightbulb size={20} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              Intelligent Solution Recommendation
            </h3>
            <span style={{
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              fontSize: '0.74rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px'
            }}>
              {label}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Tailored engineering guidance for Diagnosis #{record.id || 'Latest'} ({record.timestamp || 'Recorded'}). Does not claim automated repair.
          </div>
        </div>

        {/* Severity Badge in Recommendation Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: severityInfo.bgColor,
          border: `1px solid ${severityInfo.borderColor}`,
          padding: '0.35rem 0.75rem',
          borderRadius: '8px'
        }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>Priority:</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: severityInfo.color }}>
            {severityInfo.priority || severityInfo.level}
          </span>
        </div>
      </div>

      {/* Safety Alert Banner for Dangerous Electrical Faults */}
      {severityInfo.isDangerousElectrical && (
        <div className="safety-notice-box hazard">
          <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '2px' }}>
              Safety Warning: High-Voltage DC Hazard
            </strong>
            <span>
              {severityInfo.safetyNote || 'Potentially dangerous electrical fault detected. All inspection and troubleshooting must be performed by a qualified solar PV electrician. Do not disconnect DC MC4 plugs while current is flowing.'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="recommendation-tabs">
        <button
          type="button"
          className={`rec-tab-btn ${activeTab === 'causes' ? 'active' : ''}`}
          onClick={() => setActiveTab('causes')}
        >
          Possible Causes ({rec.possibleCauses.length})
        </button>
        <button
          type="button"
          className={`rec-tab-btn ${activeTab === 'steps' ? 'active' : ''}`}
          onClick={() => setActiveTab('steps')}
        >
          Recommended Inspection Steps ({rec.recommendedSteps.length})
        </button>
        <button
          type="button"
          className={`rec-tab-btn ${activeTab === 'safety' ? 'active' : ''}`}
          onClick={() => setActiveTab('safety')}
        >
          Safety Precautions ({rec.safetyPrecautions.length})
        </button>
        <button
          type="button"
          className={`rec-tab-btn ${activeTab === 'explanation' ? 'active' : ''}`}
          onClick={() => setActiveTab('explanation')}
        >
          Diagnostic Rationale
        </button>
      </div>

      {/* Tab Content 1: Possible Causes */}
      {activeTab === 'causes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <HelpCircle size={14} />
            <span>Clearly labeled as <strong>possible causes</strong> based on characteristic electrical patterns, not confirmed root causes. Physical testing is required.</span>
          </div>

          <div className="causes-grid">
            {rec.possibleCauses.map((cause, idx) => (
              <div key={idx} className="cause-item">
                <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{cause}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 2: Recommended Inspection Steps */}
      {activeTab === 'steps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Wrench size={14} />
            <span>Recommended sequential physical steps for field maintenance personnel:</span>
          </div>

          <div className="steps-list">
            {rec.recommendedSteps.map((step, idx) => (
              <div key={idx} className="step-card">
                <div className="step-num">{idx + 1}</div>
                <div style={{ lineHeight: 1.5 }}>{step}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>
            Notice: Following these inspection steps does not automatically resolve physical array conditions. On-site verification and corrective action are required.
          </div>
        </div>
      )}

      {/* Tab Content 3: Safety Precautions */}
      {activeTab === 'safety' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={14} />
            <span>Mandatory occupational and electrical safety precautions:</span>
          </div>

          <div className="steps-list">
            {rec.safetyPrecautions.map((precaution, idx) => (
              <div key={idx} className="step-card" style={{ borderLeftColor: '#dc2626' }}>
                <ShieldAlert size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 500 }}>
                  {precaution}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 4: Diagnostic Rationale */}
      {activeTab === 'explanation' && (
        <div style={{
          background: 'var(--surface-ground)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '1.15rem 1.25rem',
          fontSize: '0.84rem',
          lineHeight: 1.6,
          color: 'var(--text-secondary)'
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Info size={16} color="#2563eb" />
            <span>Physical Engineering Context:</span>
          </div>
          <p style={{ margin: 0 }}>
            {rec.diagnosticExplanation}
          </p>
          <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <strong>Evidence-Based Severity Context:</strong> {severityInfo.reason}
          </div>
        </div>
      )}
    </div>
  );
}
