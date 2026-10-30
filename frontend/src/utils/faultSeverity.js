/**
 * Evidence-Based Fault Severity & Priority Evaluation Engine
 * ==========================================================
 * Evaluates PV string fault severity and maintenance priority based on
 * physically measured telemetry (String 1 & 2 Voltages, Currents, Irradiance,
 * Module Temperature, and computed deltas) combined with the ML predicted class.
 *
 * Requirements Met:
 * - Evidence-based, configurable thresholds.
 * - Distinguishes statistical ML model confidence from physical engineering severity.
 * - Handles insufficient evidence / low irradiance (< 50 W/m²) with "Needs Inspection" / "Insufficient Data".
 * - Highlights potentially dangerous electrical hazards with qualified technician safety warnings.
 * - Never claims unvalidated rules are official industry standards.
 */

export const DEFAULT_SEVERITY_CONFIG = {
  // Threshold below which solar irradiance generates negligible photocurrent,
  // making electrical inter-string comparisons inconclusive
  minIrradianceThreshold: 50.0, // W/m²

  // Voltage delta thresholds (String 1 vs String 2)
  highVoltageDelta: 30.0,       // Volts: > 30V mismatch typically corresponds to 2+ bypassed or shorted modules
  moderateVoltageDelta: 10.0,   // Volts: 10V - 30V indicates single-module drop or partial string mismatch

  // Current delta thresholds (String 1 vs String 2)
  highCurrentDelta: 3.0,        // Amperes: > 3.0A mismatch indicates major string imbalance or disconnection
  moderateCurrentDelta: 1.0,    // Amperes: 1.0A - 3.0A mismatch indicates shading or series resistance degradation

  // Active load threshold for short-circuit thermal/fire risk
  activeLoadCurrentThreshold: 4.0, // Amperes

  // Near-zero current threshold for open-circuit string disconnection
  nearZeroCurrentThreshold: 0.35, // Amperes
};

/**
 * Evaluates fault severity and priority from an existing diagnosis record.
 * 
 * @param {Object} record - The diagnosis record from SQLite
 * @param {Object} config - Configurable threshold overrides
 * @returns {Object} Severity evaluation payload
 */
