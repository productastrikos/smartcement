const EMISSION_LIMIT_MGNM3 = 30;
const HISTORY_LENGTH = 60;

const COMPARTMENTS = [
  { id: 'BH-1', label: 'Baghouse 1', zone: 'Raw Mill' },
  { id: 'BH-2', label: 'Baghouse 2', zone: 'Raw Mill' },
  { id: 'BH-3', label: 'Baghouse 3', zone: 'Kiln' },
  { id: 'BH-4', label: 'Baghouse 4', zone: 'Kiln' },
  { id: 'BH-5', label: 'Baghouse 5', zone: 'Clinker Cooler' },
  { id: 'BH-6', label: 'Baghouse 6', zone: 'Clinker Cooler' },
  { id: 'BH-7', label: 'Baghouse 7', zone: 'Cement Mill' },
  { id: 'BH-8', label: 'Baghouse 8', zone: 'Cement Mill' },
];

function makeReading(now) {
  return {
    differentialPressure_mbar: 9 + Math.random() * 4,
    airflow_m3h: 4800 + Math.random() * 600,
    acousticIndex_pct: 6 + Math.random() * 6,
    emission_mgNm3: 6 + Math.random() * 6,
    status: 'normal',
    bagBlindingEtaHours: null,
    updatedAt: now,
  };
}

function deriveStatus(reading) {
  const { differentialPressure_mbar: dp, acousticIndex_pct: acoustic, emission_mgNm3: emission } = reading;
  if (dp > 28 || emission > EMISSION_LIMIT_MGNM3) return 'critical';
  if (dp > 22 || acoustic > 35) return 'warning';
  if (dp > 18) return 'watch';
  return 'normal';
}

const now = new Date().toISOString();
const state = {
  compartments: COMPARTMENTS.map((c) => ({ ...c, reading: makeReading(now) })),
  history: Object.fromEntries(COMPARTMENTS.map((c) => [c.id, []])),
};

module.exports = {
  EMISSION_LIMIT_MGNM3,
  HISTORY_LENGTH,
  COMPARTMENTS,
  state,
  makeReading,
  deriveStatus,
};