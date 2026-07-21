const express = require('express');
const { MATERIALS, state } = require('../data/stockManagement');
const { getAlertsByCategory, acknowledgeAlert } = require('../data/alertsStore');
const { getPlantMetricDailySum } = require('../db/pg-index');

const router = express.Router();

function materialRows() {
  return MATERIALS.map((mat) => {
    const s = state.materials[mat.id];
    const varianceTons = s.bookQtyTons - s.physicalQtyTons;
    return {
      materialId: mat.id,
      material: mat.name,
      bookQtyTons: Math.round(s.bookQtyTons),
      physicalQtyTons: Math.round(s.physicalQtyTons),
      varianceTons: Math.round(varianceTons),
      varianceUsd: Math.round(varianceTons * mat.unitPriceUsd),
      lastScanAt: s.lastScanAt,
    };
  });
}

router.get('/kpis', async (req, res) => {
  const rows = materialRows();
  const totalVarianceUsd = rows.reduce((sum, r) => sum + r.varianceUsd, 0);
  const totalPhysicalTons = rows.reduce((sum, r) => sum + r.physicalQtyTons, 0);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const consumptionRows = await getPlantMetricDailySum('stock_consumption', sevenDaysAgo);
  const avgDailyConsumption = consumptionRows.length
    ? consumptionRows.reduce((sum, r) => sum + r.total, 0) / consumptionRows.length
    : 1;
  const daysOfStockCover = avgDailyConsumption > 0 ? Math.round(totalPhysicalTons / avgDailyConsumption) : null;

  res.json({
    measurementAccuracyPct: Number(state.metrics.measurementAccuracyPct.toFixed(2)),
    surveyCycleTimeMin: Math.round(state.metrics.surveyCycleTimeMin),
    bookVsPhysicalVarianceUsd: totalVarianceUsd,
    flightsPerMonth: state.metrics.flightsPerMonth,
    daysOfStockCover,
    densityCalibrationAccuracyPct: Number(state.metrics.densityCalibrationAccuracyPct.toFixed(2)),
    updatedAt: new Date().toISOString(),
  });
});

router.get('/materials', (req, res) => {
  res.json({ materials: materialRows() });
});

router.get('/alerts', async (req, res) => {
  res.json({ alerts: await getAlertsByCategory('3d-stock-management') });
});

router.post('/alerts/:id/ack', async (req, res) => {
  const alert = await acknowledgeAlert(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json({ alert });
});

router.get('/trend', async (req, res) => {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const intakeRows = await getPlantMetricDailySum('stock_intake', fourteenDaysAgo);
  const consumptionRows = await getPlantMetricDailySum('stock_consumption', fourteenDaysAgo);
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10));
  const trend = days.map((day) => ({
    date: day,
    intake: Math.round(intakeRows.find((r) => r.day === day)?.total || 0),
    consumption: Math.round(consumptionRows.find((r) => r.day === day)?.total || 0),
  }));
  res.json({ trend });
});

module.exports = router;