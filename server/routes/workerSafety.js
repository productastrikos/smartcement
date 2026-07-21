const express = require('express');
const { ZONES, state } = require('../data/workerSafety');
const { getAlertsByCategory, acknowledgeAlert } = require('../data/alertsStore');

const router = express.Router();

function zoneRows() {
  return ZONES.map((z) => {
    const s = state.zones[z.id];
    return {
      zoneId: z.id,
      zone: z.name,
      cameraId: z.cameraId,
      ppeCompliancePct: Math.round(s.ppeCompliancePct),
      status: s.status,
      cameraOnline: s.cameraOnline,
    };
  });
}

router.get('/kpis', async (req, res) => {
  const zones = zoneRows();
  const avgPpe = zones.reduce((sum, z) => sum + z.ppeCompliancePct, 0) / zones.length;
  const camerasOnline = zones.filter((z) => z.cameraOnline).length;

  const dayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
  const allAlerts = await getAlertsByCategory('worker-safety-computer-vision');
  const incidents = allAlerts.filter((a) => a.createdAt >= dayAgo);
  const breachCount = incidents.filter((a) => a.subtype === 'restricted_zone_breach').length;

  res.json({
    ppeComplianceRatePct: Math.round(avgPpe),
    restrictedZoneBreachCount: breachCount,
    incidentResponseTimeSec: Math.round(state.metrics.incidentResponseTimeSec),
    cameraUptimePct: Number(((camerasOnline / zones.length) * 100).toFixed(1)),
    falseAlarmRatePct: Number(state.metrics.falseAlarmRatePct.toFixed(1)),
    activeZonesMonitored: zones.length,
    updatedAt: new Date().toISOString(),
  });
});

router.get('/zones', (req, res) => {
  res.json({ zones: zoneRows() });
});

router.get('/alerts', async (req, res) => {
  res.json({ alerts: await getAlertsByCategory('worker-safety-computer-vision') });
});

router.post('/alerts/:id/ack', async (req, res) => {
  const alert = await acknowledgeAlert(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ alert });
});

router.get('/incident-trend', async (req, res) => {
  const eightWeeksAgo = Date.now() - 8 * 7 * 86400000;
  const allAlerts = await getAlertsByCategory('worker-safety-computer-vision');
  const incidents = allAlerts.filter((a) => new Date(a.createdAt).getTime() >= eightWeeksAgo);

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const weekStart = eightWeeksAgo + i * 7 * 86400000;
    return { label: `Wk ${i + 1}`, start: weekStart, end: weekStart + 7 * 86400000 };
  });

  const trend = weeks.map((w) => ({
    week: w.label,
    count: incidents.filter((a) => {
      const t = new Date(a.createdAt).getTime();
      return t >= w.start && t < w.end;
    }).length,
  }));

  res.json({ trend });
});

module.exports = router;