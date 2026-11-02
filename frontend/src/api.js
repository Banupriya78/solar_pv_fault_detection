/**
 * Frontend API Client for Solar PV Fault Classification Backend
 * Automatically uses local proxy during development and Render web service in production
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api'
    : 'https://solar-pv-api-ugdl.onrender.com/api');

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend service unavailable');
  return res.json();
}

export async function fetchDatasetOverview() {
  const res = await fetch(`${API_BASE}/dataset/overview`);
  if (!res.ok) throw new Error('Failed to fetch dataset overview');
  return res.json();
}

export async function fetchSampleRecords(limit = 25) {
  const res = await fetch(`${API_BASE}/dataset/sample-records?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch dataset sample records');
  return res.json();
}

export async function fetchModelComparison() {
  const res = await fetch(`${API_BASE}/models/comparison`);
  if (!res.ok) throw new Error('Failed to fetch model comparison');
  return res.json();
}

export async function fetchFeatureImportance(model = 'random_forest') {
  const res = await fetch(`${API_BASE}/models/feature-importance?model=${model}`);
  if (!res.ok) throw new Error('Failed to fetch feature importance');
  return res.json();
}

export async function fetchDemoSamples() {
  const res = await fetch(`${API_BASE}/samples/demo`);
  if (!res.ok) throw new Error('Failed to fetch demo presets');
  return res.json();
}

export async function fetchLatestPrediction() {
  const res = await fetch(`${API_BASE}/predictions/latest`);
  if (!res.ok) throw new Error('Failed to fetch latest prediction');
  return res.json();
}

export async function fetchPredictionHistory(limit = 25) {
  const res = await fetch(`${API_BASE}/predictions/history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch prediction history');
  return res.json();
}

export async function fetchPredictionById(predId) {
  const res = await fetch(`${API_BASE}/predictions/${predId}`);
  if (!res.ok) throw new Error(`Failed to fetch diagnosis record #${predId}`);
  return res.json();
}

export async function fetchTrainingStatus() {
  const res = await fetch(`${API_BASE}/models/training-status`);
  if (!res.ok) throw new Error('Failed to fetch model training status');
  return res.json();
}

export async function startModelTraining(normalSamples = 12000, shadowSamples = 12000) {
  const res = await fetch(`${API_BASE}/models/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      normal_samples: normalSamples,
      shadow_samples: shadowSamples
    })
  });
  if (!res.ok) throw new Error('Failed to initiate model training');
  return res.json();
}

export async function predictFault(readings, modelName = 'random_forest', isDemo = false, source = null) {
  const tStart = performance.now();
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      readings,
      model_name: modelName,
      is_demo: isDemo,
      source: source
    })
  });
  const tEnd = performance.now();
  const roundTripLatencyMs = Math.round((tEnd - tStart) * 10) / 10;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail?.error || (typeof data.detail === 'string' ? data.detail : 'Prediction failed'));
  }
  if (data.prediction) {
    data.prediction.api_roundtrip_ms = roundTripLatencyMs;
  }
  return data;
}

export async function fetchSystemStatus() {
  const res = await fetch(`${API_BASE}/system/status`);
  if (!res.ok) throw new Error('Failed to fetch verified system status');
  return res.json();
}

export async function fetchPredictionSummary() {
  const res = await fetch(`${API_BASE}/predictions/summary`);
  if (!res.ok) throw new Error('Failed to fetch prediction summary statistics');
  return res.json();
}

export async function uploadBatchCSV(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/predict/batch-csv`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Batch CSV prediction failed');
  }
  return data;
}

export const TEMPLATE_CSV_URL = `${API_BASE}/samples/download-template-csv`;

// =========================================================================
// Authentication & Session Management
// =========================================================================

const TOKEN_KEY = 'solar_pv_auth_token';
const USER_KEY = 'solar_pv_auth_user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginUser(username_or_email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username_or_email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Authentication failed. Please verify credentials.');
  }
  setStoredSession(data.access_token, data.user);
  return data;
}

export async function fetchCurrentUser() {
  const token = getStoredToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    clearStoredSession();
    return null;
  }
  const data = await res.json();
  if (data.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  return data.user;
}

export async function logoutUser() {
  const token = getStoredToken();
  try {
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  } catch (err) {
    console.error('Logout request failed:', err);
  } finally {
    clearStoredSession();
  }
}

export async function updateUserProfile(profileData) {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(profileData)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to update profile.');
  }
  if (data.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  return data.user;
}
