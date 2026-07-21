const { TARGETS, state } = require('../data/qualityPrediction');
const { addAlert } = require('../data/alertsStore');
const { insertQualityBatch, getQualityBatchCount } = require('../db/pg-index');

function randomWalk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

function genValue({ target, min, max }, noiseStep, driftBias) {
  return Math.max(min, Math.min(max, target + (Math.random() - 0.5) * noiseStep + driftBias));
}

async function tick() {
  const now = new Date().toISOString();
  const m = state.metrics;

  m.predictionAccuracyPct = randomWalk(m.predictionAccuracyPct, 0.5, 85, 98);
  m.timeToDetectDriftMin = randomWalk(m.timeToDetectDriftMin, 0.8, 4, 22);
  m.reworkRejectionRatePct = randomWalk(m.reworkRejectionRatePct, 0.3, 0.5, 6);
  m.rawMaterialConsistencyIndex = randomWalk(m.rawMaterialConsistencyIndex, 1.2, 75, 99);

  // roughly one new batch every ~2 ticks
  if (Math.random() < 0.5) {
    state.batchCounter += 1;
    const batchId = `B-${String((await getQualityBatchCount()) + 1).padStart(5, '0')}`;

    const driftEvent = Math.random() < 0.08;
    const driftBias = driftEvent ? (Math.random() < 0.5 ? 1 : -1) : 0;

    const predictedFreeLime = genValue(TARGETS.freeLimePct, 0.6, 0);
    const measuredFreeLime = genValue(TARGETS.freeLimePct, 0.3, driftBias * 0.9) ;
    const predictedFineness = genValue(TARGETS.finenessBlaine, 300, 0);
    const measuredFineness = genValue(TARGETS.finenessBlaine, 150, driftBias * -250);
    const predictedStrength = genValue(TARGETS.strengthMpa, 4, 0);
    const measuredStrength = genValue(TARGETS.strengthMpa, 2, driftBias * -3.5);

    const freeLimeOff = Math.abs(measuredFreeLime - TARGETS.freeLimePct.target) > 1.1;
    const finenessOff = Math.abs(measuredFineness - TARGETS.finenessBlaine.target) > 350;
    const strengthOff = Math.abs(measuredStrength - TARGETS.strengthMpa.target) > 5;
    const status = freeLimeOff || finenessOff || strengthOff ? 'off-spec' : 'in-spec';

    await insertQualityBatch({
      batchId,
      ts: now,
      predictedFreeLime: Number(predictedFreeLime.toFixed(2)),
      measuredFreeLime: Number(measuredFreeLime.toFixed(2)),
      predictedFineness: Math.round(predictedFineness),
      measuredFineness: Math.round(measuredFineness),
      predictedStrength: Number(predictedStrength.toFixed(1)),
      measuredStrength: Number(measuredStrength.toFixed(1)),
      status,
    });

    if (status === 'off-spec') {
      const deviationType = freeLimeOff ? 'free_lime_deviation' : finenessOff ? 'fineness_deviation' : 'strength_deviation';
      const label = { free_lime_deviation: 'free lime', fineness_deviation: 'fineness', strength_deviation: 'strength' }[deviationType];
      await addAlert({
        type: (freeLimeOff && strengthOff) ? 'critical' : 'warning',
        category: 'quality-prediction-lab-automation',
        subtype: deviationType,
        title: `Batch ${batchId} — drift detected in ${label}`,
        message: `Batch ${batchId} measured ${label} deviates from spec. Predicted free lime ${predictedFreeLime.toFixed(2)}%, measured ${measuredFreeLime.toFixed(2)}%.`,
        zone: 'Lab',
        assetId: batchId,
      });
    }
  }
}

function startQualityPredictionSimulationLoop(intervalMs = 8000) {
  tick().catch((err) => console.error('Quality prediction simulation tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Quality prediction simulation tick failed', err));
  }, intervalMs);
}

module.exports = { startQualityPredictionSimulationLoop, tick };
