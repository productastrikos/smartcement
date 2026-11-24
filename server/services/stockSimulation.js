const { MATERIALS, BASE_QTY_TONS, state } = require('../data/stockManagement');
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
    const base = BASE_QTY_TONS[mat.id];

    // Intake/consumption scale with each material's own stockpile size (as a
    // % of its base quantity) so a small pile (e.g. Fly Ash at 1,400t) drains
    // at a proportional rate instead of the same flat tonnage as the largest
    // pile (e.g. Limestone at 18,000t), which would otherwise hit zero within
    // minutes of simulated time.
    const intake = Math.random() < 0.4 ? base * (0.01 + Math.random() * 0.02) : 0;
    const consumption = base * (0.008 + Math.random() * 0.018);
    s.physicalQtyTons = Math.max(0, s.physicalQtyTons + intake - consumption);
    // book quantity updates on a lag/independent cadence, creating drift/variance
    s.bookQtyTons = Math.max(0, s.bookQtyTons + intake - consumption * (0.9 + Math.random() * 0.2));
    totalIntake += intake;
    totalConsumption += consumption;

    // Gentle pull back toward the material's normal stockpile size so a long
    // run of consumption-heavy ticks can't drain a pile toward zero — mirrors
    // a real plant's reorder point triggering a resupply.
    if (s.physicalQtyTons < base * 0.4) {
      s.physicalQtyTons += base * (0.03 + Math.random() * 0.04);
      s.bookQtyTons += base * (0.03 + Math.random() * 0.04);
    }

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
