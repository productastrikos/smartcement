const { resolveAlertsForAsset, getResolvedAlerts, insertAlertRow } = require('../db/pg-index');

async function resolveActiveAlertsForAsset(assetId, category) {
  await resolveAlertsForAsset(assetId, category, new Date().toISOString());
}

// Seeds historical, already-resolved repair records so the MTTR KPI has a
// sample on a fresh in-memory store instead of showing "—" until a user
// manually acknowledges enough real alerts.
async function ensureBagFilterRepairHistory() {
  const existing = await getResolvedAlerts('bag-filter', 1000);
  if (existing.length >= 5) return;

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
    await insertAlertRow({
      alertId: rec.alertId,
      type: 'warning',
      category: 'bag-filter',
      subtype: null,
      title: `${rec.assetId} — early bag blinding signature detected`,
      message: 'AI model flagged likely bag blinding based on pressure and acoustic drift. Inspection completed and bags replaced.',
      zone: null,
      assetId: rec.assetId,
      acknowledged: true,
      createdAt: rec.createdAt,
      resolvedAt: rec.resolvedAt,
    });
  }
}

module.exports = { resolveActiveAlertsForAsset, ensureBagFilterRepairHistory };
