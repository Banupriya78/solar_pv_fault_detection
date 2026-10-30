import React from 'react';
import { 
  ShieldCheck, Database, Layers, Activity, Cpu, 
  CheckCircle2, AlertTriangle, BookOpen, Clock, 
  HelpCircle, Zap, Sun, BarChart2, Award
} from 'lucide-react';

export default function Methodology() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ 
            width: 36, 
            height: 36, 
            borderRadius: 'var(--radius-sm)', 
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#070b14'
          }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem' }}>Scientific Methodology & Anti-Leakage Evaluation</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Rigorous Experimental Framework for Lightweight Solar PV Fault Diagnostics
            </div>
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '0.75rem' }}>
          This page documents the empirical data loading, temporal partition strategy, feature extraction pipeline, and single-diode physics model implemented in this project. The methodology adheres strictly to peer-reviewed benchmark standards (Lazzaretti et al., MDPI Sensors 2020) and eliminates time-series data leakage.
        </p>
      </div>

      {/* Section 1: Data Leakage Elimination */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <ShieldCheck size={22} color="#10b981" />
          <h3 style={{ fontSize: '1.2rem' }}>1. Elimination of Time-Series Data Leakage</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={18} />
              <span>Random 80/20 Splitting (Flawed)</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              In 1 Hz time-series PV monitoring, consecutive readings recorded one second apart share virtually identical solar irradiance ($G$), module temperature ($T$), and DC string electrical states. A naive random split places neighboring second $t$ in train and second $t+1$ in test, causing the model to memorize neighboring points. This yields an artificially inflated, untrustworthy <strong>99.7% F1 score</strong> that fails in real-world deployments.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <CheckCircle2 size={18} />
              <span>Contiguous Temporal Block Splitting (Adopted)</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              To ensure true academic credibility, our pipeline segregates contiguous time blocks. For each fault event, models are trained on the initial 80% contiguous duration and strictly tested on the held-out terminal 20% duration. The <code>StandardScaler</code> is fitted exclusively on the training partition. This forces models to generalize across time, producing honest, reproducible scores: <strong>Random Forest: 93.41% Macro-F1</strong>, <strong>SVM: 93.23% Macro-F1</strong>, <strong>Decision Tree: 88.90% Macro-F1</strong>.
            </p>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <strong>Leakage-Safe Scaling Guarantee:</strong> <code>StandardScaler</code> parameters (μ<sub>train</sub>, σ<sub>train</sub>) are computed exclusively on the 37,040 training samples. The 9,354 held-out test samples are normalized using the frozen training statistics with zero look-ahead bias.
        </div>
      </div>

      {/* Section 2: Dataset Architecture & Sample Resolution */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Database size={22} color="#38bdf8" />
          <h3 style={{ fontSize: '1.2rem' }}>2. Dataset Architecture & Sample Resolution</h3>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          The data originates from the public photovoltaic testbed at the Federal University of Technology – Paraná (UTFPR) in Curitiba, Brazil. Telemetry was logged synchronously from calibrated sensors connected to a 5.0 kW grid-tied inverter across 16 days of varied weather conditions.
        </p>

        {/* Resolution Breakdown Table */}
        <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
          <table className="comparison-table" style={{ fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th>Dataset Partition</th>
                <th>Sample Count</th>
                <th>Sampling Rate</th>
                <th>Role in Framework</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: 'var(--solar-gold)' }}>Raw Stream (dataset_elec.mat + dataset_amb.mat)</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>1,373,798</td>
                <td>1.0 Hz (1 sample/sec)</td>
                <td>Full raw continuous telemetry archive across 16 monitoring days.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#38bdf8' }}>Evaluated Operational Subset</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>46,394</td>
                <td>Stratified Windowed</td>
                <td>Preserves 100% of all real fault instances without normal-class majority saturation.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#10b981' }}>Training Partition (80% Contiguous Block)</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>37,040</td>
                <td>Contiguous Blocks</td>
                <td>Exclusive training split used for feature scaling and model parameter fitting.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700, color: '#c084fc' }}>Held-Out Test Partition (20% Contiguous Block)</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>9,354</td>
                <td>Contiguous Blocks</td>
                <td>Strictly held-out temporal partition for computing all reported benchmark metrics.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Minority Fault Retention Notice */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Class 1: Short-Circuit</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ef4444' }}>5,999 (100%)</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>15 experimental episodes</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Class 2: Degradation</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>10,371 (100%)</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>19 experimental episodes</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Class 3: Open-Circuit</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#dc2626' }}>6,024 (100%)</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>23 experimental episodes</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Class 0 & 4: Normal & Shade</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#10b981' }}>24,000</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Representative windowed subsets</div>
          </div>
        </div>
      </div>

      {/* Section 3: Feature Engineering Formulations */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Layers size={22} color="#fbbf24" />
          <h3 style={{ fontSize: '1.2rem' }}>3. Domain-Specific Feature Engineering Pipeline</h3>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Direct raw sensor telemetry ($V_{dc1}, V_{dc2}, I_{dc1}, I_{dc2}, G, T$) fluctuates wildly throughout the diurnal cycle. To decouple weather fluctuations from electrical defects, our preprocessor automatically extracts 7 physical PV indicators:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--solar-gold)', textTransform: 'uppercase' }}>String Powers</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', margin: '0.4rem 0', color: '#f8fafc' }}>
              P₁ = V_dc1 × I_dc1<br />
              P₂ = V_dc2 × I_dc2<br />
              P_total = P₁ + P₂
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Quantifies total power extraction and string generation differential.</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>Inter-String Imbalances</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', margin: '0.4rem 0', color: '#f8fafc' }}>
              V_diff = V_dc1 - V_dc2<br />
              I_diff = I_dc1 - I_dc2
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Dominant indicator for inter-module shorts (voltage step) and string disconnections.</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>Normalized Ratios</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', margin: '0.4rem 0', color: '#f8fafc' }}>
              V_ratio = V_dc1 / (V_dc2 + ε)<br />
              I_ratio = I_dc1 / (I_dc2 + ε)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Maintains scale-invariance during dawn/dusk and cloudy irradiance transitions.</div>
          </div>
        </div>
      </div>

      {/* Section 4: Single-Diode Photovoltaic Physics Model */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Sun size={22} color="#f59e0b" />
          <h3 style={{ fontSize: '1.2rem' }}>4. Single-Diode Solar PV Physics Model</h3>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
          The interactive I-V and P-V characteristic curve simulator in the Fault Prediction page implements the standard five-parameter single-diode photovoltaic equation:
        </p>

        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center', margin: '0.75rem 0' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--solar-gold)', fontWeight: 600 }}>
            I(V) = I_ph - I_0 × [exp((q × (V + I × R_s)) / (n × k × T_cell)) - 1] - (V + I × R_s) / R_sh
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
          <strong>Thermal and Irradiance Corrections:</strong><br />
          • I<sub>sc</sub>(G) ≈ I<sub>sc,STC</sub> × (G / 1000)<br />
          • V<sub>oc</sub>(T) ≈ V<sub>oc,STC</sub> × (1 - 0.0029 × (T<sub>cell</sub> - 25))<br />
          For the UTFPR 5 kW installation, each string consists of 8 series-connected Canadian Solar CS6U-330P polycrystalline modules, giving nominal open-circuit voltage V<sub>oc,string</sub> = 8 × 45.6 V = 364.8 V and short-circuit current I<sub>sc</sub> = 9.31 A. When a 2-module short-circuit occurs, V<sub>oc</sub> drops by 25% to ~273 V, shifting the maximum power point cleanly.
        </div>
      </div>

      {/* Section 5: Latency Disambiguation */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Clock size={22} color="#a855f7" />
          <h3 style={{ fontSize: '1.2rem' }}>5. Latency Measurement Disambiguation</h3>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          To prevent reviewer ambiguity regarding system response times, the diagnostic platform strictly separates computational inference time from web network transmission overhead:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Model Inference Latency (CPU)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '0.25rem 0' }}>
              0.15 ms – 42 ms
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Measured via <code>time.perf_counter()</code> strictly around estimator calculation. Represents raw mathematical execution of the decision tree, ensemble trees, or SVM kernel.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>API Network Round-Trip Latency</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '0.25rem 0' }}>
              150 ms – 280 ms
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
              Measured in client browser via <code>performance.now()</code>. Includes JSON serialization, HTTP request transmission, FastAPI route dispatch, input validation, and browser response parsing.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
