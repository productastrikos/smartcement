const { pool: defaultPool } = require('./pg-index');

// Idempotent schema provisioning — safe to run on every server boot so a
// fresh Postgres database (e.g. a newly provisioned Hostinger instance)
// self-provisions its tables instead of requiring a manual migration step.
// Accepts an optional pool so standalone scripts can reuse their own
// connection instead of opening a second pool against the same database.
async function ensureSchema(pool = defaultPool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS readings (
      id SERIAL PRIMARY KEY,
      compartment_id TEXT NOT NULL,
      zone TEXT NOT NULL,
      ts TEXT NOT NULL,
      differential_pressure DOUBLE PRECISION NOT NULL,
      airflow DOUBLE PRECISION NOT NULL,
      acoustic_index DOUBLE PRECISION NOT NULL,
      emission DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_readings_compartment_ts ON readings (compartment_id, ts);
    CREATE INDEX IF NOT EXISTS idx_readings_ts ON readings (ts);

    CREATE TABLE IF NOT EXISTS alerts (
      alert_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      subtype TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      zone TEXT,
      asset_id TEXT,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_category ON alerts (category);
    CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts (resolved_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts (created_at);

    CREATE TABLE IF NOT EXISTS plant_metrics (
      id SERIAL PRIMARY KEY,
      metric_key TEXT NOT NULL,
      ts TEXT NOT NULL,
      value DOUBLE PRECISION NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_plant_metrics_key_ts ON plant_metrics (metric_key, ts);
    CREATE INDEX IF NOT EXISTS idx_plant_metrics_ts ON plant_metrics (ts);

    CREATE TABLE IF NOT EXISTS downtime_events (
      id SERIAL PRIMARY KEY,
      module_id TEXT NOT NULL,
      minutes DOUBLE PRECISION NOT NULL,
      ts TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_downtime_ts ON downtime_events (ts);

    CREATE TABLE IF NOT EXISTS optimization_events (
      id SERIAL PRIMARY KEY,
      ts TEXT NOT NULL,
      parameter TEXT NOT NULL,
      before_value TEXT NOT NULL,
      after_value TEXT NOT NULL,
      savings_impact_usd DOUBLE PRECISION NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_optimization_events_ts ON optimization_events (ts);

    CREATE TABLE IF NOT EXISTS quality_batches (
      id SERIAL PRIMARY KEY,
      batch_id TEXT NOT NULL,
      ts TEXT NOT NULL,
      predicted_free_lime DOUBLE PRECISION NOT NULL,
      measured_free_lime DOUBLE PRECISION NOT NULL,
      predicted_fineness DOUBLE PRECISION NOT NULL,
      measured_fineness DOUBLE PRECISION NOT NULL,
      predicted_strength DOUBLE PRECISION NOT NULL,
      measured_strength DOUBLE PRECISION NOT NULL,
      status TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_quality_batches_ts ON quality_batches (ts);
  `);

  // Guard in case a pre-existing table predates the subtype column.
  await pool.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS subtype TEXT`);
}

module.exports = { ensureSchema };
