import React, { useState, useEffect } from 'react';
import { 
  Cpu, Play, CheckCircle2, AlertTriangle, RefreshCw, 
  Layers, ShieldCheck, Timer, HardDrive, BarChart2 
} from 'lucide-react';
import { startModelTraining, fetchTrainingStatus, fetchModelComparison } from '../api';

export default function TrainModels() {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Ready to train');
  const [error, setError] = useState(null);
  const [completionResults, setCompletionResults] = useState(null);
  const [normalSamples, setNormalSamples] = useState(12000);
  const [shadowSamples, setShadowSamples] = useState(12000);

  // Poll status on mount and during training
  useEffect(() => {
    let interval = null;

    async function checkStatus() {
      try {
        const status = await fetchTrainingStatus();
        setIsTraining(status.is_training);
        setProgress(status.progress_percent || 0);
        setCurrentStep(status.current_step || 'Idle');
        if (status.error) {
          setError(status.error);
        }
        if (!status.is_training && status.has_results && !completionResults) {
          // Fetch updated metrics
          const metrics = await fetchModelComparison().catch(() => null);
          setCompletionResults(metrics);
        }
      } catch (err) {
        console.error('Error fetching training status', err);
      }
    }

    checkStatus();

    if (isTraining) {
      interval = setInterval(checkStatus, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTraining]);

  const handleStartTraining = async () => {
    try {
      setError(null);
      setCompletionResults(null);
      setIsTraining(true);
      setProgress(5);
      setCurrentStep('Dispatching training task to FastAPI backend...');
      await startModelTraining(normalSamples, shadowSamples);
    } catch (err) {
      setError(err.message);
      setIsTraining(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Intro Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>Machine Learning Model Training</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Train and benchmark <strong>Decision Tree</strong>, <strong>Random Forest</strong>, and <strong>Support Vector Machine (SVM)</strong> directly from the verified 1.37M-record dataset. To ensure rapid convergence and balanced sensitivity, 100% of all real fault instances are preserved alongside a stratified quota of normal and shadowed readings.
        </p>
      </div>

      {/* Configuration & Training Action */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Training Partition Configuration</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
              <span>Normal Operation Samples Quota</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--solar-gold)' }}>{normalSamples.toLocaleString()}</strong>
            </div>
            <input
              type="range"
              min="4000"
              max="30000"
              step="1000"
              disabled={isTraining}
              value={normalSamples}
              onChange={(e) => setNormalSamples(parseInt(e.target.value))}
              className="range-slider"
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              Selected from 1,162,931 normal operation readings
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
              <span>Shadowing Samples Quota</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--solar-gold)' }}>{shadowSamples.toLocaleString()}</strong>
            </div>
            <input
              type="range"
              min="4000"
              max="30000"
              step="1000"
              disabled={isTraining}
              value={shadowSamples}
              onChange={(e) => setShadowSamples(parseInt(e.target.value))}
              className="range-slider"
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              Selected from 188,473 natural shading readings
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Preserved Fault Events: </span>
            <strong style={{ color: '#f87171' }}>100% (22,394 faults)</strong>
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Split Ratio: </span>
            <strong>80% Train / 20% Held-Out Test</strong>
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Scaling: </span>
            <strong>Zero-Leakage StandardScaler</strong>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartTraining}
          disabled={isTraining}
          className="btn-primary"
          style={{ width: '100%', maxWidth: '300px' }}
        >
          {isTraining ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>Training In Progress...</span>
            </>
          ) : (
            <>
              <Play size={18} fill="#070b14" />
              <span>Start Model Training</span>
            </>
          )}
        </button>

        {/* Training Progress Bar */}
        {isTraining && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{currentStep}</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--solar-gold)' }}>{progress}%</strong>
            </div>
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert-banner danger" style={{ marginTop: '1.5rem' }}>
            <AlertTriangle size={20} />
            <div>
              <strong>Training Error:</strong> {error}
            </div>
          </div>
        )}
      </div>

      {/* Completion Report Card */}
      {completionResults && !isTraining && (
        <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <CheckCircle2 size={24} color="#10b981" />
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#34d399' }}>Training Completed Successfully</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Evaluated on {completionResults.dataset_info?.test_samples?.toLocaleString()} held-out test readings. Model weights serialized to disk.
              </p>
            </div>
          </div>

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Test Accuracy</th>
                  <th>Macro-F1</th>
                  <th>Model File Size</th>
                  <th>Measured Latency</th>
                  <th>Training Time</th>
                </tr>
              </thead>
              <tbody>
                {completionResults.models && Object.values(completionResults.models).map((m) => (
                  <tr key={m.key}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{(m.accuracy * 100).toFixed(2)}%</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fbbf24' }}>{(m.macro_f1 * 100).toFixed(2)}%</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{m.model_size_kb} KB</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399' }}>{m.inference_latency_ms} ms</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{m.training_time_seconds} s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
