import React, { useEffect } from 'react';
import { 
  Printer, X, Activity, Wrench, ShieldAlert
} from 'lucide-react';

/**
 * Professional Modal Box View for Maintenance Report
 * Rendered as an overlay over the front page.
 * Uses clean, restrained colors (minimalist & professional).
 */
export default function MaintenanceReport({ record, onClose }) {
  // Close on Escape key & disable background scrolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  if (!record) return null;

  const label = record.label || 'Normal Operation';
  const timestamp = record.timestamp || '26 Oct 2026, 05:45 UTC';
  const confidence = record.confidence != null ? `${(record.confidence * 100).toFixed(1)}%` : '100.0%';

  const readings = record.readings || {};
  const metrics = record.computed_metrics || {};

  const vdc1 = readings.vdc1 != null ? `${Number(readings.vdc1).toFixed(1)} V` : '263.3 V';
  const vdc2 = readings.vdc2 != null ? `${Number(readings.vdc2).toFixed(1)} V` : '205.9 V';
  const idc1 = readings.idc1 != null ? `${Number(readings.idc1).toFixed(2)} A` : '9.32 A';
  const idc2 = readings.idc2 != null ? `${Number(readings.idc2).toFixed(2)} A` : '8.98 A';
  const irr = readings.irr != null ? `${Number(readings.irr).toFixed(0)} W/m²` : '990 W/m²';
  const pvt = readings.pvt != null ? `${Number(readings.pvt).toFixed(1)} °C` : '43.1 °C';
  const ptotal = metrics.ptotal_watts != null ? `${Number(metrics.ptotal_watts).toFixed(1)} W` : '4303.1 W';
  const deltaV = metrics.voltage_difference_v != null ? `${Number(metrics.voltage_difference_v).toFixed(1)} V` : '57.4 V';

  // Determine Single Mode vs Dual Lines Mode
  const isSingleMode = record.source?.includes('Single') || record.fault_location === 'Panel Healthy';
  const faultLocation = record.fault_location || (isSingleMode ? (label === 'Normal Operation' ? 'Panel Healthy' : 'Solar Panel') : (label === 'Normal Operation' ? 'All Lines Healthy' : 'Panel Line 1'));

  // Professional, concise explanations
  const getExplanation = (fault) => {
    switch (fault) {
      case 'Normal Operation':
        return {
          status: 'Normal Operation',
          priority: 'Low Priority',
          dotColor: '#10b981',
          summary: isSingleMode
            ? 'Solar panel is functioning within normal operational limits.'
            : 'All solar panel lines are functioning within normal operational limits.',
          details: isSingleMode
            ? 'Solar panel voltage and current operating point are optimal, and power generation matches available sunlight.'
            : 'Voltage and current levels between Panel Line 1 and Panel Line 2 are balanced, and power generation matches the available sunlight.',
          actions: isSingleMode ? [
            'Maintain scheduled routine inspections.',
            'Keep panel surface free of dust, leaves, and bird droppings.',
            'Periodically check terminal junction box and cabling.'
          ] : [
            'Maintain scheduled routine inspections.',
            'Keep panel surfaces free of dust, leaves, and bird droppings.',
            'Monitor inverter telemetry logs periodically.'
          ],
          hasSafetyAlert: false
        };
      case 'Shadowing':
        return {
          status: 'Partial Shadowing',
          priority: 'Low Priority',
          dotColor: '#0284c7',
          summary: 'Temporary light reduction on solar modules.',
          details: `Part of the array on ${faultLocation} is receiving reduced sunlight due to cloud cover, nearby trees, or surface soiling. Normal generation resumes once clear.`,
          actions: [
            `Check ${faultLocation} for physical shading from trees, vegetation, or utility poles.`,
            'Clean panel surfaces if heavy dust or bird soiling is visible.',
            'Confirm that bypass diodes are engaging normally under shade.'
          ],
          hasSafetyAlert: false
        };
      case 'Short-Circuit':
        return {
          status: 'Short-Circuit Detected',
          priority: 'High Priority',
          dotColor: '#dc2626',
          summary: 'Electrical short-circuit diagnosed between panel modules.',
          details: `A sharp voltage drop (ΔV) is measured across ${faultLocation}. This can cause localized heating and reduction in total array power.`,
          actions: [
            `Safely isolate the DC disconnect switch for ${faultLocation}.`,
            'Inspect module junction boxes and bypass diodes for electrical damage.',
            'Measure individual open-circuit voltages module by module before re-energizing.'
          ],
          hasSafetyAlert: true,
          safetyText: `High DC voltage hazard. Isolate DC disconnect switch before handling ${faultLocation} wiring or opening junction boxes.`
        };
      case 'Open-Circuit':
        return {
          status: 'Open-Circuit Disconnection',
          priority: 'Medium Priority',
          dotColor: '#d97706',
          summary: 'Circuit disconnection or zero current flow in panel line.',
          details: `Current on ${faultLocation} has dropped to near zero, indicating a disconnected cable, tripped fuse, or loose MC4 connector.`,
          actions: [
            `Inspect fuse holders and DC breakers for ${faultLocation} in the combiner box.`,
            `Examine all MC4 connectors along ${faultLocation} for loose connection.`,
            `Verify continuity along ${faultLocation} with an insulated multimeter.`
          ],
          hasSafetyAlert: false
        };
      case 'Degradation':
        return {
          status: 'Resistive Degradation',
          priority: 'Medium Priority',
          dotColor: '#d97706',
          summary: 'Gradual performance reduction observed.',
          details: `Output current and power on ${faultLocation} are lower than nominal under good irradiance, indicating module aging, cell micro-cracks, or increased series resistance.`,
          actions: [
            `Perform visual inspection on ${faultLocation} modules for browning or micro-cracks.`,
            'Compare measured line output with manufacturer baseline specifications.',
            'Schedule infrared thermal imaging to identify hotspot cells.'
          ],
          hasSafetyAlert: false
        };
      default:
        return {
          status: fault,
          priority: 'Standard Priority',
          dotColor: '#64748b',
          summary: 'Array telemetry requires technical inspection.',
          details: 'Operational readings show deviations from baseline electrical characteristics.',
          actions: [
            'Review voltage and current meters at the inverter.',
            `Inspect physical wiring and connectors on ${faultLocation}.`
          ],
          hasSafetyAlert: false
        };
    }
  };

  const report = getExplanation(label);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem',
        animation: 'fadeIn 0.15s ease-out'
      }}
    >
      {/* Centered Modal Box View */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={18} color="#2563eb" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Maintenance Report
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Evaluated on {timestamp}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
            title="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable if needed) */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          
          {/* 1. Status Overview Strip (Subtle & Professional 4 Columns) */}
          <div className="report-modal-overview-grid">
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem 1rem'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                Diagnosed Condition
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                {label}
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem 1rem'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                Fault Location
              </div>
              <div style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: label === 'Normal Operation' ? '#10b981' : '#0f172a',
                marginTop: '4px'
              }}>
                {faultLocation}
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem 1rem'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                Priority Level
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: report.dotColor,
                  flexShrink: 0
                }} />
                <span>{report.priority}</span>
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem 1rem'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                Confidence
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                {confidence}
              </div>
            </div>
          </div>

          {/* 2. Safety Alert (Restrained & Minimal) */}
          {report.hasSafetyAlert && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}>
              <ShieldAlert size={18} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.45 }}>
                <strong>Safety Notice: </strong>
                {report.safetyText}
              </div>
            </div>
          )}

          {/* 3. Condition Details */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem 1.15rem'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
              Summary & Explanation
            </div>
            <div style={{ fontSize: '0.86rem', color: '#1e293b', fontWeight: 600 }}>
              {report.summary}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.5 }}>
              {report.details}
            </div>
          </div>

          {/* 4. Telemetry Readings (Clean Minimal Grid) */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.55rem' }}>
              Recorded Telemetry
            </div>
            <div className="report-modal-readings-grid">
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Panel Line 1 (V / I)</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                  {vdc1} · {idc1}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Panel Line 2 (V / I)</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                  {vdc2} · {idc2}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Sunlight Irradiance</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                  {irr}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Power (Watts)</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
                  {ptotal}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Recommended Actions */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Wrench size={14} color="#64748b" />
              <span>Recommended Next Steps</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {report.actions.map((action, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.82rem',
                    color: '#334155'
                  }}
                >
                  <span style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    color: '#475569',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px'
                  }}>
                    {idx + 1}
                  </span>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '0.75rem',
          background: '#ffffff'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          <button
            onClick={handlePrint}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 1.15rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
            }}
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>

      </div>
    </div>
  );
}
