const express = require('express');
const { ASSETS, state, deriveBaselineStatus, rulDaysFromHealth } = require('../data/predictiveMaintenance');
const { getAlertsByCategory, acknowledgeAlert } = require('../data/alertsStore');
const { getResolvedAlerts, getPlantMetricSeries } = require('../db/pg-index');

const router = express.Router();

function assetRows() {
  return ASSETS.map((a) => {
    const s = state.assets[a.id];
    return {
      assetId: a.id,
      type: a.type,
      name: a.name,
      healthScore: Math.round(s.healthScore),
      rulDays: rulDaysFromHealth(s.healthScore),
      lastMaintenanceAt: s.lastMaintenanceAt,
      baselineStatus: deriveBaselineStatus(s.healthScore),
      vibrationMmS: Number(s.vibrationMmS.toFixed(2)),
      temperatureC: Number(s.temperatureC.toFixed(1)),
    };
  });
}

router.get('/kpis', async (req, res) => {
  const rows = assetRows();
  const avgHealth = rows.reduce((sum, r) => sum + r.healthScore, 0) / rows.length;
  const minRul = Math.min(...rows.map((r) => r.rulDays));

  const resolved = await getResolvedAlerts('predictive-maintenance', 20);
  const durationsHours = resolved.map((a) => (new Date(a.resolvedAt) - new Date(a.createdAt)) / 3600000);
  const workOrderLeadTimeHours = durationsHours.length
    ? Number((durationsHours.reduce((a, b) => a + b, 0) / durationsHours.length).toFixed(1))
    : null;

  const avoidedDowntimeDays = resolved.length * 0.5;
  const avoidedDowntimeUsd = Math.round(avoidedDowntimeDays * 300000);

  const maintenanceCostPerAssetUsd = Math.round(8000 - avgHealth * 42);

  res.json({
    downtimeAvoidedUsd: avoidedDowntimeUsd,
    downtimeAvoidedDays: Number(avoidedDowntimeDays.toFixed(1)),
    assetHealthScoreAvg: Math.round(avgHealth),
    remainingUsefulLifeDays: minRul,
    maintenanceCostPerAssetUsd: Math.max(500, maintenanceCostPerAssetUsd),
    predictionAccuracyPct: Number(state.metrics.predictionAccuracyPct.toFixed(1)),
    workOrderLeadTimeHours,
    updatedAt: new Date().toISOString(),
  });
});

router.get('/assets', (req, res) => {
  res.json({ assets: assetRows() });
});

router.get('/alerts', async (req, res) => {
  res.json({ alerts: await getAlertsByCategory('predictive-maintenance') });
});

router.post('/alerts/:id/ack', async (req, res) => {
  const alert = await acknowledgeAlert(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ alert });
});

router.get('/assets/:assetId/trend', async (req, res) => {
  const asset = ASSETS.find((a) => a.id === req.params.assetId);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const sinceIso = new Date(Date.now() - 2 * 3600000).toISOString();
  const vibration = await getPlantMetricSeries(`asset_vibration_${asset.id}`, sinceIso);
  const temperature = await getPlantMetricSeries(`asset_temp_${asset.id}`, sinceIso);

  res.json({
    assetId: asset.id,
    vibration: vibration.map((r) => ({ t: r.ts, value: r.value })),
    temperature: temperature.map((r) => ({ t: r.ts, value: r.value })),
  });
});

module.exports = router;