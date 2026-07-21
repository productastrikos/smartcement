const express = require('express');
const { PLANTS, state } = require('../data/controlCentre');
const { getAlertsByCategory, acknowledgeAlert } = require('../data/alertsStore');
const { getSubtypeCountsPerDaySince } = require('../db/pg-index');

const router = express.Router();

const HOME_PLANT_ID = PLANTS.find((p) => p.isHome).id;

function computeBenchmarkScore(plantId) {
  const values = PLANTS.map((p) => state.plants[p.id]);
  const maxAvail = Math.max(...values.map((v) => v.availabilityPct));
  const maxMtbf = Math.max(...values.map((v) => v.mtbfHours));
  const maxUptime = Math.max(...values.map((v) => v.uptimePct));
  const m = state.plants[plantId];
  const score = (
    (m.availabilityPct / maxAvail) * 40 +
    (m.mtbfHours / maxMtbf) * 30 +
    (m.uptimePct / maxUptime) * 30
  );
  return Number(score.toFixed(1));
}

router.get('/kpis', (req, res) => {
  const m = state.plants[HOME_PLANT_ID];
  res.json({
    equipmentAvailabilityPct: Number(m.availabilityPct.toFixed(1)),
    maintenanceCostReductionPct: Number(m.maintenanceCostReductionPct.toFixed(1)),
    mtbfHours: Math.round(m.mtbfHours),
    crossPlantBenchmarkScore: computeBenchmarkScore(HOME_PLANT_ID),
    timeToCorrectiveActionMin: Math.round(m.timeToCorrectiveActionMin),
    systemUptimePct: Number(m.uptimePct.toFixed(2)),
    updatedAt: new Date().toISOString(),
  });
});

router.get('/plants', (req, res) => {
  const rows = PLANTS.map((p) => {
    const m = state.plants[p.id];
    return {
      plantId: p.id,
      plant: p.name,
      isHome: !!p.isHome,
      oeePct: Number(m.oeePct.toFixed(1)),
      availabilityPct: Number(m.availabilityPct.toFixed(1)),
      mtbfHours: Math.round(m.mtbfHours),
      maintenanceCostUsdPerTon: Number(m.maintenanceCostUsdPerTon.toFixed(2)),
    };
  });
  rows.sort((a, b) => b.oeePct - a.oeePct);
  rows.forEach((r, i) => { r.rank = i + 1; });
  res.json({ plants: rows });
});

router.get('/deviations', async (req, res) => {
  res.json({ deviations: await getAlertsByCategory('smart-control-centre') });
});

router.post('/deviations/:id/ack', async (req, res) => {
  const alert = await acknowledgeAlert(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Deviation not found' });
  res.json({ alert });
});

router.get('/deviation-trend', async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const rows = await getSubtypeCountsPerDaySince('smart-control-centre', sevenDaysAgo);
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10));
  const trend = days.map((day) => {
    const dayRows = rows.filter((r) => r.day === day);
    return {
      date: day,
      safety: dayRows.find((r) => r.subtype === 'safety')?.count || 0,
      environment: dayRows.find((r) => r.subtype === 'environment')?.count || 0,
      efficiency: dayRows.find((r) => r.subtype === 'efficiency')?.count || 0,
      quality: dayRows.find((r) => r.subtype === 'quality')?.count || 0,
    };
  });
  res.json({ trend });
});

module.exports = router;