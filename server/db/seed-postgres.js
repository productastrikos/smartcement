/**
 * seed-postgres.js
 * Populates realistic demo data into the PostgreSQL tables that match
 * server/db/pg-index.js (readings, alerts, plant_metrics, downtime_events,
 * optimization_events, quality_batches).
 *
 * Run with:  node db/seed-postgres.js
 * (run from inside the `server` folder so .env / require paths resolve)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DAYS = 30;
const now = Date.now();
const isoDaysAgo = (d) => new Date(now - d * 86400000).toISOString();

function rand(min, max) {
  return min + Math.random() * (max - min);
}

async function clearExisting() {
  console.log('Clearing existing rows...');
  await pool.query('DELETE FROM readings');
  await pool.query('DELETE FROM alerts');
  await pool.query('DELETE FROM plant_metrics');
  await pool.query('DELETE FROM downtime_events');
  await pool.query('DELETE FROM optimization_events');
  await pool.query('DELETE FROM quality_batches');
}

async function seedReadings() {
  console.log('Seeding bag filter readings...');
  const compartments = [
    { id: 'C1', zone: 'Raw Mill' }, { id: 'C2', zone: 'Raw Mill' },
    { id: 'C3', zone: 'Kiln' }, { id: 'C4', zone: 'Kiln' },
    { id: 'C5', zone: 'Clinker Cooler' }, { id: 'C6', zone: 'Clinker Cooler' },
    { id: 'C7', zone: 'Kiln' }, { id: 'C8', zone: 'Cement Mill' },
    { id: 'C9', zone: 'Cement Mill' }, { id: 'C10', zone: 'Raw Mill' },
    { id: 'C11', zone: 'Clinker Cooler' }, { id: 'C12', zone: 'Cement Mill' },
  ];

  for (const c of compartments) {
    // last 24 hours, one reading every 2 hours
    for (let h = 24; h >= 0; h -= 2) {
      const ts = new Date(now - h * 3600000).toISOString();
      const isProblem = c.id === 'C3' || c.id === 'C7';
      const pressure = isProblem ? rand(1700, 1900) : rand(1250, 1400);
      const status = pressure > 1500 ? (pressure > 1750 ? 'critical' : 'warning') : 'normal';
      await pool.query(
        `INSERT INTO readings (compartment_id, zone, ts, differential_pressure, airflow, acoustic_index, emission, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [c.id, c.zone, ts, pressure, rand(3600, 4300), isProblem ? rand(60, 90) : rand(10, 30), rand(9, 17), status]
      );
    }
  }
}

async function seedAlerts() {
  console.log('Seeding alerts...');

  const alerts = [
    // Bag filter
    { category: 'bag-filter', subtype: null, type: 'warning', title: 'Compartment 7 — bag blinding predicted',
      message: 'Failure window: 72 hours, acoustic sensor flagged 6 days ago', zone: 'Kiln', assetId: 'C7',
      createdAt: isoDaysAgo(2), resolvedAt: null },
    { category: 'bag-filter', subtype: null, type: 'critical', title: 'Compartment 3 — differential pressure out of range',
      message: 'Reading 1,842 Pa vs 1,200-1,500 Pa normal band', zone: 'Kiln', assetId: 'C3',
      createdAt: isoDaysAgo(0.25), resolvedAt: null },
    { category: 'bag-filter', subtype: null, type: 'warning', title: 'Compartment 5 — acoustic valve leak',
      message: 'Diaphragm leak detected by acoustic sensor', zone: 'Clinker Cooler', assetId: 'C5',
      createdAt: isoDaysAgo(10), resolvedAt: isoDaysAgo(9.8) },

    // Control centre
    { category: 'smart-control-centre', subtype: 'efficiency', type: 'warning', title: 'Kiln throughput 4% below target',
      message: 'Throughput dip detected over last shift', zone: null, assetId: null,
      createdAt: isoDaysAgo(1), resolvedAt: null },
    { category: 'smart-control-centre', subtype: 'safety', type: 'info', title: 'Raw Mill — vehicle/pedestrian proximity alert',
      message: 'Resolved after supervisor review', zone: 'Raw Mill', assetId: null,
      createdAt: isoDaysAgo(3), resolvedAt: isoDaysAgo(2.9) },
    { category: 'smart-control-centre', subtype: 'quality', type: 'warning', title: 'Quality deviation flagged',
      message: 'Free lime trending high on line 2', zone: null, assetId: null,
      createdAt: isoDaysAgo(5), resolvedAt: isoDaysAgo(4.7) },
    { category: 'smart-control-centre', subtype: 'environment', type: 'info', title: 'Minor dust excursion, self-corrected',
      message: 'Within permit limits throughout', zone: null, assetId: null,
      createdAt: isoDaysAgo(6), resolvedAt: isoDaysAgo(5.9) },

    // Predictive maintenance
    { category: 'predictive-maintenance', subtype: null, type: 'warning', title: 'Mill Gearbox 2 — bearing wear detected',
      message: 'Vibration trending up over last 5 days', zone: null, assetId: 'mill-gearbox-2',
      createdAt: isoDaysAgo(1.5), resolvedAt: null },
    { category: 'predictive-maintenance', subtype: null, type: 'info', title: 'Kiln Drive 1 — routine inspection due',
      message: 'Scheduled maintenance window in 20 days', zone: null, assetId: 'kiln-drive-1',
      createdAt: isoDaysAgo(2), resolvedAt: isoDaysAgo(1.7) },
    { category: 'predictive-maintenance', subtype: null, type: 'warning', title: 'Cooler Fan 3 — baseline still training',
      message: 'Model requires more data before reliable prediction', zone: null, assetId: 'cooler-fan-3',
      createdAt: isoDaysAgo(4), resolvedAt: isoDaysAgo(3.6) },

    // Kiln / energy
    { category: 'kiln-energy-optimization', subtype: null, type: 'info', title: 'Kiln fan speed optimized',
      message: 'Reduced from 82% to 76%, saving est. $4,200/month', zone: null, assetId: null,
      createdAt: isoDaysAgo(3), resolvedAt: isoDaysAgo(2.9) },
    { category: 'kiln-energy-optimization', subtype: null, type: 'warning', title: 'Thermal profile deviation, section 4',
      message: 'Temperature 18C above baseline', zone: null, assetId: null,
      createdAt: isoDaysAgo(0.5), resolvedAt: null },

    // Quality
    { category: 'quality-prediction-lab-automation', subtype: null, type: 'warning', title: 'Batch 2 flagged off-spec',
      message: 'Free lime measured 2.1 vs 1.8 predicted', zone: null, assetId: null,
      createdAt: isoDaysAgo(1), resolvedAt: isoDaysAgo(0.9) },

    // Worker safety
    { category: 'worker-safety-computer-vision', subtype: 'proximity_alert', type: 'warning', title: 'Raw Mill — proximity alert',
      message: 'Vehicle/pedestrian proximity breach detected', zone: 'Raw Mill', assetId: 'CAM-02',
      createdAt: isoDaysAgo(0.007), resolvedAt: null },
    { category: 'worker-safety-computer-vision', subtype: 'ppe_violation', type: 'info', title: 'Kiln Area — PPE violation',
      message: 'Missing hard hat detected, resolved', zone: 'Kiln Area', assetId: 'CAM-01',
      createdAt: isoDaysAgo(0.008), resolvedAt: isoDaysAgo(0.007) },
    { category: 'worker-safety-computer-vision', subtype: 'restricted_zone_breach', type: 'warning', title: 'Loading Bay — restricted zone breach',
      message: 'Unauthorized entry detected', zone: 'Loading Bay', assetId: 'CAM-04',
      createdAt: isoDaysAgo(2), resolvedAt: isoDaysAgo(1.9) },

    // Emissions
    { category: 'emissions-carbon-tracking', subtype: 'early_warning', type: 'warning', title: 'NOx approaching permit limit',
      message: 'Reading at 82% of permit limit', zone: null, assetId: null,
      createdAt: isoDaysAgo(1), resolvedAt: null },

    // Stock management
    { category: '3d-stock-management', subtype: null, type: 'warning', title: 'Gypsum pile — stale scan',
      message: 'Last surveyed 34 days ago, exceeds 30-day policy', zone: null, assetId: 'gypsum',
      createdAt: isoDaysAgo(4), resolvedAt: null },
    { category: '3d-stock-management', subtype: null, type: 'warning', title: 'Coal pile — variance above threshold',
      message: 'Book vs physical gap of $18,400', zone: null, assetId: 'coal',
      createdAt: isoDaysAgo(2), resolvedAt: null },
  ];

  for (let i = 0; i < alerts.length; i++) {
    const a = alerts[i];
    await pool.query(
      `INSERT INTO alerts (alert_id, type, category, subtype, title, message, zone, asset_id, acknowledged, created_at, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [`seed-alert-${i + 1}`, a.type, a.category, a.subtype, a.title, a.message, a.zone, a.assetId,
       a.resolvedAt ? 1 : 0, a.createdAt, a.resolvedAt]
    );
  }
}

async function seedPlantMetrics() {
  console.log('Seeding plant metrics (oee, energyPerTon, co2PerTon, and module-specific series)...');

  const dailyMetrics = [
    { key: 'oee', base: 85, spread: 4 },
    { key: 'energyPerTon', base: 68, spread: 6 },
    { key: 'co2PerTon', base: 820, spread: 40 },
    { key: 'stock_intake', base: 440, spread: 60 },
    { key: 'stock_consumption', base: 450, spread: 50 },
    { key: 'energy_savings_usd_increment', base: 140, spread: 60 },
    { key: 'alt_fuel_substitution_pct', base: 22, spread: 3 },
    { key: 'emissions_dust_mgnm3', base: 14, spread: 3 },
    { key: 'emissions_nox_mgnm3', base: 410, spread: 30 },
    { key: 'emissions_so2_mgnm3', base: 90, spread: 15 },
  ];

  for (const m of dailyMetrics) {
    for (let d = DAYS; d >= 0; d--) {
      const ts = isoDaysAgo(d);
      const value = m.base + rand(-m.spread, m.spread);
      await pool.query(
        `INSERT INTO plant_metrics (metric_key, ts, value) VALUES ($1,$2,$3)`,
        [m.key, ts, Number(value.toFixed(2))]
      );
    }
  }

  // Asset vibration/temperature series (last 2 hours, hourly-ish granularity)
  const assets = ['kiln-drive-1', 'mill-gearbox-2', 'cooler-fan-3'];
  for (const assetId of assets) {
    for (let h = 2; h >= 0; h -= 0.25) {
      const ts = new Date(now - h * 3600000).toISOString();
      const vibBase = assetId === 'mill-gearbox-2' ? 5.5 : 3;
      const tempBase = assetId === 'mill-gearbox-2' ? 72 : 65;
      await pool.query(`INSERT INTO plant_metrics (metric_key, ts, value) VALUES ($1,$2,$3)`,
        [`asset_vibration_${assetId}`, ts, Number(rand(vibBase - 0.5, vibBase + 0.5).toFixed(2))]);
      await pool.query(`INSERT INTO plant_metrics (metric_key, ts, value) VALUES ($1,$2,$3)`,
        [`asset_temp_${assetId}`, ts, Number(rand(tempBase - 3, tempBase + 3).toFixed(1))]);
    }
  }
}

async function seedDowntimeEvents() {
  console.log('Seeding downtime events...');
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const events = [
    { minutes: 45, ts: new Date(startOfMonth + 3 * 86400000).toISOString() },
    { minutes: 20, ts: new Date(startOfMonth + 8 * 86400000).toISOString() },
    { minutes: 90, ts: new Date(startOfMonth + 15 * 86400000).toISOString() },
  ];
  for (const e of events) {
    await pool.query(`INSERT INTO downtime_events (module_id, minutes, ts) VALUES ($1,$2,$3)`,
      ['kiln-energy-optimization', e.minutes, e.ts]);
  }
}

async function seedOptimizationEvents() {
  console.log('Seeding optimization events...');
  const events = [
    { ts: isoDaysAgo(3), parameter: 'Kiln fan speed', before: '82%', after: '76%', savings: 4200 },
    { ts: isoDaysAgo(9), parameter: 'Grinding circuit load', before: '95 t/h', after: '102 t/h', savings: 3100 },
    { ts: isoDaysAgo(16), parameter: 'Cooler air flow', before: '110%', after: '104%', savings: 2600 },
  ];
  for (const e of events) {
    await pool.query(
      `INSERT INTO optimization_events (ts, parameter, before_value, after_value, savings_impact_usd) VALUES ($1,$2,$3,$4,$5)`,
      [e.ts, e.parameter, e.before, e.after, e.savings]
    );
  }
}

async function seedQualityBatches() {
  console.log('Seeding quality batches...');
  const batches = [
    { batchId: 'B-1001', ts: isoDaysAgo(1), predFreeLime: 1.2, measFreeLime: 1.25, predFine: 320, measFine: 318, predStr: 43, measStr: 43, status: 'confirmed' },
    { batchId: 'B-1002', ts: isoDaysAgo(1.2), predFreeLime: 1.8, measFreeLime: 2.1, predFine: 310, measFine: 305, predStr: 43, measStr: 42.5, status: 'off-spec' },
    { batchId: 'B-1003', ts: isoDaysAgo(2), predFreeLime: 1.1, measFreeLime: 1.15, predFine: 325, measFine: 322, predStr: 43, measStr: 43, status: 'confirmed' },
    { batchId: 'B-1004', ts: isoDaysAgo(3), predFreeLime: 1.3, measFreeLime: 1.3, predFine: 318, measFine: 319, predStr: 43, measStr: 43, status: 'confirmed' },
    { batchId: 'B-1005', ts: isoDaysAgo(4), predFreeLime: 1.9, measFreeLime: 2.3, predFine: 300, measFine: 295, predStr: 42.5, measStr: 42, status: 'off-spec' },
  ];
  for (const b of batches) {
    await pool.query(
      `INSERT INTO quality_batches (batch_id, ts, predicted_free_lime, measured_free_lime, predicted_fineness, measured_fineness, predicted_strength, measured_strength, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [b.batchId, b.ts, b.predFreeLime, b.measFreeLime, b.predFine, b.measFine, b.predStr, b.measStr, b.status]
    );
  }
}

async function main() {
  try {
    await clearExisting();
    await seedReadings();
    await seedAlerts();
    await seedPlantMetrics();
    await seedDowntimeEvents();
    await seedOptimizationEvents();
    await seedQualityBatches();
    console.log('✅ Seed complete.');
  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await pool.end();
  }
}

main();