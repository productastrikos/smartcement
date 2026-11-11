const { pool } = require('../db/pg-index');

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
// and downtimeAvoidedUsd/Days have a sample on a fresh database instead of
// showing null/0 until a user manually acknowledges enough real alerts.
async function ensurePredictiveMaintenanceRepairHistory() {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS count FROM alerts WHERE category = 'predictive-maintenance' AND resolved_at IS NOT NULL`
  );
  if (Number(rows[0].count) >= 5) return;

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
    await pool.query(
      `INSERT INTO alerts (alert_id, type, category, subtype, title, message, zone, asset_id, acknowledged, created_at, resolved_at)
       VALUES ($1, 'warning', 'predictive-maintenance', $2, $3, $4, NULL, $5, 1, $6, $7)
       ON CONFLICT (alert_id) DO NOTHING`,
      [
        rec.alertId,
        rec.issue,
        `${rec.assetId} — asset drift detected (${ISSUE_LABELS[rec.issue]})`,
        `Predicted issue: ${ISSUE_LABELS[rec.issue]}. Work order completed and asset returned to normal health.`,
        rec.assetId,
        rec.createdAt,
        rec.resolvedAt,
      ]
    );
  }
}

module.exports = { ensurePredictiveMaintenanceRepairHistory };
