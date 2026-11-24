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

// Reading bands keyed by starting condition — used to seed a realistic
// plant-wide distribution (most compartments normal, a couple in warning,
// only one in critical) instead of every compartment being independently
// randomized around the same midpoint.
const READING_BANDS = {
  normal: { dp: [10, 18], emission: [15, 25], acoustic: [8, 18] },
  warning: { dp: [22, 27], emission: [24, 28], acoustic: [22, 30] },
  critical: { dp: [29, 33], emission: [31, 36], acoustic: [36, 42] },
};

function randIn([min, max]) {
  return min + Math.random() * (max - min);
}

function makeReading(now, band = 'normal') {
  const b = READING_BANDS[band] || READING_BANDS.normal;
  return {
    differentialPressure_mbar: randIn(b.dp),
    airflow_m3h: 4800 + Math.random() * 600,
    acousticIndex_pct: randIn(b.acoustic),
    emission_mgNm3: randIn(b.emission),
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

// Seed distribution: 5 normal, 2 warning, 1 critical across the 8 compartments.
const SEED_BANDS = ['normal', 'normal', 'normal', 'normal', 'normal', 'warning', 'warning', 'critical'];

const now = new Date().toISOString();
const state = {
  compartments: COMPARTMENTS.map((c, i) => ({ ...c, reading: makeReading(now, SEED_BANDS[i]) })),
  history: Object.fromEntries(COMPARTMENTS.map((c) => [c.id, []])),
};
state.compartments.forEach((c) => { c.reading.status = deriveStatus(c.reading); });

module.exports = {
  EMISSION_LIMIT_MGNM3,
  HISTORY_LENGTH,
  COMPARTMENTS,
  state,
  makeReading,
  deriveStatus,
};