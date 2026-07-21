const express = require('express');
const { BASELINE_PROFILE_C, state } = require('../data/energyOptimization');
const { getAlertsByCategory, acknowledgeAlert } = require('../data/alertsStore');
const { getPlantMetricDailySum, getRecentOptimizationEvents } = require('../db/pg-index');

const router = express.Router();

router.get('/kpis', (req, res) => {
  const m = state.metrics;
  res.json({
    specificPowerKwhPerTon: Number(m.specificPowerKwhPerTon.toFixed(1)),
    specificThermalKcalPerKg: Math.round(m.specificThermalKcalPerKg),
    altFuelSubstitutionPct: Number(m.altFuelSubstitutionPct.toFixed(1)),
    throughputTonsPerHr: Math.round(m.throughputTonsPerHr),
    energySavingsPct: Number(m.energySavingsPct.toFixed(1)),
    thermalStabilityScore: Math.round(m.thermalStabilityScore),
    updatedAt: new Date().toISOString(),
  });
});

router.get('/kiln-profile', (req, res) => {
  res.json({
    profile: state.kilnProfile.map((p, i) => ({
      positionM: p.positionM,
      temperatureC: p.temperatureC,
      baselineC: BASELINE_PROFILE_C[i],
    })),
  });
});

router.get('/fuel-mix', (req, res) => {
  res.json({ fuelMix: state.fuelMix });
});

router.get('/alerts', async (req, res) => {
  res.json({ alerts: await getAlertsByCategory('kiln-energy-optimization') });
});

router.post('/alerts/:id/ack', async (req, res) => {
  const alert = await acknowledgeAlert(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ alert });
});

router.get('/savings-trend', async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const dailyRows = await getPlantMetricDailySum('energy_savings_usd_increment', thirtyDaysAgo);
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10));
  let cumulative = 0;
  const trend = days.map((day) => {
    cumulative += dailyRows.find((r) => r.day === day)?.total || 0;
    return { date: day, cumulativeSavingsUsd: Math.round(cumulative) };
  });
  res.json({ trend });
});

router.get('/events', async (req, res) => {
  res.json({ events: await getRecentOptimizationEvents(20) });
});

module.exports = router;