export function evaluateFaultSeverity(record, config = DEFAULT_SEVERITY_CONFIG) {
  if (!record) {
    return {
      level: 'Insufficient Data',
      priority: 'Low',
      color: '#64748b',
      bgColor: '#f1f5f9',
      borderColor: '#cbd5e1',
      badgeClass: 'badge-muted',
      reason: 'No diagnosis record selected or record telemetry is unavailable.',
      evidence: [],
      isDangerousElectrical: false,
      requiresQualifiedTechnician: false,
      confidenceVsSeverityNote: 'Confidence represents model classification certainty; severity represents physical operational impact.'
    };
  }

  const readings = record.readings || {};
  const metrics = record.computed_metrics || {};
  const label = record.label || 'Unknown';
  const confidencePct = record.confidence != null ? (record.confidence * 100).toFixed(1) : null;

  const v1 = readings.vdc1 != null ? Number(readings.vdc1) : null;
  const v2 = readings.vdc2 != null ? Number(readings.vdc2) : null;
  const i1 = readings.idc1 != null ? Number(readings.idc1) : null;
  const i2 = readings.idc2 != null ? Number(readings.idc2) : null;
  const irr = readings.irr != null ? Number(readings.irr) : null;
  const pvt = readings.pvt != null ? Number(readings.pvt) : null;

  const deltaV = metrics.voltage_difference_v != null 
    ? Number(metrics.voltage_difference_v) 
    : (v1 != null && v2 != null ? Math.abs(v1 - v2) : null);

  const deltaI = metrics.current_difference_a != null 
    ? Number(metrics.current_difference_a) 
    : (i1 != null && i2 != null ? Math.abs(i1 - i2) : null);

  const maxI = (i1 != null && i2 != null) ? Math.max(i1, i2) : (i1 ?? i2 ?? 0);
  const minI = (i1 != null && i2 != null) ? Math.min(i1, i2) : 0;

  // Confidence explanation text
  const confidenceExplanation = confidencePct != null
    ? `Model Confidence: ${confidencePct}% (statistical probability of feature pattern matching '${label}'). This measures classifier certainty, not physical damage extent.`
    : 'Model Confidence: Not available.';

  // 1. Check for Insufficient Data / Low Irradiance (< 50 W/m²)
  if (v1 == null || v2 == null || i1 == null || i2 == null) {
    return {
      level: 'Insufficient Data',
      priority: 'Pending Inspection',
      color: '#64748b',
      bgColor: '#f8fafc',
      borderColor: '#e2e8f0',
      reason: 'Key electrical sensor measurements (voltage or current) are missing or incomplete in this record.',
      evidence: ['Missing String 1 or String 2 voltage/current values'],
      isDangerousElectrical: false,
      requiresQualifiedTechnician: true,
      confidenceExplanation
    };
  }

  if (irr != null && irr < config.minIrradianceThreshold) {
    return {
      level: 'Needs Inspection',
      priority: 'Low (Low Sunlight)',
      color: '#b45309',
      bgColor: '#fffbeb',
      borderColor: '#fde68a',
      reason: `Solar irradiance (${irr.toFixed(0)} W/m²) is below the configured 50 W/m² baseline. At low irradiance, solar cells generate negligible photocurrent; observed telemetry deviations cannot be reliably attributed to physical faults without on-site visual and irradiance-normalized testing.`,
      evidence: [
        `Measured Irradiance: ${irr.toFixed(1)} W/m² (< ${config.minIrradianceThreshold} W/m² threshold)`,
        `String 1: ${v1.toFixed(1)} V, ${i1.toFixed(2)} A`,
        `String 2: ${v2.toFixed(1)} V, ${i2.toFixed(2)} A`
      ],
      isDangerousElectrical: false,
      requiresQualifiedTechnician: false,
      confidenceExplanation
    };
  }

  // 2. High Severity Criteria (Evidence-based safety and major failure thresholds)
  
  // Case A: Short-Circuit with active load or high voltage collapse
  if (label === 'Short-Circuit') {
    if (deltaV != null && deltaV >= config.highVoltageDelta && maxI >= config.activeLoadCurrentThreshold) {
      return {
        level: 'High',
        priority: 'High Priority',
        color: '#b91c1c',
        bgColor: '#fef2f2',
        borderColor: '#fecaca',
        reason: `Evidence of inter-module short-circuit under active load: String voltage mismatch of ${deltaV.toFixed(1)} V (≥ ${config.highVoltageDelta} V threshold) carrying high current (${maxI.toFixed(2)} A). Bypassed cells under load present significant thermal concentration and DC arc hazard.`,
        evidence: [
          `Voltage mismatch: |V1 - V2| = ${deltaV.toFixed(1)} V (V1: ${v1.toFixed(1)} V vs V2: ${v2.toFixed(1)} V)`,
          `Operating current: ${maxI.toFixed(2)} A under ${irr != null ? irr.toFixed(0) : '--'} W/m² irradiance`,
          `Estimated ~${Math.max(1, Math.round(deltaV / 28))} bypassed module(s) in lower voltage string`
        ],
        isDangerousElectrical: true,
        requiresQualifiedTechnician: true,
        safetyNote: 'DANGER: Potentially dangerous electrical fault. Do not disconnect DC MC4 plugs while current is flowing. Qualified solar electrician required.',
        confidenceExplanation
      };
    } else if (deltaV != null && deltaV >= config.moderateVoltageDelta) {
      return {
        level: 'Medium',
        priority: 'Medium Priority',
        color: '#b45309',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
        reason: `Voltage drop of ${deltaV.toFixed(1)} V detected on one string with moderate current (${maxI.toFixed(2)} A). Indicates module bypass without severe thermal loading.`,
        evidence: [
          `Voltage drop: ${deltaV.toFixed(1)} V (V1: ${v1.toFixed(1)} V vs V2: ${v2.toFixed(1)} V)`,
          `Current level: ${maxI.toFixed(2)} A`
        ],
        isDangerousElectrical: true,
        requiresQualifiedTechnician: true,
        safetyNote: 'Qualified solar technician inspection recommended before resetting string breakers.',
        confidenceExplanation
      };
    }
  }

  // Case B: Open-Circuit with complete string power loss
  if (label === 'Open-Circuit') {
    const isOneStringDead = (i1 <= config.nearZeroCurrentThreshold && i2 >= 1.0) ||
                            (i2 <= config.nearZeroCurrentThreshold && i1 >= 1.0) ||
                            (deltaI != null && deltaI >= config.highCurrentDelta);

    if (isOneStringDead) {
      const deadString = i1 < i2 ? 'String 1' : 'String 2';
      const liveString = i1 < i2 ? 'String 2' : 'String 1';
      const liveI = Math.max(i1, i2);
      const deadI = Math.min(i1, i2);

      return {
        level: 'High',
        priority: 'High Priority',
        color: '#b91c1c',
        bgColor: '#fef2f2',
        borderColor: '#fecaca',
        reason: `Complete loss of string current on ${deadString} (${deadI.toFixed(2)} A) while ${liveString} produces ${liveI.toFixed(2)} A (ΔI = ${(liveI - deadI).toFixed(2)} A). Represents 100% loss of generation on the affected string and potential disconnected DC cable or blown fuse under floating voltage.`,
        evidence: [
          `Current collapse on ${deadString}: ${deadI.toFixed(2)} A vs ${liveString}: ${liveI.toFixed(2)} A`,
          `Current mismatch: ΔI = ${(liveI - deadI).toFixed(2)} A (≥ ${config.highCurrentDelta} A threshold)`,
          `Irradiance at observation: ${irr != null ? irr.toFixed(0) : '--'} W/m² (sufficient for active generation)`
        ],
        isDangerousElectrical: true,
        requiresQualifiedTechnician: true,
        safetyNote: 'CAUTION: Disconnected string conductors may maintain high floating DC open-circuit voltage (~300-450V). Treat all lines as live. Qualified technician required.',
        confidenceExplanation
      };
    }
  }

  // Case C: Degradation (Series Resistance / PID / Aging)
  if (label === 'Degradation') {
    if ((deltaI != null && deltaI >= config.moderateCurrentDelta) || (deltaV != null && deltaV >= config.moderateVoltageDelta)) {
      return {
        level: 'Medium',
        priority: 'Medium Priority',
        color: '#b45309',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
        reason: `Measurable string mismatch (ΔI = ${deltaI != null ? deltaI.toFixed(2) : '--'} A, ΔV = ${deltaV != null ? deltaV.toFixed(1) : '--'} V) causing persistent energy yield suppression. While not an immediate thermal emergency, ongoing resistance leads to permanent cell hotspot development if unaddressed.`,
        evidence: [
          `Current difference: ΔI = ${deltaI != null ? deltaI.toFixed(2) : '--'} A (≥ ${config.moderateCurrentDelta} A threshold)`,
          `Voltage difference: ΔV = ${deltaV != null ? deltaV.toFixed(1) : '--'} V`,
          `String 1 Power: ${(v1 * i1).toFixed(0)} W vs String 2 Power: ${(v2 * i2).toFixed(0)} W`
        ],
        isDangerousElectrical: false,
        requiresQualifiedTechnician: true,
        safetyNote: 'Schedule routine technician inspection and I-V curve tracing. No immediate arc hazard.',
        confidenceExplanation
      };
    }
    return {
      level: 'Low',
      priority: 'Low Priority',
      color: '#15803d',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      reason: `Minor series resistance deviation detected (ΔI = ${deltaI != null ? deltaI.toFixed(2) : '0.0'} A). String power imbalance is within acceptable early-degradation tolerances.`,
      evidence: [
        `Current difference: ΔI = ${deltaI != null ? deltaI.toFixed(2) : '0.0'} A (< ${config.moderateCurrentDelta} A threshold)`,
        `String 1: ${v1.toFixed(1)} V, ${i1.toFixed(2)} A | String 2: ${v2.toFixed(1)} V, ${i2.toFixed(2)} A`
      ],
      isDangerousElectrical: false,
      requiresQualifiedTechnician: false,
      confidenceExplanation
    };
  }

  // Case D: Partial Shadowing
  if (label === 'Shadowing') {
    if (deltaI != null && deltaI >= config.moderateCurrentDelta) {
      return {
        level: 'Medium',
        priority: 'Medium Priority',
        color: '#b45309',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
        reason: `Localized array shading causing significant current imbalance (ΔI = ${deltaI.toFixed(2)} A). Power generation is impaired on the shaded string; sustained partial shading can activate bypass diodes and cause cell heating.`,
        evidence: [
          `Current mismatch: ΔI = ${deltaI.toFixed(2)} A (≥ ${config.moderateCurrentDelta} A threshold)`,
          `String 1: ${v1.toFixed(1)} V, ${i1.toFixed(2)} A vs String 2: ${v2.toFixed(1)} V, ${i2.toFixed(2)} A`,
          `Array Irradiance: ${irr != null ? irr.toFixed(0) : '--'} W/m²`
        ],
        isDangerousElectrical: false,
        requiresQualifiedTechnician: false,
        safetyNote: 'Visual inspection recommended. Safe for site maintenance personnel to check for obstructions or dirt.',
        confidenceExplanation
      };
    }
    return {
      level: 'Low',
      priority: 'Low Priority',
      color: '#15803d',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      reason: `Mild partial shading with minor current deviation (ΔI = ${deltaI != null ? deltaI.toFixed(2) : '0.0'} A). Generation impact is minimal and temporary.`,
      evidence: [
        `Current mismatch: ΔI = ${deltaI != null ? deltaI.toFixed(2) : '0.0'} A (< ${config.moderateCurrentDelta} A threshold)`,
        `String power: P1 = ${(v1 * i1).toFixed(0)} W, P2 = ${(v2 * i2).toFixed(0)} W`
      ],
      isDangerousElectrical: false,
      requiresQualifiedTechnician: false,
      confidenceExplanation
    };
  }

  // Case E: Normal Operation
  if (label === 'Normal Operation' || label.includes('Normal')) {
    const isBalanced = (deltaV == null || deltaV < config.moderateVoltageDelta) && 
                       (deltaI == null || deltaI < config.moderateCurrentDelta);

    if (isBalanced) {
      return {
        level: 'Low',
        priority: 'Routine Monitoring',
        color: '#15803d',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        reason: `Nominal operating condition verified: Symmetrical string voltages (ΔV = ${deltaV != null ? deltaV.toFixed(1) : '0.0'} V < 10 V) and balanced currents (ΔI = ${deltaI != null ? deltaI.toFixed(2) : '0.00'} A < 1.0 A). The array is operating within normal MPPT tolerances.`,
        evidence: [
          `String 1: ${v1.toFixed(1)} V, ${i1.toFixed(2)} A (~${(v1 * i1).toFixed(0)} W)`,
          `String 2: ${v2.toFixed(1)} V, ${i2.toFixed(2)} A (~${(v2 * i2).toFixed(0)} W)`,
          `Inter-string delta: ΔV = ${deltaV != null ? deltaV.toFixed(1) : '0.0'} V, ΔI = ${deltaI != null ? deltaI.toFixed(2) : '0.00'} A`,
          `Irradiance: ${irr != null ? irr.toFixed(0) : '--'} W/m², Temp: ${pvt != null ? pvt.toFixed(1) : '--'} °C`
        ],
        isDangerousElectrical: false,
        requiresQualifiedTechnician: false,
        confidenceExplanation
      };
    } else {
      return {
        level: 'Needs Inspection',
        priority: 'Advisory',
        color: '#b45309',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
        reason: `Model classified telemetry as Normal Operation, but physical readings indicate mild electrical asymmetry (ΔV = ${deltaV != null ? deltaV.toFixed(1) : '0.0'} V, ΔI = ${deltaI != null ? deltaI.toFixed(2) : '0.00'} A). Routine sensor recalibration and string check advised.`,
        evidence: [
          `Voltage delta: ${deltaV != null ? deltaV.toFixed(1) : '0.0'} V`,
          `Current delta: ${deltaI != null ? deltaI.toFixed(2) : '0.00'} A`
        ],
        isDangerousElectrical: false,
        requiresQualifiedTechnician: false,
        confidenceExplanation
      };
    }
  }

  // Fallback for unknown / unusual conditions
  return {
    level: 'Needs Inspection',
    priority: 'Review Required',
    color: '#64748b',
    bgColor: '#f8fafc',
    borderColor: '#e2e8f0',
    reason: `Unclassified fault pattern with ΔV = ${deltaV != null ? deltaV.toFixed(1) : '--'} V and ΔI = ${deltaI != null ? deltaI.toFixed(2) : '--'} A. Engineering review required.`,
    evidence: [
      `Telemetry: V1=${v1.toFixed(1)}V, V2=${v2.toFixed(1)}V, I1=${i1.toFixed(2)}A, I2=${i2.toFixed(2)}A`
    ],
    isDangerousElectrical: false,
    requiresQualifiedTechnician: true,
    confidenceExplanation
  };
}
