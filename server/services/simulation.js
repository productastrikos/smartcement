const { state, deriveStatus, HISTORY_LENGTH, EMISSION_LIMIT_MGNM3 } = require('../data/bagfilter');
const { addAlert, hasActiveAlertForAsset } = require('../data/alertsStore');
const { insertReading } = require('../db/pg-index');
const { nudgeToday } = require('../data/kpiTrends');

function randomWalk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

async function tick() {
  const now = new Date().toISOString();

  for (const compartment of state.compartments) {
    const r = compartment.reading;

    // occasional drift event nudges a compartment toward degraded readings
    const driftBias = Math.random() < 0.06 ? Math.random() * 3 : 0;

    r.differentialPressure_mbar = randomWalk(r.differentialPressure_mbar + driftBias * 0.4, 1.2, 6, 32);
    r.airflow_m3h = randomWalk(r.airflow_m3h, 150, 3800, 5800);
    r.acousticIndex_pct = randomWalk(r.acousticIndex_pct + driftBias * 0.8, 2.5, 3, 42);
    r.emission_mgNm3 = randomWalk(r.emission_mgNm3 + driftBias * 0.6, 1.5, 3, 36);
    r.updatedAt = now;

    const prevStatus = r.status;
    r.status = deriveStatus(r);

    if (r.status === 'warning' || r.status === 'critical') {
      r.bagBlindingEtaHours = r.status === 'critical'
        ? Math.round(12 + Math.random() * 24)
        : Math.round(48 + Math.random() * 48);
    } else {
      r.bagBlindingEtaHours = null;
    }

    if (r.status !== prevStatus && (r.status === 'warning' || r.status === 'critical')) {
      if (!(await hasActiveAlertForAsset(compartment.id, 'bag-filter'))) {
        await addAlert({
          type: r.status === 'critical' ? 'critical' : 'warning',
          category: 'bag-filter',
          title:
            r.status === 'critical'
              ? `${compartment.label} — emission/pressure threshold breached`
              : `${compartment.label} — early bag blinding signature detected`,
          message:
            r.status === 'critical'
              ? `Differential pressure ${r.differentialPressure_mbar.toFixed(1)} mbar / emission ${r.emission_mgNm3.toFixed(1)} mg/Nm³ exceeds limit (${EMISSION_LIMIT_MGNM3} mg/Nm³). Immediate inspection required.`
              : `AI model flags likely bag blinding in ${r.bagBlindingEtaHours}h based on pressure and acoustic drift. Schedule inspection.`,
          zone: compartment.zone,
          assetId: compartment.id,
        });
      }
    }

    const history = state.history[compartment.id];
    history.push({
      t: now,
      differentialPressure_mbar: Number(r.differentialPressure_mbar.toFixed(2)),
      emission_mgNm3: Number(r.emission_mgNm3.toFixed(2)),
    });
    if (history.length > HISTORY_LENGTH) history.shift();

    await insertReading({
      compartmentId: compartment.id,
      zone: compartment.zone,
      ts: now,
      differentialPressure: Number(r.differentialPressure_mbar.toFixed(2)),
      airflow: Math.round(r.airflow_m3h),
      acousticIndex: Number(r.acousticIndex_pct.toFixed(2)),
      emission: Number(r.emission_mgNm3.toFixed(2)),
      status: r.status,
    });
  }

  nudgeToday();
}

function startSimulationLoop(intervalMs = 8000) {
  tick().catch((err) => console.error('Bag filter simulation tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Bag filter simulation tick failed', err));
  }, intervalMs);
}

module.exports = { startSimulationLoop, tick };
