const { MATERIALS, state } = require('../data/stockManagement');
const { addAlert, hasActiveAlertForAsset } = require('../data/alertsStore');
const { insertPlantMetric } = require('../db/pg-index');

const VARIANCE_BREACH_PCT = 3;
const STALE_SCAN_HOURS = 72;

function randomWalk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

async function tick() {
  const now = new Date().toISOString();
  let totalIntake = 0;
  let totalConsumption = 0;

  for (const mat of MATERIALS) {
    const s = state.materials[mat.id];

    const intake = Math.random() < 0.4 ? Math.random() * 40 : 0;
    const consumption = Math.random() * 55;
    s.physicalQtyTons = Math.max(0, s.physicalQtyTons + intake - consumption);
    // book quantity updates on a lag/independent cadence, creating drift/variance
    s.bookQtyTons = Math.max(0, s.bookQtyTons + intake - consumption * (0.9 + Math.random() * 0.2));
    totalIntake += intake;
    totalConsumption += consumption;

    // occasional drone/LiDAR rescan reconciles book vs physical and resets staleness
    if (Math.random() < 0.02) {
      s.bookQtyTons = s.physicalQtyTons * (0.995 + Math.random() * 0.01);
      s.lastScanAt = now;
    }

    const variancePct = s.bookQtyTons > 0 ? (Math.abs(s.bookQtyTons - s.physicalQtyTons) / s.bookQtyTons) * 100 : 0;
    const hoursSinceScan = (Date.now() - new Date(s.lastScanAt).getTime()) / 3600000;

    if (variancePct > VARIANCE_BREACH_PCT) {
      if (!(await hasActiveAlertForAsset(mat.id, '3d-stock-management'))) {
        await addAlert({
          type: variancePct > VARIANCE_BREACH_PCT * 1.5 ? 'critical' : 'warning',
          category: '3d-stock-management',
          subtype: 'variance_breach',
          title: `${mat.name} — book vs. physical variance exceeds threshold`,
          message: `Variance of ${variancePct.toFixed(1)}% detected between book (${Math.round(s.bookQtyTons)}t) and physical (${Math.round(s.physicalQtyTons)}t) stock. Reconciliation scan recommended.`,
          zone: mat.name,
          assetId: mat.id,
        });
      }
    } else if (hoursSinceScan > STALE_SCAN_HOURS) {
      if (!(await hasActiveAlertForAsset(mat.id, '3d-stock-management'))) {
        await addAlert({
          type: 'warning',
          category: '3d-stock-management',
          subtype: 'stale_scan',
          title: `${mat.name} — stale scan warning`,
          message: `No drone/LiDAR scan recorded for ${mat.name} in over ${Math.round(hoursSinceScan)}h. Schedule a rescan to keep book quantities accurate.`,
          zone: mat.name,
          assetId: mat.id,
        });
      }
    }
  }

  await insertPlantMetric('stock_intake', now, Number(totalIntake.toFixed(2)));
  await insertPlantMetric('stock_consumption', now, Number(totalConsumption.toFixed(2)));

  state.metrics.measurementAccuracyPct = randomWalk(state.metrics.measurementAccuracyPct, 0.15, 98.5, 99.9);
  state.metrics.surveyCycleTimeMin = randomWalk(state.metrics.surveyCycleTimeMin, 2, 75, 110);
  state.metrics.densityCalibrationAccuracyPct = randomWalk(state.metrics.densityCalibrationAccuracyPct, 0.2, 96.5, 99.5);
}

function startStockSimulationLoop(intervalMs = 8000) {
  tick().catch((err) => console.error('Stock simulation tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Stock simulation tick failed', err));
  }, intervalMs);
}

module.exports = { startStockSimulationLoop, tick };
