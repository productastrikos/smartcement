const express = require('express');
const { PM_LIMIT_MGNM3, NOX_LIMIT_MGNM3, SO2_LIMIT_MGNM3, KG_PER_TON_FACTOR, state } = require('../data/emissionsTracking');
const { state: energyState } = require('../data/energyOptimization');
const { avgDustMgNm3 } = require('../services/emissionsSimulation');
const { getAlertsByCategory, acknowledgeAlert } = require('../data/alertsStore');
const { getLatestPlantMetric, getPlantMetricSeries, getPlantMetricDailyAvg } = require('../db/pg-index');

const router = express.Router();

router.get('/kpis', async (req, res) => {
  const dust = avgDustMgNm3();
  const co2 = await getLatestPlantMetric('co2PerTon');
  const allAlerts = await getAlertsByCategory('emissions-carbon-tracking');
  const unresolved = allAlerts.filter((a) => !a.acknowledged);
  const breaches = unresolved.filter((a) => a.subtype === 'breach').length;
  const warnings = unresolved.filter((a) => a.subtype === 'early_warning').length;

  const permitComplianceRatePct = Math.max(0, 100 - breaches * 25 - warnings * 8);
  const auditReadinessScore = Math.max(0, 100 - breaches * 15 - warnings * 5);

  res.json({
    co2PerTonKg: co2 ? Math.round(co2.value) : null,
    noxKgPerTon: Number((state.noxMgNm3 * KG_PER_TON_FACTOR).toFixed(2)),
    so2DustKgPerTon: Number(((state.so2MgNm3 + dust) * KG_PER_TON_FACTOR).toFixed(2)),
    altFuelThermalSubstitutionPct: Number(energyState.metrics.altFuelSubstitutionPct.toFixed(1)),
    permitComplianceRatePct,
    auditReadinessScore,
    updatedAt: new Date().toISOString(),
  });
});

router.get('/trend', async (req, res) => {
  const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
  const dust = await getPlantMetricSeries('emissions_dust_mgnm3', twoHoursAgo);
  const nox = await getPlantMetricSeries('emissions_nox_mgnm3', twoHoursAgo);
  const so2 = await getPlantMetricSeries('emissions_so2_mgnm3', twoHoursAgo);

  res.json({
    limits: { dust: PM_LIMIT_MGNM3, nox: NOX_LIMIT_MGNM3, so2: SO2_LIMIT_MGNM3 },
    dust: dust.map((r) => ({ t: r.ts, value: r.value })),
    nox: nox.map((r) => ({ t: r.ts, value: r.value })),
    so2: so2.map((r) => ({ t: r.ts, value: r.value })),
  });
});

router.get('/alt-fuel-trend', async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const rows = await getPlantMetricDailyAvg('alt_fuel_substitution_pct', thirtyDaysAgo);
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10));
  const trend = days.map((day) => ({
    date: day,
    substitutionPct: Number((rows.find((r) => r.day === day)?.avg ?? energyState.metrics.altFuelSubstitutionPct).toFixed(1)),
  }));
  res.json({ trend });
});

router.get('/readings-table', (req, res) => {
  const dust = avgDustMgNm3();
  const rows = [
    { parameter: 'PM (Dust)', value: Number(dust.toFixed(1)), permitLimit: PM_LIMIT_MGNM3 },
    { parameter: 'NOx', value: Number(state.noxMgNm3.toFixed(1)), permitLimit: NOX_LIMIT_MGNM3 },
    { parameter: 'SO2', value: Number(state.so2MgNm3.toFixed(1)), permitLimit: SO2_LIMIT_MGNM3 },
  ].map((r) => ({
    ...r,
    timestamp: new Date().toISOString(),
    status: r.value >= r.permitLimit ? 'breach' : r.value >= r.permitLimit * 0.8 ? 'warning' : 'normal',
  }));
  res.json({ readings: rows });
});

router.get('/alerts', async (req, res) => {
  res.json({ alerts: await getAlertsByCategory('emissions-carbon-tracking') });
});

router.post('/alerts/:id/ack', async (req, res) => {
  const alert = await acknowledgeAlert(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ alert });
});

module.exports = router;