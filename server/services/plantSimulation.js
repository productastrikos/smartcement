const { SIMULATED_MODULES, moduleState, deriveModuleStatus } = require('../data/plantModules');
const { addAlert } = require('../data/alertsStore');
const { insertPlantMetric, insertDowntimeEvent } = require('../db/pg-index');

const METRIC_TARGETS = {
  oee: { target: 85, min: 60, max: 96 },
  energyPerTon: { target: 100, min: 85, max: 130 },
  co2PerTon: { target: 820, min: 760, max: 900 },
};

const metricValues = {
  oee: 84 + Math.random() * 4,
  energyPerTon: 98 + Math.random() * 6,
  co2PerTon: 815 + Math.random() * 15,
};

function randomWalk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

async function tickModuleHealth() {
  const now = new Date().toISOString();

  for (const mod of SIMULATED_MODULES) {
    const s = moduleState[mod.id];
    const driftBias = Math.random() < 0.03 ? Math.random() * 25 : 0;
    s.healthScore = randomWalk(s.healthScore - driftBias * 0.5, 4, 15, 100);
    s.updatedAt = now;

    const prevStatus = s.status;
    s.status = deriveModuleStatus(s.healthScore);

    if (s.status !== prevStatus && (s.status === 'warning' || s.status === 'critical')) {
      await addAlert({
        type: s.status,
        category: mod.id,
        title: s.status === 'critical'
          ? `${mod.label} — module health critical, immediate review required`
          : `${mod.label} — module health degrading`,
        message: s.status === 'critical'
          ? `Simulated health score dropped to ${s.healthScore.toFixed(0)}/100. Investigate underlying process for ${mod.label}.`
          : `Simulated health score at ${s.healthScore.toFixed(0)}/100, trending toward the warning threshold.`,
        zone: 'Plant-wide',
        assetId: mod.id,
      });

      if (s.status === 'critical') {
        await insertDowntimeEvent(mod.id, Math.round(15 + Math.random() * 75), now);
      }
    }

    // gradual recovery so modules don't stay critical forever
    if (s.status === 'critical' || s.status === 'warning') {
      s.healthScore = randomWalk(s.healthScore + 2, 3, 15, 100);
    }
  }
}

async function tickPlantMetrics() {
  const now = new Date().toISOString();

  metricValues.oee = randomWalk(metricValues.oee, 1.5, METRIC_TARGETS.oee.min, METRIC_TARGETS.oee.max);
  metricValues.energyPerTon = randomWalk(metricValues.energyPerTon, 2, METRIC_TARGETS.energyPerTon.min, METRIC_TARGETS.energyPerTon.max);
  metricValues.co2PerTon = randomWalk(metricValues.co2PerTon, 4, METRIC_TARGETS.co2PerTon.min, METRIC_TARGETS.co2PerTon.max);

  await insertPlantMetric('oee', now, Number(metricValues.oee.toFixed(2)));
  await insertPlantMetric('energyPerTon', now, Number(metricValues.energyPerTon.toFixed(2)));
  await insertPlantMetric('co2PerTon', now, Number(metricValues.co2PerTon.toFixed(2)));
}

async function tick() {
  await tickModuleHealth();
  await tickPlantMetrics();
}

function startPlantSimulationLoop(intervalMs = 8000) {
  tick().catch((err) => console.error('Plant simulation tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Plant simulation tick failed', err));
  }, intervalMs);
}

module.exports = { startPlantSimulationLoop, tick, METRIC_TARGETS, metricValues };
