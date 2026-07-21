const ZONES = [
  { id: 'kiln-area', name: 'Kiln Area', cameraId: 'CAM-01' },
  { id: 'raw-mill', name: 'Raw Mill', cameraId: 'CAM-02' },
  { id: 'packing', name: 'Packing', cameraId: 'CAM-03' },
  { id: 'loading-bay', name: 'Loading Bay', cameraId: 'CAM-04' },
  { id: 'conveyor-belt', name: 'Conveyor Belt', cameraId: 'CAM-05' },
  { id: 'clinker-silo', name: 'Clinker Silo', cameraId: 'CAM-06' },
];

const INCIDENT_TYPES = ['ppe_violation', 'restricted_zone_breach', 'proximity_alert'];

const state = {
  zones: Object.fromEntries(
    ZONES.map((z) => [z.id, {
      ppeCompliancePct: 90 + Math.random() * 8,
      status: 'normal',
      cameraOnline: true,
    }])
  ),
  metrics: {
    incidentResponseTimeSec: 20 + Math.random() * 15,
    falseAlarmRatePct: 3 + Math.random() * 4,
  },
};

function deriveZoneStatus(ppeCompliancePct) {
  if (ppeCompliancePct < 70) return 'critical';
  if (ppeCompliancePct < 85) return 'warning';
  return 'normal';
}

module.exports = { ZONES, INCIDENT_TYPES, state, deriveZoneStatus };
