const express = require('express');
const { TARGETS, state } = require('../data/qualityPrediction');
const { getAlertsByCategory, acknowledgeAlert } = require('../data/alertsStore');
const { getRecentQualityBatches, getQualityBatchCount, getOffSpecBatchCountSince, getBatchCountSince } = require('../db/pg-index');

const router = express.Router();

router.get('/kpis', async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const totalBatches = await getBatchCountSince(sevenDaysAgo);
  const offSpecBatches = await getOffSpecBatchCountSince(sevenDaysAgo);
  const offSpecBatchRatePct = totalBatches > 0 ? Number(((offSpecBatches / totalBatches) * 100).toFixed(1)) : 0;

  res.json({
    offSpecBatchRatePct,
    predictionAccuracyPct: Number(state.metrics.predictionAccuracyPct.toFixed(1)),
    timeToDetectDriftMin: Number(state.metrics.timeToDetectDriftMin.toFixed(1)),
    reworkRejectionRatePct: Number(state.metrics.reworkRejectionRatePct.toFixed(1)),
    rawMaterialConsistencyIndex: Math.round(state.metrics.rawMaterialConsistencyIndex),
    batchesTracedCount: await getQualityBatchCount(),
    targets: TARGETS,
    updatedAt: new Date().toISOString(),
  });
});

router.get('/batches', async (req, res) => {
  res.json({ batches: await getRecentQualityBatches(25) });
});

router.get('/alerts', async (req, res) => {
  res.json({ alerts: await getAlertsByCategory('quality-prediction-lab-automation') });
});

router.post('/alerts/:id/ack', async (req, res) => {
  const alert = await acknowledgeAlert(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ alert });
});

module.exports = router;