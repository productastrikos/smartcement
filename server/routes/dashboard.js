const express = require('express');
const { state } = require('../data/bagfilter');
const { getAlerts } = require('../data/alertsStore');
const { SIMULATED_MODULES, moduleState } = require('../data/plantModules');
const { METRIC_TARGETS } = require('../services/plantSimulation');
const {
  getUnresolvedAlertCountsByType,
  getUnresolvedAlertCountsByCategory,
  getTopUnresolvedAlerts,
  getLatestCriticalAlert,
  getDowntimeMinutesSince,
  getPlantMetricSeries,
  getLatestPlantMetric,
  getAlertCountsPerDaySince,
} = require('../db/pg-index');

const router = express.Router();

const MODULE_LABELS = {
  'bag-filter-dust-monitoring': 'Bag Filter Dust Monitoring',
  ...Object.fromEntries(SIMULATED_MODULES.map((m) => [m.id, m.label])),
};

function toModuleId(category) {
  return category === 'bag-filter' ? 'bag-filter-dust-monitoring' : category;
}

function bagFilterAggregateStatus() {
  const statuses = state.compartments.map((c) => c.reading.status);
  if (statuses.includes('critical')) return 'critical';
  if (statuses.includes('warning')) return 'warning';
  if (statuses.includes('watch')) return 'watch';
  return 'normal';
}

function startOfMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// FIXED: async handler + await getAlerts()
router.get('/summary', async (req, res) => {
  const compartments = state.compartments;
  const critical = compartments.filter((c) => c.reading.status === 'critical').length;
  const warning = compartments.filter((c) => c.reading.status === 'warning').length;
  const allAlerts = await getAlerts();
  const activeAlerts = allAlerts.filter((a) => !a.acknowledged).length;

  res.json({
    plant: {
      name: 'CemPulse Demo Plant',
      capacityMtpa: 2,
      industryAdoptionPct: 30,
      downtimeReductionRangePct: [40, 60],
      typicalPaybackMonths: [18, 18],
    },
    investment: {
      phase1to2UsdRange: [200000, 500000],
      fullTransformationUsdRange: [1000000, 3000000],
      paybackMonthsRange: [12, 18],
      annualSavingsUsdRange: [2000000, 8000000],
    },
    kpis: {
      bagFilter: {
        activeCompartments: compartments.length,
        warningCount: warning,
        criticalCount: critical,
        filterBagLifeImprovementPct: 24,
        compressedAirReductionPct: 32,
        particulateReductionPct: 28,
      },
      controlCentre: {
        maintenanceCostReductionPct: 6,
        mtbfIncreasePct: 40,
        equipmentAvailabilityGainPp: 1.2,
      },
      stockManagement: {
        surveyAccuracyPct: 99,
        surveyTimeMinutes: 90,
      },
      predictiveMaintenance: {
        downtimeReductionRangePct: [40, 60],
      },
      energyOptimization: {
        energySavingsRangePct: [8, 15],
        leadingSavingsRangePct: [35, 50],
      },
    },
    alerts: {
      active: activeAlerts,
      total: allAlerts.length,
    },
    updatedAt: new Date().toISOString(),
  });
});

router.get('/plant-kpis', async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

  const metric = async (key) => {
    const latest = await getLatestPlantMetric(key);
    const series = await getPlantMetricSeries(key, fourteenDaysAgo);
    return {
      value: latest ? latest.value : METRIC_TARGETS[key].target,
      target: METRIC_TARGETS[key].target,
      min: METRIC_TARGETS[key].min,
      max: METRIC_TARGETS[key].max,
      series: series.map((r) => ({ t: r.ts, value: r.value })),
    };
  };

  const alertCountsByType = await getUnresolvedAlertCountsByType();
  const activeAlerts = {
    critical: alertCountsByType.critical || 0,
    warning: alertCountsByType.warning || 0,
    info: alertCountsByType.info || 0,
    total: (alertCountsByType.critical || 0) + (alertCountsByType.warning || 0) + (alertCountsByType.info || 0),
  };

  const downtimeMinutesMtd = await getDowntimeMinutesSince(startOfMonthIso());

  const latestCritical = await getLatestCriticalAlert();
  const complianceDays = daysSince(latestCritical?.createdAt);

  const moduleHealth = [
    { id: 'bag-filter-dust-monitoring', label: MODULE_LABELS['bag-filter-dust-monitoring'], status: bagFilterAggregateStatus() },
    ...SIMULATED_MODULES.map((m) => ({ id: m.id, label: m.label, status: moduleState[m.id].status })),
  ];

  const topCriticalAlerts = (await getTopUnresolvedAlerts(5)).map((a) => ({
    alertId: a.alertId,
    module: MODULE_LABELS[toModuleId(a.category)] || a.category,
    moduleId: toModuleId(a.category),
    title: a.title,
    createdAt: a.createdAt,
    severity: a.type,
    status: a.acknowledged ? 'acknowledged' : 'open',
  }));

  const dayRows = await getAlertCountsPerDaySince(sevenDaysAgo);
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10));
  const alertTrend7d = days.map((day) => {
    const rows = dayRows.filter((r) => r.day === day);
    return {
      date: day,
      critical: rows.find((r) => r.type === 'critical')?.count || 0,
      warning: rows.find((r) => r.type === 'warning')?.count || 0,
      info: rows.find((r) => r.type === 'info')?.count || 0,
    };
  });

  const rawCategoryCounts = await getUnresolvedAlertCountsByCategory();
  const alertCountsByModule = {};
  Object.entries(rawCategoryCounts).forEach(([category, count]) => {
    const id = toModuleId(category);
    alertCountsByModule[id] = (alertCountsByModule[id] || 0) + count;
  });

  res.json({
    oee: await metric('oee'),
    energyPerTon: await metric('energyPerTon'),
    co2PerTon: await metric('co2PerTon'),
    activeAlerts,
    unplannedDowntimeMtdHours: Number((downtimeMinutesMtd / 60).toFixed(1)),
    complianceDaysSinceViolation: complianceDays,
    moduleHealth,
    alertCountsByModule,
    alertTrend7d,
    topCriticalAlerts,
    updatedAt: new Date().toISOString(),
  });
});

// FIXED: async handler + await getAlerts() before calling .slice()
router.get('/notifications', async (req, res) => {
  const allAlerts = await getAlerts();
  const notifications = allAlerts
    .slice(0, 30)
    .map((a) => ({
      alertId: a.alertId,
      type: a.type,
      module: MODULE_LABELS[toModuleId(a.category)] || a.category,
      moduleId: toModuleId(a.category),
      title: a.title,
      message: a.message,
      acknowledged: a.acknowledged,
      createdAt: a.createdAt,
      resolvedAt: a.resolvedAt,
    }));
  res.json({ notifications });
});

module.exports = router;