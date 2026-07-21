const TARGETS = {
  freeLimePct: { target: 1.5, min: 0.3, max: 3.2 },
  finenessBlaine: { target: 3400, min: 2900, max: 3900 }, // cm2/g
  strengthMpa: { target: 42.5, min: 36, max: 50 }, // 28-day compressive strength proxy
};

const state = {
  metrics: {
    predictionAccuracyPct: 91 + Math.random() * 5,
    timeToDetectDriftMin: 8 + Math.random() * 6,
    reworkRejectionRatePct: 2 + Math.random() * 1.5,
    rawMaterialConsistencyIndex: 88 + Math.random() * 8,
  },
  batchCounter: 0,
};

module.exports = { TARGETS, state };
