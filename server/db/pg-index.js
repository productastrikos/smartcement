// In-memory data store. Same function names and return shapes as the
// previous PostgreSQL-backed implementation, so every consumer (routes,
// services, data modules) works unchanged.

const READINGS_CAP = 20000;
const ALERTS_CAP = 20000;
const PLANT_METRICS_CAP = 20000;
const DOWNTIME_CAP = 5000;
const OPTIMIZATION_EVENTS_CAP = 5000;
const QUALITY_BATCHES_CAP = 20000;

const readings = [];
const alerts = [];
const plantMetrics = [];
const downtimeEvents = [];
const optimizationEvents = [];
const qualityBatches = [];

function capPush(arr, item, cap) {
  arr.push(item);
  if (arr.length > cap) arr.splice(0, arr.length - cap);
}

function dayOf(iso) {
  return String(iso).slice(0, 10);
}

// ---------------------------------------------------------------------
// Readings
// ---------------------------------------------------------------------

async function insertReading(reading) {
  capPush(readings, {
    compartment_id: reading.compartmentId,
    zone: reading.zone,
    ts: reading.ts,
    differential_pressure: reading.differentialPressure,
    airflow: reading.airflow,
    acoustic_index: reading.acousticIndex,
    emission: reading.emission,
    status: reading.status,
  }, READINGS_CAP);
}

async function getReadingsSince(compartmentId, sinceIso) {
  return readings
    .filter((r) => r.compartment_id === compartmentId && r.ts >= sinceIso)
    .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
}

async function getReadingsForAllSince(sinceIso) {
  return readings
    .filter((r) => r.ts >= sinceIso)
    .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
}

// ---------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------

async function insertAlertRow(alert) {
  if (alerts.some((a) => a.alertId === alert.alertId)) return;
  capPush(alerts, {
    alertId: alert.alertId,
    type: alert.type,
    category: alert.category,
    subtype: alert.subtype || null,
    title: alert.title,
    message: alert.message,
    zone: alert.zone || null,
    assetId: alert.assetId || null,
    acknowledged: !!alert.acknowledged,
    createdAt: alert.createdAt,
    resolvedAt: alert.resolvedAt || null,
  }, ALERTS_CAP);
}

async function resolveAlertRow(alertId, resolvedAt) {
  const alert = alerts.find((a) => a.alertId === alertId);
  if (!alert) return;
  alert.acknowledged = true;
  alert.resolvedAt = resolvedAt;
}

function sortByCreatedAtDesc(a, b) {
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
}

async function getAlerts() {
  return [...alerts].sort(sortByCreatedAtDesc).slice(0, 100);
}

async function getAlertsByCategory(category) {
  return alerts
    .filter((a) => a.category === category)
    .sort(sortByCreatedAtDesc)
    .slice(0, 100);
}

async function getResolvedAlerts(category, limit = 20) {
  return alerts
    .filter((a) => a.category === category && a.resolvedAt != null)
    .sort((a, b) => (a.resolvedAt < b.resolvedAt ? 1 : a.resolvedAt > b.resolvedAt ? -1 : 0))
    .slice(0, limit);
}

async function hasActiveAlertForAsset(assetId, category) {
  return alerts.some((a) => a.assetId === assetId && a.category === category && !a.acknowledged);
}

async function resolveAlertsForAsset(assetId, category, resolvedAt) {
  for (const a of alerts) {
    if (a.assetId === assetId && a.category === category && !a.acknowledged) {
      a.acknowledged = true;
      a.resolvedAt = resolvedAt;
    }
  }
}

async function getUnresolvedAlertCountsByCategory() {
  const counts = {};
  for (const a of alerts) {
    if (a.acknowledged) continue;
    counts[a.category] = (counts[a.category] || 0) + 1;
  }
  return counts;
}

async function getUnresolvedAlertCountsByType() {
  const counts = {};
  for (const a of alerts) {
    if (a.acknowledged) continue;
    counts[a.type] = (counts[a.type] || 0) + 1;
  }
  return counts;
}

async function getTopUnresolvedAlerts(limit = 5) {
  const rank = { critical: 0, warning: 1 };
  return alerts
    .filter((a) => !a.acknowledged)
    .sort((a, b) => {
      const ra = rank[a.type] ?? 2;
      const rb = rank[b.type] ?? 2;
      if (ra !== rb) return ra - rb;
      return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
    })
    .slice(0, limit);
}

async function getLatestCriticalAlert() {
  const critical = alerts
    .filter((a) => a.type === 'critical')
    .sort(sortByCreatedAtDesc);
  return critical[0] || null;
}

