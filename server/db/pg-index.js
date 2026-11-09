const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Set DATABASE_SSL=true for hosted Postgres that requires SSL (e.g. external connections)
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  idleTimeoutMillis: 60000,
});

let loggedFirstConnection = false;
pool.on('connect', () => {
  if (!loggedFirstConnection) {
    console.log('Connected to PostgreSQL database');
    loggedFirstConnection = true;
  }
});
pool.on('error', (err) => console.error('Unexpected PostgreSQL error', err));

// ---------------------------------------------------------------------
// Row mappers (same shape your routes already expect)
// ---------------------------------------------------------------------

function rowToAlert(row) {
  if (!row) return null;
  return {
    alertId: row.alert_id,
    type: row.type,
    category: row.category,
    subtype: row.subtype,
    title: row.title,
    message: row.message,
    zone: row.zone,
    assetId: row.asset_id,
    acknowledged: !!row.acknowledged,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

function rowToQualityBatch(row) {
  return {
    batchId: row.batch_id,
    ts: row.ts,
    predictedFreeLime: row.predicted_free_lime,
    measuredFreeLime: row.measured_free_lime,
    predictedFineness: row.predicted_fineness,
    measuredFineness: row.measured_fineness,
    predictedStrength: row.predicted_strength,
    measuredStrength: row.measured_strength,
    status: row.status,
  };
}

// ---------------------------------------------------------------------
// Readings
// ---------------------------------------------------------------------

async function insertReading(reading) {
  await pool.query(
    `INSERT INTO readings (compartment_id, zone, ts, differential_pressure, airflow, acoustic_index, emission, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [reading.compartmentId, reading.zone, reading.ts, reading.differentialPressure,
     reading.airflow, reading.acousticIndex, reading.emission, reading.status]
  );
}

async function getReadingsSince(compartmentId, sinceIso) {
  const { rows } = await pool.query(
    `SELECT * FROM readings WHERE compartment_id = $1 AND ts >= $2 ORDER BY ts ASC`,
    [compartmentId, sinceIso]
  );
  return rows;
}

async function getReadingsForAllSince(sinceIso) {
  const { rows } = await pool.query(
    `SELECT * FROM readings WHERE ts >= $1 ORDER BY ts ASC`,
    [sinceIso]
  );
  return rows;
}

// ---------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------

async function insertAlertRow(alert) {
  await pool.query(
    `INSERT INTO alerts (alert_id, type, category, subtype, title, message, zone, asset_id, acknowledged, created_at, resolved_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (alert_id) DO NOTHING`,
    [alert.alertId, alert.type, alert.category, alert.subtype || null, alert.title,
     alert.message, alert.zone || null, alert.assetId || null,
     alert.acknowledged ? 1 : 0, alert.createdAt, alert.resolvedAt || null]
  );
}

async function resolveAlertRow(alertId, resolvedAt) {
  await pool.query(
    `UPDATE alerts SET acknowledged = 1, resolved_at = $1 WHERE alert_id = $2`,
    [resolvedAt, alertId]
  );
}

async function getAlerts() {
  const { rows } = await pool.query(`SELECT * FROM alerts ORDER BY created_at DESC LIMIT 100`);
  return rows.map(rowToAlert);
}

async function getAlertsByCategory(category) {
  const { rows } = await pool.query(
    `SELECT * FROM alerts WHERE category = $1 ORDER BY created_at DESC LIMIT 100`,
    [category]
  );
  return rows.map(rowToAlert);
}

async function getResolvedAlerts(category, limit = 20) {
  const { rows } = await pool.query(
    `SELECT * FROM alerts WHERE category = $1 AND resolved_at IS NOT NULL ORDER BY resolved_at DESC LIMIT $2`,
    [category, limit]
  );
  return rows.map(rowToAlert);
}

async function hasActiveAlertForAsset(assetId, category) {
  const { rows } = await pool.query(
    `SELECT 1 FROM alerts WHERE asset_id = $1 AND category = $2 AND acknowledged = 0 LIMIT 1`,
    [assetId, category]
  );
  return rows.length > 0;
}

async function getUnresolvedAlertCountsByCategory() {
  const { rows } = await pool.query(
    `SELECT category, COUNT(*) AS count FROM alerts WHERE acknowledged = 0 GROUP BY category`
  );
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.count)]));
}

async function getUnresolvedAlertCountsByType() {
  const { rows } = await pool.query(
    `SELECT type, COUNT(*) AS count FROM alerts WHERE acknowledged = 0 GROUP BY type`
  );
  return Object.fromEntries(rows.map((r) => [r.type, Number(r.count)]));
}

async function getTopUnresolvedAlerts(limit = 5) {
  const { rows } = await pool.query(
    `SELECT * FROM alerts WHERE acknowledged = 0
     ORDER BY CASE type WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map(rowToAlert);
}

async function getLatestCriticalAlert() {
  const { rows } = await pool.query(
    `SELECT * FROM alerts WHERE type = 'critical' ORDER BY created_at DESC LIMIT 1`
  );
  return rowToAlert(rows[0]);
}

async function getAlertCountsPerDaySince(sinceIso) {
  const { rows } = await pool.query(
    `SELECT substr(created_at::text, 1, 10) AS day, type, COUNT(*) AS count
     FROM alerts WHERE created_at >= $1
     GROUP BY day, type ORDER BY day ASC`,
    [sinceIso]
  );
  return rows;
}

async function getSubtypeCountsPerDaySince(category, sinceIso) {
  const { rows } = await pool.query(
    `SELECT substr(created_at::text, 1, 10) AS day, subtype, COUNT(*) AS count
     FROM alerts WHERE category = $1 AND created_at >= $2 AND subtype IS NOT NULL
     GROUP BY day, subtype ORDER BY day ASC`,
    [category, sinceIso]
  );
  return rows;
}

// ---------------------------------------------------------------------
// Plant metrics
// ---------------------------------------------------------------------

async function insertPlantMetric(metricKey, ts, value) {
  await pool.query(
    `INSERT INTO plant_metrics (metric_key, ts, value) VALUES ($1,$2,$3)`,
    [metricKey, ts, value]
  );
}

async function getPlantMetricSeries(metricKey, sinceIso) {
  const { rows } = await pool.query(
    `SELECT ts, value FROM plant_metrics WHERE metric_key = $1 AND ts >= $2 ORDER BY ts ASC`,
    [metricKey, sinceIso]
  );
  return rows;
}

async function getLatestPlantMetric(metricKey) {
  const { rows } = await pool.query(
    `SELECT ts, value FROM plant_metrics WHERE metric_key = $1 ORDER BY ts DESC LIMIT 1`,
    [metricKey]
  );
  return rows[0];
}

async function getPlantMetricDailySum(metricKey, sinceIso) {
  const { rows } = await pool.query(
    `SELECT substr(ts::text, 1, 10) AS day, SUM(value) AS total
     FROM plant_metrics WHERE metric_key = $1 AND ts >= $2
     GROUP BY day ORDER BY day ASC`,
    [metricKey, sinceIso]
  );
  return rows;
}

async function getPlantMetricDailyAvg(metricKey, sinceIso) {
  const { rows } = await pool.query(
    `SELECT substr(ts::text, 1, 10) AS day, AVG(value) AS avg
     FROM plant_metrics WHERE metric_key = $1 AND ts >= $2
     GROUP BY day ORDER BY day ASC`,
    [metricKey, sinceIso]
  );
  return rows;
}

// ---------------------------------------------------------------------
// Downtime
// ---------------------------------------------------------------------

async function insertDowntimeEvent(moduleId, minutes, ts) {
  await pool.query(
    `INSERT INTO downtime_events (module_id, minutes, ts) VALUES ($1,$2,$3)`,
    [moduleId, minutes, ts]
  );
}

async function getDowntimeMinutesSince(sinceIso) {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(minutes), 0) AS total FROM downtime_events WHERE ts >= $1`,
    [sinceIso]
  );
  return Number(rows[0].total);
}

// ---------------------------------------------------------------------
// Optimization events
// ---------------------------------------------------------------------

async function insertOptimizationEvent(event) {
  await pool.query(
    `INSERT INTO optimization_events (ts, parameter, before_value, after_value, savings_impact_usd)
     VALUES ($1,$2,$3,$4,$5)`,
    [event.ts, event.parameter, event.beforeValue, event.afterValue, event.savingsImpactUsd]
  );
}

async function getRecentOptimizationEvents(limit = 20) {
  const { rows } = await pool.query(
    `SELECT * FROM optimization_events ORDER BY ts DESC LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    ts: r.ts,
    parameter: r.parameter,
    beforeValue: r.before_value,
    afterValue: r.after_value,
    savingsImpactUsd: r.savings_impact_usd,
  }));
}

