/**
 * Intelligent Solution Recommendations & Diagnostic Explanations
 * =============================================================
 * Provides actionable, safety-first maintenance recommendations and physical
 * diagnostic explanations tailored to the predicted Solar PV fault class.
 *
 * Requirements:
 * - Possible causes clearly labeled as "Possible causes (not confirmed root causes)".
 * - Recommended inspection steps.
 * - Explicit safety precautions.
 * - Non-automated fix disclaimer.
 * - Objective diagnostic explanation without claiming unproven physical certainty.
 */

export const FAULT_RECOMMENDATIONS = {
  'Shadowing': {
    title: 'Partial Array Shading & Obstruction Mitigation',
    faultClass: 'Shadowing',
    statusSummary: 'Model detected characteristic localized current reduction and slight voltage rise indicative of partial shading.',
    possibleCauses: [
      'Vegetative overgrowth (tree branches, tall foliage) casting shadows across modules',
      'Nearby architectural structures (parapet walls, chimneys, antennae, utility poles)',
      'Localized surface soiling, heavy dust accumulation, bird droppings, or fallen leaves',
      'Inter-row module self-shading during low solar elevation angles'
    ],
    recommendedSteps: [
      'Conduct visual on-site inspection of the PV array at morning, solar noon, and mid-afternoon to document shading trajectory.',
      'Check module glass surfaces for heavy localized soiling, bird droppings, or leaf debris.',
      'Trim nearby trees or vegetative foliage causing shade on the affected string.',
      'If soiling is evident, arrange professional array cleaning using non-abrasive, demineralized water during cool morning or evening hours.'
    ],
    safetyPrecautions: [
      'Wear standard fall-arrest safety equipment when accessing sloped commercial or residential rooftops.',
      'Never spray cold water onto hot PV modules during peak sun hours (avoids thermal stress glass fracture).',
      'Do not lean, step on, or rest equipment on solar module glass or aluminum frames.'
    ],
    diagnosticExplanation: 'The machine learning classifier identified high string voltage coupled with suppressed string current under moderate-to-high irradiance. In crystalline silicon PV strings, shaded cells act as reverse-biased resistors, activating bypass diodes and suppressing string output current while maintaining nominal string open-circuit voltage.'
  },

  'Short-Circuit': {
    title: 'Inter-Module / Inter-String Short-Circuit Protocol',
    faultClass: 'Short-Circuit',
    statusSummary: 'Model detected significant voltage reduction with active operating current, indicating short-circuited modules or bypass conduction.',
    possibleCauses: [
      'Insulation breakdown or chafing on inter-module DC interconnect cabling',
      'Failed, short-circuited bypass diode in a module junction box',
      'Ground fault or pinched conductor between module frame and DC wiring',
      'Corroded or shorted DC combiner box terminals or surge protective device (SPD) failure'
    ],
    recommendedSteps: [
      'Have a qualified solar technician safely isolate the affected string using the DC isolator switch prior to physical contact.',
      'Perform insulation resistance (Megger) testing on DC positive and negative conductors relative to equipment ground.',
      'Measure open-circuit voltage (Voc) of each individual module in the affected string to locate the bypassed module(s).',
      'Inspect junction boxes and cable runs for thermal discoloration, burning, or rodent damage.',
      'Test bypass diode forward voltage and reverse leakage using a calibrated multimeter.'
    ],
    safetyPrecautions: [
      'DANGER: High-Voltage DC Arc Hazard. Never disconnect MC4 connectors under active load.',
      'Only qualified solar electricians with rated Category III/IV 1000V DC PPE should service electrical balance of system.',
      'Lock-out / Tag-out (LOTO) DC isolation switches before opening combiner boxes or touching conductors.'
    ],
    diagnosticExplanation: 'The telemetry demonstrates an abrupt string voltage drop (typically ~25–60V corresponding to bypassed modules) while the string continues to carry substantial current. This electrical signature closely mirrors internal module bypass diode conduction or direct inter-module conductor short-circuiting.'
  },

  'Open-Circuit': {
    title: 'String Continuity & Disconnection Resolution',
    faultClass: 'Open-Circuit',
    statusSummary: 'Model detected string current collapse to near-zero while counterpart string operates normally.',
    possibleCauses: [
      'Tripped string circuit breaker or blown DC string fuse in combiner box or inverter',
      'Uncoupled, improperly seated, or damaged MC4 connector pin',
      'Severed module interconnect wire or internal ribbon failure',
      'Inverter DC input contactor failure or loose terminal block screw'
    ],
    recommendedSteps: [
      'Have a certified PV technician visually check the combiner box for blown fuse indicators or tripped DC breakers.',
      'With the inverter safely isolated, check continuity across all string fuses and isolator contacts.',
      'Trace string cabling to verify every MC4 connector is fully engaged and latched with no thermal deformation.',
      'Verify string DC polarity and open-circuit voltage (Voc) at the combiner box terminal before reconnecting.'
    ],
    safetyPrecautions: [
      'CAUTION: Disconnected string lines may carry floating open-circuit voltage (Voc ~300–450V). Treat all conductors as energized.',
      'Always verify zero voltage with a verified DC multimeter before touching bare terminals.',
      'Use insulated tools rated for at least 1000V DC.'
    ],
    diagnosticExplanation: 'The telemetry shows one string current near 0.0 A while irradiance remains high and the parallel string generates nominal current. This step-loss of current without a proportional voltage collapse to zero at open terminals indicates an interrupted DC series circuit path.'
  },

  'Degradation': {
    title: 'Long-Term Performance & Series Resistance Investigation',
    faultClass: 'Degradation',
    statusSummary: 'Model detected gradual current/voltage suppression characteristic of increased series resistance or cell degradation.',
    possibleCauses: [
      'Increased series contact resistance (Rs) from solder ribbon fatigue or corroded junction box terminals',
      'Potential Induced Degradation (PID) affecting module cells near string negative/positive terminals',
      'Encapsulant (EVA) browning, delamination, or cell micro-cracking over extended operating life',
      'Uneven module degradation or mismatch across mixed manufacturing batches'
    ],
    recommendedSteps: [
      'Compare current string energy yield against historical commissioning baseline under normalized irradiance (> 800 W/m²).',
      'Arrange on-site I-V curve tracing on both strings to measure fill factor (FF), series resistance (Rs), and shunt resistance (Rsh).',
      'Perform handheld infrared (IR) thermography on a clear day to identify localized cell hot spots or defective solder joints.',
      'Check for persistent, non-recovering output reduction across multiple consecutive clear-sky days.'
    ],
    safetyPrecautions: [
      'Observe standard high-voltage DC safety precautions when connecting I-V curve tracer leads to array strings.',
      'Do not apply mechanical loads or step on modules during thermographic inspections.'
    ],
    diagnosticExplanation: 'The telemetry exhibits a continuous, non-zero reduction in string power output with current or voltage lagging behind the healthy parallel string under identical sunlight and temperature conditions. This electrical behavior reflects internal series resistance dissipation or gradual cell degradation.'
  },

  'Normal Operation': {
    title: 'Nominal Array Performance & Baseline Health',
    faultClass: 'Normal Operation',
    statusSummary: 'No fault condition was identified by the ML model. Strings show balanced, symmetric electrical output.',
    possibleCauses: [
      'System is operating within nominal Maximum Power Point (MPP) tracking tolerances',
      'Balanced inter-string voltage and current symmetry under available solar irradiance'
    ],
    recommendedSteps: [
      'Continue routine data logging and periodic automated telemetry evaluations.',
      'Maintain scheduled quarterly visual array walkthroughs per manufacturer operations & maintenance guidelines.',
      'Keep inverter ventilation louvers and cooling fans clean and free of airborne debris.'
    ],
    safetyPrecautions: [
      'Maintain standard safety discipline around operational inverter and combiner enclosures.',
      'Do not open energized high-voltage DC disconnect enclosures during routine inspections.'
    ],
    diagnosticExplanation: 'String 1 and String 2 exhibit balanced DC voltages and symmetric currents within normal manufacturing and temperature coefficients. Both strings track irradiance variations synchronously.'
  }
};

