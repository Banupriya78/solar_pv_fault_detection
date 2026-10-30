import React, { useState } from 'react';
import { 
  Sun, User, Lock, Eye, EyeOff, LogIn, AlertCircle, 
  ShieldCheck, CheckCircle2, ArrowRight, Sparkles 
} from 'lucide-react';
import { loginUser } from '../api';

export default function Login({ onLoginSuccess }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!usernameOrEmail.trim()) {
      setErrorMsg('Please enter your username or registered email.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    try {
      setLoading(true);
      const res = await loginUser(usernameOrEmail.trim(), password);
      if (res && res.user) {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setUsernameOrEmail('operator');
    setPassword('pvmonitor2026');
    setErrorMsg('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.08) 0%, transparent 60%), radial-gradient(circle at 85% 85%, rgba(245, 158, 11, 0.05) 0%, transparent 50%), #070b14',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Decorative ambient elements */}
      <div style={{
        position: 'absolute',
        width: 480,
        height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.06) 0%, transparent 70%)',
        top: '-10%',
        left: '10%',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '460px',
        zIndex: 10
      }}>
        
        {/* App Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(245, 158, 11, 0.2))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 0 25px rgba(56, 189, 248, 0.2)',
            marginBottom: '1rem',
            color: '#38bdf8'
          }}>
            <Sun size={32} />
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#f8fafc',
            letterSpacing: '-0.02em',
            margin: '0 0 0.35rem 0',
            fontFamily: 'var(--font-heading)'
          }}>
            PV Monitor
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: '#94a3b8',
            margin: 0
          }}>
            Solar PV Health Monitoring & Fault Classification System
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel" style={{
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
              Sign In to Operator Console
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
              Enter your credentials to access system telemetry and diagnostics.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: '#f87171',
              fontSize: '0.82rem',
              marginBottom: '1.25rem'
            }}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            
            {/* Username / Email field */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '0.45rem' }}>
                Username or Email
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <User size={16} />
                </div>
                <input
                  type="text"
                  placeholder="e.g. operator or operator@pvmonitor.io"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.75rem 0.85rem 0.75rem 2.4rem',
                    fontSize: '0.85rem',
                    color: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.75rem 2.5rem 0.75rem 2.4rem',
                    fontSize: '0.85rem',
                    color: '#f8fafc',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#1d4ed8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0.85rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background 0.2s ease',
                marginTop: '0.5rem',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
              }}
              onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseOut={(e) => { if (!loading) e.currentTarget.style.background = '#2563eb'; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Sign In</span>
                  <ArrowRight size={15} style={{ marginLeft: '2px' }} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '8px',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sparkles size={12} />
                  DEMO EVALUATOR ACCESS
                </span>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Auto-Fill Demo
                </button>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Default Operator: <code style={{ color: '#f8fafc', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px' }}>operator</code> &nbsp;|&nbsp;
                Password: <code style={{ color: '#f8fafc', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px' }}>pvmonitor2026</code>
              </div>
            </div>
          </div>

        </div>

        {/* Academic Project Footer Note */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.25rem',
          fontSize: '0.72rem',
          color: '#64748b'
        }}>
          Academic Demo Authentication • PBKDF2-SHA256 Salted Hash with SQLite Session Store
        </div>

      </div>

    </div>
  );
}