// ---------------------------------------------------------------------
// Quality batches
// ---------------------------------------------------------------------

async function insertQualityBatch(batch) {
  await pool.query(
    `INSERT INTO quality_batches (batch_id, ts, predicted_free_lime, measured_free_lime, predicted_fineness, measured_fineness, predicted_strength, measured_strength, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [batch.batchId, batch.ts, batch.predictedFreeLime, batch.measuredFreeLime,
     batch.predictedFineness, batch.measuredFineness, batch.predictedStrength,
     batch.measuredStrength, batch.status]
  );
}

async function getRecentQualityBatches(limit = 20) {
  const { rows } = await pool.query(
    `SELECT * FROM quality_batches ORDER BY ts DESC LIMIT $1`,
    [limit]
  );
  return rows.map(rowToQualityBatch);
}

async function getQualityBatchCount() {
  const { rows } = await pool.query(`SELECT COUNT(*) AS count FROM quality_batches`);
  return Number(rows[0].count);
}

async function getOffSpecBatchCountSince(sinceIso) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS count FROM quality_batches WHERE ts >= $1 AND status = 'off-spec'`,
    [sinceIso]
  );
  return Number(rows[0].count);
}

async function getBatchCountSince(sinceIso) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS count FROM quality_batches WHERE ts >= $1`,
    [sinceIso]
  );
  return Number(rows[0].count);
}

// ---------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------

async function deleteReadingsOlderThan(beforeIso) {
  const { rowCount } = await pool.query(`DELETE FROM readings WHERE ts < $1`, [beforeIso]);
  return rowCount;
}

async function deletePlantMetricsOlderThan(beforeIso) {
  const { rowCount } = await pool.query(`DELETE FROM plant_metrics WHERE ts < $1`, [beforeIso]);
  return rowCount;
}

module.exports = {
  pool,
  insertReading,
  insertAlertRow,
  resolveAlertRow,
  getAlerts,
  getAlertsByCategory,
  getResolvedAlerts,
  hasActiveAlertForAsset,
  getReadingsSince,
  getReadingsForAllSince,
  insertPlantMetric,
  getPlantMetricSeries,
  getLatestPlantMetric,
  insertDowntimeEvent,
  getDowntimeMinutesSince,
  getUnresolvedAlertCountsByCategory,
  getUnresolvedAlertCountsByType,
  getTopUnresolvedAlerts,
  getLatestCriticalAlert,
  getAlertCountsPerDaySince,
  getSubtypeCountsPerDaySince,
  getPlantMetricDailySum,
  getPlantMetricDailyAvg,
  insertOptimizationEvent,
  getRecentOptimizationEvents,
  insertQualityBatch,
  getRecentQualityBatches,
  getQualityBatchCount,
  getOffSpecBatchCountSince,
  getBatchCountSince,
  deleteReadingsOlderThan,
  deletePlantMetricsOlderThan,
};