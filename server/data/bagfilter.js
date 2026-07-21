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

// Hydrates live state from the database so the current reading and trend
// chart continue seamlessly from real persisted history instead of resetting
// to fresh random values on every server restart.
// CHANGED: now async, uses pg-index instead of old SQLite db
async function hydrateFromDb() {
  const { getReadingsSince } = require('../db/pg-index');   // CHANGED
  const sinceIso = new Date(Date.now() - HISTORY_LENGTH * 2 * 60000).toISOString();

  for (const compartment of state.compartments) {
    const allRows = await getReadingsSince(compartment.id, sinceIso);   // CHANGED: added await
    const rows = allRows.slice(-HISTORY_LENGTH);
    if (rows.length === 0) continue;

    const last = rows[rows.length - 1];
    compartment.reading = {
      differentialPressure_mbar: last.differential_pressure,
      airflow_m3h: last.airflow,
      acousticIndex_pct: last.acoustic_index,
      emission_mgNm3: last.emission,
      status: last.status,
      bagBlindingEtaHours: compartment.reading.bagBlindingEtaHours,
      updatedAt: last.ts,
    };

    state.history[compartment.id] = rows.map((r) => ({
      t: r.ts,
      differentialPressure_mbar: r.differential_pressure,
      emission_mgNm3: r.emission,
    }));
  }
}

module.exports = {
  EMISSION_LIMIT_MGNM3,
  HISTORY_LENGTH,
  COMPARTMENTS,
  state,
  makeReading,
  deriveStatus,
  hydrateFromDb,
};