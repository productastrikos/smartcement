const {
  insertAlertRow,
  resolveAlertRow,
  getAlerts: dbGetAlerts,
  getAlertsByCategory: dbGetAlertsByCategory,
  hasActiveAlertForAsset: dbHasActiveAlertForAsset,
  capActiveAlertsForCategory,
} = require('../db/pg-index');

let seq = 1;

// Keeps each module's "active alerts" count in the realistic 2-10 range a
// demo plant would show, rather than growing unbounded over a long-running
// session.
const MAX_ACTIVE_ALERTS_PER_CATEGORY = 10;

async function addAlert(partial) {
  const alertId = `ALT-${Date.now()}-${String(seq++).padStart(3, '0')}`;
  const alert = {
    alertId,
    type: 'info',
    category: 'bag-filter',
    title: '',
    message: '',
    zone: '',
    assetId: '',
    acknowledged: false,
    createdAt: new Date().toISOString(),
    ...partial,
  };
  await insertAlertRow(alert);
  await capActiveAlertsForCategory(alert.category, MAX_ACTIVE_ALERTS_PER_CATEGORY, new Date().toISOString());
  return alert;
}

async function getAlerts() {
  return dbGetAlerts();
}

async function getAlertsByCategory(category) {
  return dbGetAlertsByCategory(category);
}

async function acknowledgeAlert(alertId) {
  await resolveAlertRow(alertId, new Date().toISOString());
  const alerts = await getAlerts();
  return alerts.find((a) => a.alertId === alertId);
}

async function hasActiveAlertForAsset(assetId, category) {
  return dbHasActiveAlertForAsset(assetId, category);
}

module.exports = { addAlert, getAlerts, getAlertsByCategory, acknowledgeAlert, hasActiveAlertForAsset };