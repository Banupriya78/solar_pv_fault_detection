import React from 'react';
import { Info, ShieldAlert, Cpu, Database, AlertTriangle, FileCode2, ExternalLink } from 'lucide-react';

export default function About() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Overview Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>About the Project</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          This software simulation system performs online photovoltaic array health monitoring and automatic fault classification using lightweight machine learning algorithms. The project evaluates operational telemetry ($V_{dc}$, $I_{dc}$, Irradiance, Temperature) to detect degradation, inter-module short-circuits, string disconnects, and partial shading.
        </p>
      </div>

      {/* Methodology Section */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Engineering Methodology</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--solar-gold)', fontWeight: 700, marginBottom: '0.35rem', fontSize: '0.9rem' }}>
              1. Physics-Informed Feature Engineering
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Raw telemetry is transformed into differential signals: inter-string voltage differences ($\Delta V$), voltage ratios ($V_{ratio}$), current imbalances ($\Delta I$), and total DC power ($P_{total}$). This isolates module short-circuits and open-circuits independent of sunlight variations.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '0.35rem', fontSize: '0.9rem' }}>
              2. Leakage-Safe Validation & Scaling
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Stratified train/test splitting (80% train, 20% test) is performed prior to scaling. Feature scalers (<code>StandardScaler</code>) are fitted strictly on the training partition, ensuring zero evaluation data leakage.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: '#34d399', fontWeight: 700, marginBottom: '0.35rem', fontSize: '0.9rem' }}>
              3. Lightweight Machine Learning
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Three candidate architectures are benchmarked: Decision Tree (single-tree with sub-millisecond edge latency), Random Forest (ensemble with 99.7% F1), and Support Vector Machine (RBF kernel with calibrated probabilities).
            </p>
          </div>
        </div>
      </div>

      {/* Scope and Limitations */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Scope & Software Simulation Limitations</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Transparent boundaries of this software project:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Software Simulation Tool:</strong> This project is an analytical diagnostic software system. It does not claim direct physical connection to live power inverter hardware, grid-trip relays, or microcontroller firmware flashing.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <Info size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Quiescent/Low-Sun Domain:</strong> At irradiance levels below 50 W/m² (dawn, dusk, nighttime), photovoltaic array voltage drops naturally as the inverter MPPT enters standby. Diagnostic predictions under these conditions are automatically marked with low-confidence advisories.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <Database size={18} color="#a855f7" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Historical Benchmark Data:</strong> Evaluation is conducted using the validated UTFPR 16-day time-series dataset. Results reflect performance on this physical 5 kW testbed.
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Citation */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Academic Citation & Reference</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          If referencing this study or utilizing this dataset, please cite the original authors:
        </p>

        <div style={{ 
          background: 'rgba(0,0,0,0.4)', 
          padding: '1rem', 
          borderRadius: 'var(--radius-sm)', 
          border: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: '#cbd5e1',
          overflowX: 'auto',
          lineHeight: 1.6
        }}>
          {`@article{lazzaretti2020monitoring,
  title={Monitoring System for Online Fault Detection and Classification in Photovoltaic Plants},
  author={Lazzaretti, Andr{\'e} E and da Costa, Clayton H and Rodrigues, Marcelo P and Yamada, Guilherme D and Lexinoski, Gilberto and Moritz, Guilherme L and Oroski, Elder and de G{\'o}es, Rafael E and Linhares, Robson R and Stadzisz, Paulo C and others},
  journal={Sensors},
  volume={20},
  number={17},
  pages={4688},
  year={2020},
  publisher={MDPI},
  doi={10.3390/s20174688}
}`}
        </div>
      </div>
    </div>
  );
}
