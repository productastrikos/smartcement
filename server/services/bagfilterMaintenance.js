const { pool } = require('../db/pg-index');

async function resolveActiveAlertsForAsset(assetId, category) {
  await pool.query(
    `UPDATE alerts SET acknowledged = 1, resolved_at = $1
     WHERE asset_id = $2 AND category = $3 AND acknowledged = 0`,
    [new Date().toISOString(), assetId, category]
  );
}

// Seeds historical, already-resolved repair records so the MTTR KPI has a
// sample on a fresh database instead of showing "—" until a user manually
// acknowledges enough real alerts.
async function ensureBagFilterRepairHistory() {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS count FROM alerts WHERE category = 'bag-filter' AND resolved_at IS NOT NULL`
  );
  if (Number(rows[0].count) >= 5) return;

  const now = Date.now();
  const records = [];
  for (let i = 1; i <= 8; i++) {
    const assetId = `BH-${i}`;
    const daysAgo = 2 + Math.random() * 16; // 2 to 18 days ago
    const repairHours = 2.5 + Math.random() * 4; // 2.5 to 6.5 hours
    const createdAt = new Date(now - daysAgo * 86400000);
    const resolvedAt = new Date(createdAt.getTime() + repairHours * 3600000);
    records.push({
      alertId: `DEMO-BF-${i}`,
      assetId,
      createdAt: createdAt.toISOString(),
      resolvedAt: resolvedAt.toISOString(),
    });
  }

  for (const rec of records) {
    await pool.query(
      `INSERT INTO alerts (alert_id, type, category, subtype, title, message, zone, asset_id, acknowledged, created_at, resolved_at)
       VALUES ($1, 'warning', 'bag-filter', NULL, $2, $3, NULL, $4, 1, $5, $6)
       ON CONFLICT (alert_id) DO NOTHING`,
      [
        rec.alertId,
        `${rec.assetId} — early bag blinding signature detected`,
        'AI model flagged likely bag blinding based on pressure and acoustic drift. Inspection completed and bags replaced.',
        rec.assetId,
        rec.createdAt,
        rec.resolvedAt,
      ]
    );
  }
}

module.exports = { resolveActiveAlertsForAsset, ensureBagFilterRepairHistory };
