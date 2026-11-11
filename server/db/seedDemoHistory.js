const {
  insertPlantMetric,
  insertDowntimeEvent,
  insertQualityBatch,
} = require('./pg-index');

const DAYS = 30;

function isoAt(daysAgo, hour = 12) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function jitter(target, spread) {
  return target + (Math.random() - 0.5) * spread;
}

// Backfills 30 days of plant metrics, downtime events, and quality batches so
// dashboard/KPI endpoints that aggregate over trailing windows (7/14/30 days)
// show real values immediately instead of staying empty until the live
// simulation loops have had time to accumulate data.
async function seedDemoHistory() {
  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const ts = isoAt(daysAgo);

    await insertPlantMetric('oee', ts, Number(jitter(85, 6).toFixed(2)));
    await insertPlantMetric('energyPerTon', ts, Number(jitter(100, 8).toFixed(2)));
    await insertPlantMetric('co2PerTon', ts, Number(jitter(820, 20).toFixed(2)));
    await insertPlantMetric('energy_savings_usd_increment', ts, Number(jitter(900, 400).toFixed(2)));
    await insertPlantMetric('alt_fuel_substitution_pct', ts, Number(jitter(24, 10).toFixed(1)));
    await insertPlantMetric('stock_intake', ts, Number(jitter(220, 80).toFixed(2)));
    await insertPlantMetric('stock_consumption', ts, Number(jitter(260, 70).toFixed(2)));

    if (Math.random() < 0.3) {
      const moduleIds = ['smart-control-centre', '3d-stock-management', 'predictive-maintenance', 'kiln-energy-optimization', 'quality-prediction-lab-automation', 'worker-safety-computer-vision', 'emissions-carbon-tracking'];
      const moduleId = moduleIds[Math.floor(Math.random() * moduleIds.length)];
      await insertDowntimeEvent(moduleId, Math.round(15 + Math.random() * 75), ts);
    }

    const batchesToday = 1 + Math.floor(Math.random() * 2);
    for (let b = 0; b < batchesToday; b++) {
      const batchTs = isoAt(daysAgo, 8 + b * 6);
      const offSpec = Math.random() < 0.12;
      const driftBias = offSpec ? (Math.random() < 0.5 ? 1 : -1) : 0;
      await insertQualityBatch({
        batchId: `B-SEED-${daysAgo}-${b}`,
        ts: batchTs,
        predictedFreeLime: Number(jitter(1.5, 0.6).toFixed(2)),
        measuredFreeLime: Number((1.5 + driftBias * 0.9 + jitter(0, 0.3)).toFixed(2)),
        predictedFineness: Math.round(jitter(3400, 300)),
        measuredFineness: Math.round(3400 + driftBias * -250 + jitter(0, 150)),
        predictedStrength: Number(jitter(42.5, 4).toFixed(1)),
        measuredStrength: Number((42.5 + driftBias * -3.5 + jitter(0, 2)).toFixed(1)),
        status: offSpec ? 'off-spec' : 'in-spec',
      });
    }
  }
}

module.exports = { seedDemoHistory };