async function getAlertCountsPerDaySince(sinceIso) {
  const counts = {};
  for (const a of alerts) {
    if (a.createdAt < sinceIso) continue;
    const day = dayOf(a.createdAt);
    const key = `${day}|${a.type}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([key, count]) => {
      const [day, type] = key.split('|');
      return { day, type, count };
    })
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

async function getSubtypeCountsPerDaySince(category, sinceIso) {
  const counts = {};
  for (const a of alerts) {
    if (a.category !== category || a.createdAt < sinceIso || a.subtype == null) continue;
    const day = dayOf(a.createdAt);
    const key = `${day}|${a.subtype}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([key, count]) => {
      const [day, subtype] = key.split('|');
      return { day, subtype, count };
    })
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

// ---------------------------------------------------------------------
// Plant metrics
// ---------------------------------------------------------------------

async function insertPlantMetric(metricKey, ts, value) {
  capPush(plantMetrics, { metric_key: metricKey, ts, value }, PLANT_METRICS_CAP);
}

async function getPlantMetricSeries(metricKey, sinceIso) {
  return plantMetrics
    .filter((m) => m.metric_key === metricKey && m.ts >= sinceIso)
    .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0))
    .map((m) => ({ ts: m.ts, value: m.value }));
}

async function getLatestPlantMetric(metricKey) {
  const rows = plantMetrics
    .filter((m) => m.metric_key === metricKey)
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  return rows[0] ? { ts: rows[0].ts, value: rows[0].value } : undefined;
}

async function getPlantMetricDailySum(metricKey, sinceIso) {
  const sums = {};
  for (const m of plantMetrics) {
    if (m.metric_key !== metricKey || m.ts < sinceIso) continue;
    const day = dayOf(m.ts);
    sums[day] = (sums[day] || 0) + m.value;
  }
  return Object.entries(sums)
    .map(([day, total]) => ({ day, total }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

async function getPlantMetricDailyAvg(metricKey, sinceIso) {
  const sums = {};
  const counts = {};
  for (const m of plantMetrics) {
    if (m.metric_key !== metricKey || m.ts < sinceIso) continue;
    const day = dayOf(m.ts);
    sums[day] = (sums[day] || 0) + m.value;
    counts[day] = (counts[day] || 0) + 1;
  }
  return Object.keys(sums)
    .map((day) => ({ day, avg: sums[day] / counts[day] }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

// ---------------------------------------------------------------------
// Downtime
// ---------------------------------------------------------------------

async function insertDowntimeEvent(moduleId, minutes, ts) {
  capPush(downtimeEvents, { module_id: moduleId, minutes, ts }, DOWNTIME_CAP);
}

async function getDowntimeMinutesSince(sinceIso) {
  return downtimeEvents
    .filter((d) => d.ts >= sinceIso)
    .reduce((sum, d) => sum + d.minutes, 0);
}

// ---------------------------------------------------------------------
// Optimization events
// ---------------------------------------------------------------------

async function insertOptimizationEvent(event) {
  capPush(optimizationEvents, {
    ts: event.ts,
    parameter: event.parameter,
    before_value: event.beforeValue,
    after_value: event.afterValue,
    savings_impact_usd: event.savingsImpactUsd,
  }, OPTIMIZATION_EVENTS_CAP);
}

async function getRecentOptimizationEvents(limit = 20) {
  return [...optimizationEvents]
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
    .slice(0, limit)
    .map((e) => ({
      ts: e.ts,
      parameter: e.parameter,
      beforeValue: e.before_value,
      afterValue: e.after_value,
      savingsImpactUsd: e.savings_impact_usd,
    }));
}

// ---------------------------------------------------------------------
// Quality batches
// ---------------------------------------------------------------------

async function insertQualityBatch(batch) {
  capPush(qualityBatches, { ...batch }, QUALITY_BATCHES_CAP);
}

async function getRecentQualityBatches(limit = 20) {
  return [...qualityBatches]
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
    .slice(0, limit);
}

async function getQualityBatchCount() {
  return qualityBatches.length;
}

async function getOffSpecBatchCountSince(sinceIso) {
  return qualityBatches.filter((b) => b.ts >= sinceIso && b.status === 'off-spec').length;
}

async function getBatchCountSince(sinceIso) {
  return qualityBatches.filter((b) => b.ts >= sinceIso).length;
}

module.exports = {
  insertReading,
  insertAlertRow,
  resolveAlertRow,
  getAlerts,
  getAlertsByCategory,
  getResolvedAlerts,
  hasActiveAlertForAsset,
  resolveAlertsForAsset,
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
};
