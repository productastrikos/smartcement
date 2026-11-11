const { deleteReadingsOlderThan, deletePlantMetricsOlderThan } = require('../db/pg-index');

const RETENTION_DAYS = 30;

async function tick() {
  const cutoffIso = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
  const readingsDeleted = await deleteReadingsOlderThan(cutoffIso);
  const metricsDeleted = await deletePlantMetricsOlderThan(cutoffIso);
  if (readingsDeleted || metricsDeleted) {
    console.log(`Retention cleanup: removed ${readingsDeleted} readings, ${metricsDeleted} plant_metrics rows older than ${RETENTION_DAYS}d`);
  }
}

function startRetentionLoop(intervalMs = 60 * 60 * 1000) {
  tick().catch((err) => console.error('Retention cleanup tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Retention cleanup tick failed', err));
  }, intervalMs);
}

module.exports = { startRetentionLoop, tick };
