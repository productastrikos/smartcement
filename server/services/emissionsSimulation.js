const { state, PM_LIMIT_MGNM3, NOX_LIMIT_MGNM3, SO2_LIMIT_MGNM3 } = require('../data/emissionsTracking');
const { state: bagfilterState } = require('../data/bagfilter');
const { addAlert, hasActiveAlertForAsset } = require('../data/alertsStore');
const { insertPlantMetric } = require('../db/pg-index');

function randomWalk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

function avgDustMgNm3() {
  const readings = bagfilterState.compartments.map((c) => c.reading.emission_mgNm3);
  return readings.reduce((a, b) => a + b, 0) / readings.length;
}

async function checkThreshold(label, value, limit, assetId) {
  const ratio = value / limit;
  if (ratio >= 1) {
    if (!(await hasActiveAlertForAsset(assetId, 'emissions-carbon-tracking'))) {
      await addAlert({
        type: 'critical',
        category: 'emissions-carbon-tracking',
        subtype: 'breach',
        title: `${label} exceeds permit limit`,
        message: `${label} reading of ${value.toFixed(1)} mg/Nm³ exceeds the ${limit} mg/Nm³ regulatory permit limit.`,
        zone: 'Stack CEMS',
        assetId,
      });
    }
  } else if (ratio >= 0.8) {
    if (!(await hasActiveAlertForAsset(assetId, 'emissions-carbon-tracking'))) {
      await addAlert({
        type: 'warning',
        category: 'emissions-carbon-tracking',
        subtype: 'early_warning',
        title: `${label} approaching permit limit`,
        message: `${label} reading of ${value.toFixed(1)} mg/Nm³ is at ${(ratio * 100).toFixed(0)}% of the ${limit} mg/Nm³ permit limit.`,
        zone: 'Stack CEMS',
        assetId,
      });
    }
  }
}

async function tick() {
  const now = new Date().toISOString();

  state.noxMgNm3 = randomWalk(state.noxMgNm3, 25, 400, 900);
  state.so2MgNm3 = randomWalk(state.so2MgNm3, 12, 60, 220);
  const dustMgNm3 = avgDustMgNm3();

  await insertPlantMetric('emissions_dust_mgnm3', now, Number(dustMgNm3.toFixed(2)));
  await insertPlantMetric('emissions_nox_mgnm3', now, Number(state.noxMgNm3.toFixed(1)));
  await insertPlantMetric('emissions_so2_mgnm3', now, Number(state.so2MgNm3.toFixed(1)));

  await checkThreshold('PM (Dust)', dustMgNm3, PM_LIMIT_MGNM3, 'dust-cems');
  await checkThreshold('NOx', state.noxMgNm3, NOX_LIMIT_MGNM3, 'nox-cems');
  await checkThreshold('SO2', state.so2MgNm3, SO2_LIMIT_MGNM3, 'so2-cems');
}

function startEmissionsSimulationLoop(intervalMs = 8000) {
  tick().catch((err) => console.error('Emissions simulation tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Emissions simulation tick failed', err));
  }, intervalMs);
}

module.exports = { startEmissionsSimulationLoop, tick, avgDustMgNm3 };
