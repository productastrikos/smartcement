const { ZONES, INCIDENT_TYPES, state, deriveZoneStatus } = require('../data/workerSafety');
const { addAlert, hasActiveAlertForAsset } = require('../data/alertsStore');

function randomWalk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

const INCIDENT_LABELS = {
  ppe_violation: 'PPE violation (missing helmet/vest)',
  restricted_zone_breach: 'restricted zone breach',
  proximity_alert: 'vehicle/pedestrian proximity alert',
};

async function tick() {
  const now = new Date().toISOString();

  state.metrics.incidentResponseTimeSec = randomWalk(state.metrics.incidentResponseTimeSec, 3, 8, 90);
  state.metrics.falseAlarmRatePct = randomWalk(state.metrics.falseAlarmRatePct, 0.4, 1, 12);

  for (const zone of ZONES) {
    const s = state.zones[zone.id];
    const driftBias = Math.random() < 0.05 ? Math.random() * 20 : 0;
    s.ppeCompliancePct = randomWalk(s.ppeCompliancePct - driftBias * 0.3, 2, 55, 100);

    // rare camera outage
    if (Math.random() < 0.01) s.cameraOnline = false;
    if (!s.cameraOnline && Math.random() < 0.3) s.cameraOnline = true;

    const prevStatus = s.status;
    s.status = deriveZoneStatus(s.ppeCompliancePct);

    if (s.status !== prevStatus && (s.status === 'warning' || s.status === 'critical')) {
      if (!(await hasActiveAlertForAsset(zone.cameraId, 'worker-safety-computer-vision'))) {
        const incidentType = INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)];
        await addAlert({
          type: s.status === 'critical' ? 'critical' : 'warning',
          category: 'worker-safety-computer-vision',
          subtype: incidentType,
          title: `${zone.name} — ${INCIDENT_LABELS[incidentType]}`,
          message: `${zone.cameraId} flagged ${INCIDENT_LABELS[incidentType]} in ${zone.name}. PPE compliance in zone: ${Math.round(s.ppeCompliancePct)}%.`,
          zone: zone.name,
          assetId: zone.cameraId,
        });
      }
    }

    if (s.status === 'warning' || s.status === 'critical') {
      s.ppeCompliancePct = randomWalk(s.ppeCompliancePct + 3, 2, 55, 100);
    }
  }
}

function startWorkerSafetySimulationLoop(intervalMs = 8000) {
  tick().catch((err) => console.error('Worker safety simulation tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Worker safety simulation tick failed', err));
  }, intervalMs);
}

module.exports = { startWorkerSafetySimulationLoop, tick };
