const { insertAlertRow } = require('../db/pg-index');
const { ZONES, INCIDENT_TYPES } = require('../data/workerSafety');

const INCIDENT_LABELS = {
  ppe_violation: 'PPE violation (missing helmet/vest)',
  restricted_zone_breach: 'restricted zone breach',
  proximity_alert: 'vehicle/pedestrian proximity alert',
};

const WEEKS = 8;

// Seeds 8 weeks of gradual, realistic worker-safety incident history so the
// "Incident Count Trend" chart doesn't show a flat line followed by a sudden
// spike, and the incident log/active-incident badges aren't empty on a fresh
// boot. Most incidents are resolved; the handful from the most recent day or
// two are left open so the live incident feed shows a realistic 2-10 active.
async function ensureWorkerSafetyIncidentHistory() {
  const now = Date.now();

  for (let week = 0; week < WEEKS; week++) {
    const weekStart = now - (WEEKS - week) * 7 * 86400000;
    const incidentCount = 2 + Math.floor(Math.random() * 4); // 2-5 per week

    for (let i = 0; i < incidentCount; i++) {
      const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
      const incidentType = INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)];
      const createdAt = new Date(weekStart + Math.random() * 7 * 86400000);
      const isRecent = week >= WEEKS - 1 && i >= incidentCount - 3;
      const responseMinutes = 1 + Math.random() * 4;
      const resolvedAt = isRecent ? null : new Date(createdAt.getTime() + responseMinutes * 60000);

      await insertAlertRow({
        alertId: `DEMO-WS-${week}-${i}`,
        type: Math.random() < 0.15 ? 'critical' : 'warning',
        category: 'worker-safety-computer-vision',
        subtype: incidentType,
        title: `${zone.name} — ${INCIDENT_LABELS[incidentType]}`,
        message: `${zone.cameraId} flagged ${INCIDENT_LABELS[incidentType]} in ${zone.name}.`,
        zone: zone.name,
        assetId: zone.cameraId,
        acknowledged: !!resolvedAt,
        createdAt: createdAt.toISOString(),
        resolvedAt: resolvedAt ? resolvedAt.toISOString() : null,
      });
    }
  }
}

module.exports = { ensureWorkerSafetyIncidentHistory };