/**
 * Returns intelligent recommendation tailored to the predicted fault class.
 *
 * @param {string} label - Predicted fault class label
 * @returns {Object} Tailored recommendation object
 */
export function getRecommendationForFault(label) {
  if (!label) return FAULT_RECOMMENDATIONS['Normal Operation'];

  // Normalize label matching
  if (label.includes('Shadow')) return FAULT_RECOMMENDATIONS['Shadowing'];
  if (label.includes('Short')) return FAULT_RECOMMENDATIONS['Short-Circuit'];
  if (label.includes('Open')) return FAULT_RECOMMENDATIONS['Open-Circuit'];
  if (label.includes('Degrad')) return FAULT_RECOMMENDATIONS['Degradation'];
  if (label.includes('Normal')) return FAULT_RECOMMENDATIONS['Normal Operation'];

  return FAULT_RECOMMENDATIONS[label] || {
    title: `${label} Advisory Protocol`,
    faultClass: label,
    statusSummary: `Diagnosis record logged for class '${label}'.`,
    possibleCauses: [
      'Telemetry pattern matched historical training features for this class',
      'External environmental or electrical string variance'
    ],
    recommendedSteps: [
      'Review recorded string telemetry against baseline historical data.',
      'Conduct preliminary visual inspection of the PV array and combiner boxes.'
    ],
    safetyPrecautions: [
      'Observe standard solar PV high-voltage safety procedures.',
      'Have any electrical measurements taken by a qualified technician.'
    ],
    diagnosticExplanation: `The ML model classified this reading as '${label}'. Further engineering assessment is recommended.`
  };
}
