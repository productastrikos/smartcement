// In-memory 14-day daily trend series for the three "vs. baseline / vs. limit"
// KPIs documented in the reference material (filter bag life, compressed air,
// particulate emissions). These are efficacy metrics measured over days, not
// raw sensor telemetry, so they're modeled as a seeded random walk rather
// than persisted per-tick — the per-compartment sensor readings that back
// the other KPIs (lead time, MTTR, pressure deviation) live in the database.

const DAYS = 14;
const now = Date.now();

function seedSeries(baseline, noise) {
  return Array.from({ length: DAYS }, (_, i) => ({
    t: new Date(now - (DAYS - 1 - i) * 86400000).toISOString(),
    value: Number((baseline + (Math.random() - 0.5) * noise).toFixed(2)),
  }));
}

const trends = {
  filterBagLife: seedSeries(24, 3),
  compressedAir: seedSeries(-32, 3),
  particulateEmissions: seedSeries(-28, 3),
};

function nudgeToday() {
  Object.keys(trends).forEach((key) => {
    const series = trends[key];
    const last = series[series.length - 1];
    last.value = Number((last.value + (Math.random() - 0.5) * 0.6).toFixed(2));
  });
}

function getTrend(key) {
  return trends[key];
}

module.exports = { trends, nudgeToday, getTrend };
