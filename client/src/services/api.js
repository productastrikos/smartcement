const API_BASE = process.env.REACT_APP_API_URL || '/api';

function authHeaders() {
  const token = localStorage.getItem('cempulse_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const login = (username, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const getMe = () => request('/auth/me');

export const getDashboardSummary = () => request('/dashboard/summary');

export const getPlantKpis = () => request('/dashboard/plant-kpis');

export const getNotifications = () => request('/dashboard/notifications');

export const getBagFilterStatus = () => request('/bagfilter/status');

export const getBagFilterAlerts = () => request('/bagfilter/alerts');

export const getBagFilterKpis = () => request('/bagfilter/kpis');

export const getBagFilterAdvisories = () => request('/bagfilter/advisories');

export const acknowledgeAlert = (alertId) =>
  request(`/bagfilter/alerts/${alertId}/ack`, { method: 'POST' });

export const getControlCentreKpis = () => request('/control-centre/kpis');

export const getControlCentrePlants = () => request('/control-centre/plants');

export const getControlCentreDeviations = () => request('/control-centre/deviations');

export const getControlCentreDeviationTrend = () => request('/control-centre/deviation-trend');

export const getStockKpis = () => request('/stock-management/kpis');

export const getStockMaterials = () => request('/stock-management/materials');

export const getStockAlerts = () => request('/stock-management/alerts');

export const getStockTrend = () => request('/stock-management/trend');

export const getPredictiveMaintenanceKpis = () => request('/predictive-maintenance/kpis');

export const getPredictiveMaintenanceAssets = () => request('/predictive-maintenance/assets');

export const getPredictiveMaintenanceAlerts = () => request('/predictive-maintenance/alerts');

export const getAssetTrend = (assetId) => request(`/predictive-maintenance/assets/${assetId}/trend`);

export const getEnergyKpis = () => request('/energy-optimization/kpis');

export const getKilnProfile = () => request('/energy-optimization/kiln-profile');

export const getFuelMix = () => request('/energy-optimization/fuel-mix');

export const getEnergyAlerts = () => request('/energy-optimization/alerts');

export const getSavingsTrend = () => request('/energy-optimization/savings-trend');

export const getOptimizationEvents = () => request('/energy-optimization/events');

export const getQualityKpis = () => request('/quality-prediction/kpis');

export const getQualityBatches = () => request('/quality-prediction/batches');

export const getQualityAlerts = () => request('/quality-prediction/alerts');

export const getSafetyKpis = () => request('/worker-safety/kpis');

export const getSafetyZones = () => request('/worker-safety/zones');

export const getSafetyAlerts = () => request('/worker-safety/alerts');

export const getSafetyIncidentTrend = () => request('/worker-safety/incident-trend');

export const getEmissionsKpis = () => request('/emissions-tracking/kpis');

export const getEmissionsTrend = () => request('/emissions-tracking/trend');

export const getAltFuelTrend = () => request('/emissions-tracking/alt-fuel-trend');

export const getEmissionsReadingsTable = () => request('/emissions-tracking/readings-table');

export const getEmissionsAlerts = () => request('/emissions-tracking/alerts');

export const getGovernanceKpis = () => request('/governance/kpis');

export const getGovernanceAuditLog = () => request('/governance/audit-log');

// Retained as no-op stubs — no backend-driven advisory action execution yet.
export const executeAdvisoryAction = () => Promise.resolve({ data: {} });
