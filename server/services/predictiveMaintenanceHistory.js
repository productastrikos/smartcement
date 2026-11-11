const { getResolvedAlerts, insertAlertRow } = require('../db/pg-index');

const ISSUE_LABELS = {
  bearing_wear: 'bearing wear',
  misalignment: 'shaft misalignment',
  overheating: 'overheating',
  lubrication_loss: 'lubrication loss',
};

const DEMO_ASSETS = [
  'AST-KD-1', 'AST-MG-1', 'AST-MG-2', 'AST-FN-1', 'AST-FN-2', 'AST-FN-3', 'AST-KD-1', 'AST-MG-1',
];
const DEMO_ISSUES = [
  'bearing_wear', 'misalignment', 'overheating', 'lubrication_loss', 'bearing_wear', 'overheating', 'misalignment', 'lubrication_loss',
];

// Seeds historical, already-resolved work-order records so workOrderLeadTimeHours
// and downtimeAvoidedUsd/Days have a sample on a fresh in-memory store instead of
// showing null/0 until a user manually acknowledges enough real alerts.
async function ensurePredictiveMaintenanceRepairHistory() {
  const existing = await getResolvedAlerts('predictive-maintenance', 1000);
  if (existing.length >= 5) return;

  const now = Date.now();
  const records = [];
  for (let i = 1; i <= 8; i++) {
    const assetId = DEMO_ASSETS[i - 1];
    const issue = DEMO_ISSUES[i - 1];
    const hoursAgo = 36 + Math.random() * 144; // created 1.5 to ~7.5 days ago
    const repairHours = 6 + Math.random() * 30; // 6 to 36 hours to resolve
    const createdAt = new Date(now - hoursAgo * 3600000);
    const resolvedAt = new Date(createdAt.getTime() + repairHours * 3600000);
    records.push({
      alertId: `DEMO-PM-${i}`,
      assetId,
      issue,
      createdAt: createdAt.toISOString(),
      resolvedAt: resolvedAt.toISOString(),
    });
  }

  for (const rec of records) {
    await insertAlertRow({
      alertId: rec.alertId,
      type: 'warning',
      category: 'predictive-maintenance',
      subtype: rec.issue,
      title: `${rec.assetId} — asset drift detected (${ISSUE_LABELS[rec.issue]})`,
      message: `Predicted issue: ${ISSUE_LABELS[rec.issue]}. Work order completed and asset returned to normal health.`,
      zone: null,
      assetId: rec.assetId,
      acknowledged: true,
      createdAt: rec.createdAt,
      resolvedAt: rec.resolvedAt,
    });
  }
}

module.exports = { ensurePredictiveMaintenanceRepairHistory };
