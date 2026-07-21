const {
  insertAlertRow,
  resolveAlertRow,
  getAlerts: dbGetAlerts,
  getAlertsByCategory: dbGetAlertsByCategory,
  hasActiveAlertForAsset: dbHasActiveAlertForAsset,
} = require('../db/pg-index');

let seq = 1;

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