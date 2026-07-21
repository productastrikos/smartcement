const express = require('express');
const { state, EMISSION_LIMIT_MGNM3 } = require('../data/bagfilter');
const { getAlerts, acknowledgeAlert } = require('../data/alertsStore');
const { getResolvedAlerts } = require('../db/pg-index');   // <-- CHANGED: now points to Postgres
const { getTrend } = require('../data/kpiTrends');
const { generateAdvisories } = require('../services/advisories');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    emissionLimitMgNm3: EMISSION_LIMIT_MGNM3,
    compartments: state.compartments.map((c) => ({
      id: c.id,
      label: c.label,
      zone: c.zone,
      reading: c.reading,
      history: state.history[c.id],
    })),
    updatedAt: new Date().toISOString(),
  });
});

router.get('/alerts', async (req, res) => {
  const allAlerts = await getAlerts();
  res.json({ alerts: allAlerts.filter((a) => a.category === 'bag-filter') });
});

router.post('/alerts/:id/ack', async (req, res) => {
  const alert = await acknowledgeAlert(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ alert });
});

function dailySeriesKpi(key) {
  const series = getTrend(key);
  const latest = series[series.length - 1];
  const previous = series[series.length - 2] || latest;
  return {
    value: latest.value,
    deltaVsYesterday: Number((latest.value - previous.value).toFixed(2)),
    series,
    table: series.map((p) => ({ date: p.t.slice(0, 10), value: p.value })),
  };
}

// CHANGED: route handler is now async
router.get('/kpis', async (req, res) => {
  const compartments = state.compartments;

  const activePredictions = compartments
    .filter((c) => c.reading.bagBlindingEtaHours != null)
    .map((c) => ({ id: c.id, zone: c.zone, etaHours: c.reading.bagBlindingEtaHours, status: c.reading.status }));

  const leadTimeHours = activePredictions.map((p) => p.etaHours);
  const bagFailureLeadTime = {
    hasActive: activePredictions.length > 0,
    minHours: leadTimeHours.length ? Math.min(...leadTimeHours) : 48,
    maxHours: leadTimeHours.length ? Math.max(...leadTimeHours) : 96,
    activePredictions,
  };

  // CHANGED: added await since getResolvedAlerts is now async
  const resolved = await getResolvedAlerts('bag-filter', 20);
  const durationsHours = resolved.map((a) => (new Date(a.resolvedAt) - new Date(a.createdAt)) / 3600000);
  const mttr = {
    hours: durationsHours.length ? Number((durationsHours.reduce((a, b) => a + b, 0) / durationsHours.length).toFixed(2)) : null,
    sampleSize: durationsHours.length,
    recent: resolved.map((a, i) => ({
      alertId: a.alertId,
      title: a.title,
      zone: a.zone,
      createdAt: a.createdAt,
      resolvedAt: a.resolvedAt,
      durationHours: Number(durationsHours[i].toFixed(2)),
    })),
  };

  const allCompartments = compartments.map((c) => ({
    id: c.id,
    zone: c.zone,
    differentialPressure: Number(c.reading.differentialPressure_mbar.toFixed(1)),
    status: c.reading.status,
  }));
  const pressureDeviation = {
    count: allCompartments.filter((c) => c.status !== 'normal').length,
    totalCompartments: compartments.length,
    compartments: allCompartments,
  };

  res.json({
    filterBagLife: dailySeriesKpi('filterBagLife'),
    compressedAir: dailySeriesKpi('compressedAir'),
    particulateEmissions: dailySeriesKpi('particulateEmissions'),
    bagFailureLeadTime,
    mttr,
    pressureDeviation,
    updatedAt: new Date().toISOString(),
  });
});

router.get('/advisories', async (req, res) => {
  res.json({ advisories: await generateAdvisories() });
});

module.exports = router;