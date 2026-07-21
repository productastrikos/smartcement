const { PLANTS, DEVIATION_CATEGORIES, state } = require('../data/controlCentre');
const { addAlert } = require('../data/alertsStore');

function randomWalk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

const DEVIATION_TITLES = {
  safety: 'Safety deviation flagged during shift review',
  environment: 'Environmental parameter drifted outside target band',
  efficiency: 'Efficiency deviation — throughput below plan',
  quality: 'Quality deviation flagged on incoming batch data',
};

async function tick() {
  const now = new Date().toISOString();

  for (const plant of PLANTS) {
    const m = state.plants[plant.id];
    m.availabilityPct = randomWalk(m.availabilityPct, 1.2, 78, 98);
    m.mtbfHours = randomWalk(m.mtbfHours, 15, 300, 620);
    m.maintenanceCostReductionPct = randomWalk(m.maintenanceCostReductionPct, 0.6, 1, 9);
    m.uptimePct = randomWalk(m.uptimePct, 0.8, 90, 99.8);
    m.oeePct = randomWalk(m.oeePct, 1.5, 65, 92);
    m.maintenanceCostUsdPerTon = randomWalk(m.maintenanceCostUsdPerTon, 0.2, 2, 6);
    m.timeToCorrectiveActionMin = randomWalk(m.timeToCorrectiveActionMin, 3, 10, 90);

    // Occasionally raise a deviation for this plant
    if (Math.random() < 0.025) {
      const category = DEVIATION_CATEGORIES[Math.floor(Math.random() * DEVIATION_CATEGORIES.length)];
      const severity = Math.random() < 0.25 ? 'critical' : 'warning';
      await addAlert({
        type: severity,
        category: 'smart-control-centre',
        subtype: category,
        title: `${plant.name} — ${DEVIATION_TITLES[category]}`,
        message: `Live deviation detected on ${plant.name} in the ${category} category. Composite plant score: OEE ${m.oeePct.toFixed(1)}%, availability ${m.availabilityPct.toFixed(1)}%.`,
        zone: plant.name,
        assetId: plant.id,
      });
    }
  }
}

function startControlCentreSimulationLoop(intervalMs = 8000) {
  tick().catch((err) => console.error('Control centre simulation tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Control centre simulation tick failed', err));
  }, intervalMs);
}

module.exports = { startControlCentreSimulationLoop, tick };
