import React, { useState } from 'react';
import {
  Zap, CheckCircle2, RotateCcw,
  SlidersHorizontal, AlertCircle, Wrench, ShieldAlert,
  FileText
} from 'lucide-react';
import { predictFault } from '../api';
import MaintenanceReport from './MaintenanceReport';

export default function FaultPrediction({ onPredictionSuccess }) {
  // Mode selection: 'single' (4 inputs: Single Panel + Weather) or 'dual' (6 inputs: 2 Lines + Weather)
  const [lineMode, setLineMode] = useState('single');

  // Input state for solar panel readings (defaults to authentic single panel MPP: 29.15V, 7.01A)
  const [inputs, setInputs] = useState({
    vdc1: 29.15,
    vdc2: 291.92,
    idc1: 7.01,
    idc2: 7.00,
    irr: 831.92,
    pvt: 22.10
  });

  const [loading, setLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [error, setError] = useState(null);
  const [showMaintenanceReport, setShowMaintenanceReport] = useState(false);

  const handleInputChange = (field, val) => {
    const num = parseFloat(val);
    setInputs(prev => ({
      ...prev,
      [field]: isNaN(num) ? '' : num
    }));
  };

  const handleSwitchMode = (mode) => {
    setLineMode(mode);
    setPredictionResult(null);
    setError(null);
    if (mode === 'single') {
      if (Number(inputs.vdc1) > 60) {
        setInputs(prev => ({ ...prev, vdc1: 29.15, idc1: 7.01 }));
      }
    } else {
      if (Number(inputs.vdc1) <= 60) {
        setInputs(prev => ({ ...prev, vdc1: 291.54, idc1: 7.01, vdc2: 291.92, idc2: 7.00 }));
      }
    }
  };

  const handleReset = () => {
    setInputs({
      vdc1: lineMode === 'single' ? 29.15 : 291.54,
      vdc2: 291.92,
      idc1: 7.01,
      idc2: 7.00,
      irr: 831.92,
      pvt: 22.10
    });
    setPredictionResult(null);
    setError(null);
    setShowMaintenanceReport(false);
  };

  // Standard PV equations for nominal reference baseline
  const irrVal = Number(inputs.irr) || 800;
  const pvtVal = Number(inputs.pvt) || 25;
  const refVdc = Math.round(Math.max(20, 290 - 0.38 * (pvtVal - 25)) * 100) / 100;
  const refIdc = Math.round(Math.max(0.05, 8.5 * (irrVal / 1000) * (1 + 0.0005 * (pvtVal - 25))) * 100) / 100;

  // Single panel scale detection:
  // If user enters <= 60V, they are giving direct Single Panel Voltage (e.g. 29.15V)
  const isSingleModule = lineMode === 'single' && Number(inputs.vdc1 || 0) <= 60;
  const scaleMultiplier = isSingleModule ? 10 : 1;
  const singleRefVdc = Math.round((refVdc / 10) * 100) / 100; // ~29.15V for 1 panel

  // Computed power calculations
  const p1 = Math.round((Number(inputs.vdc1 || 0) * Number(inputs.idc1 || 0)) * 10) / 10;
  const p2 = Math.round((Number(inputs.vdc2 || 0) * Number(inputs.idc2 || 0)) * 10) / 10;
  const pRef = isSingleModule
    ? Math.round((singleRefVdc * refIdc) * 10) / 10
    : Math.round((refVdc * refIdc) * 10) / 10;
  const healthPct = pRef > 0 ? Math.min(100, Math.round((p1 / pRef) * 1000) / 10) : 100;
  const pTotal = Math.round((p1 + p2) * 10) / 10;
  const vDiff = Math.abs(Number(inputs.vdc1 || 0) - Number(inputs.vdc2 || 0)).toFixed(1);

  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      let payload = { ...inputs };
      let sourceTag = 'Manual Entry (Dual Lines)';

      if (lineMode === 'single') {
        payload = {
          vdc1: Math.round(Number(inputs.vdc1) * scaleMultiplier * 100) / 100,
          idc1: inputs.idc1,
          vdc2: refVdc,
          idc2: refIdc,
          irr: inputs.irr,
          pvt: inputs.pvt
        };
        sourceTag = 'Manual Entry (Single Panel)';
      }

      // Run diagnosis
      const res = await predictFault(payload, 'random_forest', false, sourceTag);
      if (res.success && res.prediction) {
        setPredictionResult(res.prediction);
        onPredictionSuccess?.(res.prediction);
      } else {
        setError(res.error || 'Prediction failed. Please check input values.');
      }
    } catch (err) {
      setError(err.message || 'Diagnosis failed. Ensure backend service is reachable.');
    } finally {
      setLoading(false);
    }
  };

  // Result display details tailored for single panel vs dual lines
  const getFaultMeta = (label) => {
    switch (label) {
      case 'Normal Operation':
        return {
          title: 'Normal Operation',
          color: '#10b981',
          bg: '#ecfdf5',
          border: '#a7f3d0',
          severity: 'Low',
          desc: lineMode === 'single'
            ? 'Solar panel is operating under normal photovoltaic IV characteristics with optimal power output.'
            : 'All panel lines operating under normal photovoltaic IV characteristics with balanced voltage and current.',
          action: lineMode === 'single'
            ? 'Nominal operation verified. Maintain routine scheduled inspection.'
            : 'Nominal operation verified. Maintain routine scheduled maintenance.',
          isDanger: false
        };
      case 'Shadowing':
        return {
          title: 'Partial Shadowing',
          color: '#0284c7',
          bg: '#eff6ff',
          border: '#bfdbfe',
          severity: 'Low',
          desc: lineMode === 'single'
            ? 'Solar panel is experiencing partial shading from obstacles, dust, or soiling, reducing current output.'
            : 'One or more modules in the panel line are experiencing partial shading, reducing current flow.',
          action: lineMode === 'single'
            ? 'Check panel surface for dirt, fallen leaves, bird droppings, or nearby physical shading.'
            : 'Check for nearby shading objects (trees, utility poles) or surface dust on panels.',
          isDanger: false
        };
      case 'Short-Circuit':
        return {
          title: 'Short-Circuit',
          color: '#dc2626',
          bg: '#fef2f2',
          border: '#fecaca',
          severity: 'High',
          desc: lineMode === 'single'
            ? 'Internal cell short-circuit or diode fault detected on the solar panel, causing a sharp voltage drop.'
            : 'Inter-module short-circuit detected, causing a severe DC voltage drop.',
          action: lineMode === 'single'
            ? 'Disconnect panel terminals safely. Inspect bypass diodes and terminal junction box.'
            : 'Immediately isolate DC disconnect for affected panel line. Inspect bypass diodes and module interconnects.',
          isDanger: true
        };
      case 'Open-Circuit':
        return {
          title: 'Open-Circuit',
          color: '#d97706',
          bg: '#fef3c7',
          border: '#fde68a',
          severity: 'Medium',
          desc: lineMode === 'single'
            ? 'Disconnection or open-circuit detected. Solar panel current has dropped to near zero.'
            : 'Disconnection detected. Panel line current has dropped to near zero.',
          action: lineMode === 'single'
            ? 'Check panel cable connections, fuses, and MC4 connectors for loose or broken wiring.'
            : 'Check DC circuit breaker, fuses, and MC4 connectors for loose or damaged wiring.',
          isDanger: false
        };
      case 'Degradation':
        return {
          title: 'Resistive Degradation',
          color: '#d97706',
          bg: '#fef3c7',
          border: '#fde68a',
          severity: 'Medium',
          desc: lineMode === 'single'
            ? 'Cell degradation, hotspots, or increased series resistance identified on the solar panel.'
            : 'Increased series resistance or cell degradation causing below-nominal power output.',
          action: lineMode === 'single'
            ? 'Perform visual inspection and thermal IR check for cell micro-cracks or hot spots.'
            : 'Perform infrared thermal inspection to identify degraded solar cells or hotspots.',
          isDanger: false
        };
      default:
        return {
          title: label || 'Diagnosis Completed',
          color: '#64748b',
          bg: '#f8fafc',
          border: '#e2e8f0',
          severity: 'Standard',
          desc: lineMode === 'single'
            ? 'Operational readings show deviations from nominal photovoltaic curves for this solar panel.'
            : 'Operational readings show deviations from nominal photovoltaic curves.',
          action: lineMode === 'single'
            ? 'Perform technical inspection of solar panel terminals and wiring.'
            : 'Perform technical inspection of solar panel terminals and wiring.',
          isDanger: false
        };
    }
  };

  const meta = predictionResult ? getFaultMeta(predictionResult.label) : null;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* 2-Column Grid: Left Input Form | Right Diagnosis Result */}
      <div className="fault-prediction-layout">

        {/* ====================================================
            LEFT PANEL: Solar Panel Readings (Renamed professionally)
            ==================================================== */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #edf2f7',
          borderRadius: '16px',
          padding: '1.75rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <SlidersHorizontal size={20} color="#2563eb" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)' }}>
                Solar Panel Readings
              </h3>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
              Enter voltage, current, and environmental measurements to diagnose array health
            </div>
          </div>

          {/* Mode Selector: Single Line (4 Inputs) vs Dual Lines (6 Inputs) */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '10px',
            padding: '4px',
            gap: '4px'
          }}>
            <button
              type="button"
              onClick={() => handleSwitchMode('single')}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '7px',
                border: 'none',
                background: lineMode === 'single' ? '#ffffff' : 'transparent',
                color: lineMode === 'single' ? '#2563eb' : '#64748b',
                fontWeight: lineMode === 'single' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: lineMode === 'single' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Single Panel Mode (4 Inputs)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('dual')}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '7px',
                border: 'none',
                background: lineMode === 'dual' ? '#ffffff' : 'transparent',
                color: lineMode === 'dual' ? '#2563eb' : '#64748b',
                fontWeight: lineMode === 'dual' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: lineMode === 'dual' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Dual Lines Mode (6 Inputs)
            </button>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form with Dynamic 4 or 6 Inputs based on Mode */}
          <form onSubmit={handlePredict} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="prediction-form-grid">
              {/* 1. Panel Voltage */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  {lineMode === 'single' ? 'Panel Voltage (V)' : 'Panel Line 1 Voltage (Vdc1)'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={inputs.vdc1}
                    onChange={(e) => handleInputChange('vdc1', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.2rem 0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                    V
                  </span>
                </div>
              </div>

              {/* 2. Panel Current */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  {lineMode === 'single' ? 'Panel Current (I)' : 'Panel Line 1 Current (Idc1)'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={inputs.idc1}
                    onChange={(e) => handleInputChange('idc1', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.2rem 0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                    A
                  </span>
                </div>
              </div>

              {/* In Dual Mode: Show Line 2 Voltage & Current */}
              {lineMode === 'dual' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Panel Line 2 Voltage (Vdc2)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={inputs.vdc2}
                        onChange={(e) => handleInputChange('vdc2', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 2.2rem 0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.92rem',
                          fontFamily: 'var(--font-mono)',
                          color: '#0f172a',
                          boxSizing: 'border-box',
                          outline: 'none'
                        }}
                      />
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                        V
                      </span>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Panel Line 2 Current (Idc2)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={inputs.idc2}
                        onChange={(e) => handleInputChange('idc2', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 2.2rem 0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.92rem',
                          fontFamily: 'var(--font-mono)',
                          color: '#0f172a',
                          boxSizing: 'border-box',
                          outline: 'none'
                        }}
                      />
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                        A
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Environmental: Irradiance */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Solar Irradiance (G)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="1"
                    required
                    value={inputs.irr}
                    onChange={(e) => handleInputChange('irr', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 3.8rem 0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
                    W/m²
                  </span>
                </div>
              </div>

              {/* Environmental: PV Temperature */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  PV Temperature (T)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={inputs.pvt}
                    onChange={(e) => handleInputChange('pvt', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.2rem 0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                    °C
                  </span>
                </div>
              </div>
            </div>

            {/* Live Computed Metrics Preview */}
            <div className="live-metrics-preview-grid">
              {lineMode === 'single' ? (
                <>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Measured Power</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{p1} W</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Nominal Baseline</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{pRef} W</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Health Ratio</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: healthPct >= 85 ? '#10b981' : (healthPct >= 60 ? '#f59e0b' : '#dc2626'), marginTop: '2px' }}>
                      {healthPct}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Sunlight Irradiance</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>{inputs.irr || 0} W/m²</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Line 1 Power</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{p1} W</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Line 2 Power</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{p2} W</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Power</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>{pTotal} W</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Voltage Delta</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: Number(vDiff) > 20 ? '#dc2626' : '#0f172a', marginTop: '2px' }}>ΔV = {vDiff} V</div>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="prediction-action-buttons">
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
                  transition: 'background 0.15s ease'
                }}
                onMouseOver={(e) => {
                  if (!loading) e.currentTarget.style.background = '#1d4ed8';
                }}
                onMouseOut={(e) => {
                  if (!loading) e.currentTarget.style.background = '#2563eb';
                }}
              >
                <Zap size={18} />
                <span>{loading ? 'Diagnosing...' : 'Diagnose Fault'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.92rem',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                title="Reset values"
              >
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
            </div>
          </form>
        </div>

        {/* ====================================================
            RIGHT PANEL: Diagnosis Result
            ==================================================== */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #edf2f7',
          borderRadius: '16px',
          padding: '1.75rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {/* Header with Maintenance Report button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: 'var(--font-heading)' }}>
                Diagnosis Result
              </h3>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
                Real-time health evaluation based on entered readings
              </div>
            </div>

            {predictionResult && (
              <button
                onClick={() => setShowMaintenanceReport(true)}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  transition: 'background 0.15s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#1d4ed8'}
                onMouseOut={(e) => e.currentTarget.style.background = '#2563eb'}
                title="Open Maintenance Report dialog for this prediction"
              >
                <FileText size={15} />
                <span>Maintenance Report</span>
              </button>
            )}
          </div>

          {!predictionResult ? (
            <div style={{
              textAlign: 'center',
              padding: '3.5rem 1.5rem',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              color: '#64748b'
            }}>
              <Zap size={32} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
                Awaiting Telemetry Input
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
                Enter the readings on the left and click <strong>Diagnose Fault</strong>.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

              {/* Highlight Diagnosis Banner */}
              <div style={{
                background: meta.bg,
                border: `1px solid ${meta.border}`,
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                    Diagnosed Condition
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: meta.color, marginTop: '0.15rem' }}>
                    {meta.title}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.35rem', lineHeight: 1.45 }}>
                    {meta.desc}
                  </div>
                </div>

                <span style={{
                  background: meta.bg,
                  color: meta.color,
                  border: `1px solid ${meta.color}`,
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {meta.severity} Priority
                </span>
              </div>

              {/* Location, Confidence & Status Strip */}
              <div className="prediction-result-strip">
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Fault Location</div>
                  <div style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: predictionResult.class_id === 0 ? '#10b981' : '#0f172a',
                    marginTop: '0.2rem',
                    whiteSpace: 'nowrap'
                  }}>
                    {lineMode === 'single'
                      ? (predictionResult.class_id === 0 ? 'Panel Healthy' : (predictionResult.fault_location === 'All Lines Healthy' ? 'Panel Healthy' : 'Solar Panel'))
                      : (predictionResult.fault_location || (predictionResult.class_id === 0 ? 'All Lines Healthy' : 'Panel Line 1'))}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Confidence</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                    {(predictionResult.confidence * 100).toFixed(1)}%
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Evaluation Status</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} />
                    <span>Verified</span>
                  </div>
                </div>
              </div>

              {/* Safety Warning if Short Circuit */}
              {meta.isDanger && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  color: '#b91c1c',
                  fontSize: '0.82rem'
                }}>
                  <ShieldAlert size={20} color="#dc2626" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Electrical Warning: </strong>
                    Disconnect DC solar isolator before touching any panel line wiring.
                  </div>
                </div>
              )}

              {/* Recommended Action */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem 1.15rem'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <Wrench size={15} color="#2563eb" />
                  <span>Recommended Action</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
                  {meta.action}
                </div>
              </div>

              {/* View Full Maintenance Report Modal Button */}
              <button
                type="button"
                onClick={() => setShowMaintenanceReport(true)}
                style={{
                  width: '100%',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '0.65rem 1rem',
                  color: '#2563eb',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                  e.currentTarget.style.color = '#2563eb';
                }}
              >
                <FileText size={16} />
                <span>View Full Maintenance Report</span>
              </button>

            </div>
          )}
        </div>

      </div>

      {/* Modal Box View Over Front Page */}
      {showMaintenanceReport && predictionResult && (
        <MaintenanceReport
          record={predictionResult}
          onClose={() => setShowMaintenanceReport(false)}
        />
      )}

    </div>
  );
}
