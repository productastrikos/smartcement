// Generates up to 3 AI Advisory entries per module from the live data each
// page already has in state (no extra API calls). Each entry has
// {id, severity, situation, risk, action, assetLabel, impact}. Ranked by
// severity (critical > warning > info) by construction — callers slice(0,3).

function rank(items) {
  const order = { critical: 0, warning: 1, info: 2 };
  return [...items].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
}

export function bagFilterAdvisories(compartments = [], emissionLimitMgNm3 = 30) {
  const flagged = compartments.filter((c) => c.reading.status === 'critical' || c.reading.status === 'warning');
  const entries = flagged.map((c) => {
    const r = c.reading;
    const critical = r.status === 'critical';
    return {
      id: `bf-${c.id}`,
      severity: critical ? 'critical' : 'warning',
      assetLabel: `${c.label} (${c.zone})`,
      situation: `${c.label} (${c.zone}) is reading differential pressure ${r.differentialPressure_mbar.toFixed(1)} mbar and emission ${r.emission_mgNm3.toFixed(1)} mg/Nm³, ${critical ? 'above' : 'approaching'} the ${emissionLimitMgNm3} mg/Nm³ regulatory limit.`,
      risk: critical
        ? 'Continued operation risks a regulatory non-compliance notification within 6 hours and accelerated bag wear, reducing bag life by an estimated 15%.'
        : 'If unresolved over the next 24 hours, differential pressure is likely to cross the critical threshold, escalating to a regulatory limit breach.',
      action: critical
        ? `Initiate a manual pulse-jet cleaning cycle on ${c.label} and schedule a bag inspection within 24 hours.`
        : `Schedule a bag inspection for ${c.label} within the next shift and monitor acoustic index for further drift.`,
      impact: `Estimated to reduce emission by ~${Math.max(3, Math.round(r.emission_mgNm3 - emissionLimitMgNm3 * 0.65))} mg/Nm³ and restore normal operating pressure.`,
    };
  });
  return rank(entries).slice(0, 3);
}

export function predictiveMaintenanceAdvisories(assets = []) {
  const flagged = assets.filter((a) => a.baselineStatus === 'critical' || a.baselineStatus === 'warning');
  const entries = flagged.map((a) => {
    const critical = a.baselineStatus === 'critical';
    return {
      id: `pm-${a.assetId}`,
      severity: critical ? 'critical' : 'warning',
      assetLabel: `${a.name} (${a.assetId})`,
      situation: `${a.name} is reading vibration ${a.vibrationMmS} mm/s and temperature ${a.temperatureC}°C, with a composite health score of ${a.healthScore}/100.`,
      risk: critical
        ? 'Bearing or gearbox failure within 6-24 hours is plausible at this vibration/temperature level, risking unplanned downtime.'
        : 'If left unaddressed for 24 hours, degradation may accelerate, reducing remaining useful life and increasing unplanned-downtime risk.',
      action: critical
        ? `Dispatch a maintenance crew to inspect ${a.name} immediately and prepare a work order for bearing/lubrication service.`
        : `Schedule a maintenance inspection of ${a.name} within 24 hours and verify lubrication and bearing condition.`,
      impact: `Estimated to avoid ~${critical ? '8-12' : '2-4'} hours of unplanned downtime on ${a.assetId}.`,
    };
  });
  return rank(entries).slice(0, 3);
}

export function energyOptimizationAdvisories(profile = [], kpis = null) {
  const entries = [];
  profile.forEach((p) => {
    const baseline = p.baselineC;
    if (baseline == null) return;
    const dev = Math.abs(p.temperatureC - baseline);
    if (dev > 60) {
      entries.push({
        id: `eo-${p.positionM}`,
        severity: dev > 90 ? 'critical' : 'warning',
        assetLabel: `Kiln position ${p.positionM}m`,
        situation: `Kiln thermal profile at the ${p.positionM}m position reads ${p.temperatureC}°C, deviating ${Math.round(dev)}°C from the ${baseline}°C baseline.`,
        risk: 'Continued thermal deviation risks uneven clinker formation and reduced burner efficiency over the next shift.',
        action: `Review burner and fuel feed settings at the ${p.positionM}m position and adjust primary air flow to correct the deviation.`,
        impact: `Estimated to restore thermal stability within ~${Math.round(dev)}°C of baseline.`,
      });
    }
  });
  if (kpis && kpis.throughputTonsPerHr < 170) {
    entries.push({
      id: 'eo-throughput',
      severity: 'warning',
      assetLabel: 'Kiln throughput',
      situation: `Kiln throughput is at ${kpis.throughputTonsPerHr} t/h, below the 170 t/h target floor.`,
      risk: 'Sustained low throughput over the next 24 hours will miss production targets and reduce per-ton energy efficiency.',
      action: 'Review feed rate and ID fan speed settings to restore throughput to target.',
      impact: 'Estimated to recover throughput to within 5% of the 170 t/h target floor.',
    });
  }
  return rank(entries).slice(0, 3);
}

export function qualityAdvisories(batches = []) {
  const offSpec = batches.filter((b) => b.status === 'off-spec').slice(0, 3);
  const entries = offSpec.map((b) => ({
    id: `qp-${b.batchId}`,
    severity: 'warning',
    assetLabel: `Batch ${b.batchId}`,
    situation: `Batch ${b.batchId} measured free lime at ${b.measuredFreeLime}% against a predicted ${b.predictedFreeLime}%, falling outside quality specification.`,
    risk: 'If the underlying raw-material drift is not corrected within 24 hours, subsequent batches are likely to continue trending off-spec, increasing rework and rejection rates.',
    action: `Flag batch ${b.batchId} for lab confirmation and review raw material consistency for the affected production window.`,
    impact: 'Estimated to reduce off-spec batch rate by catching the drift before the next production run.',
  }));
  return rank(entries).slice(0, 3);
}

export function workerSafetyAdvisories(zones = []) {
  const flagged = zones.filter((z) => z.status === 'critical' || z.status === 'warning');
  const entries = flagged.map((z) => {
    const critical = z.status === 'critical';
    return {
      id: `ws-${z.zoneId}`,
      severity: critical ? 'critical' : 'warning',
      assetLabel: `${z.zone} (${z.cameraId})`,
      situation: `${z.zone} is reporting PPE compliance of ${z.ppeCompliancePct}%, ${critical ? 'well below' : 'below'} the expected threshold.`,
      risk: critical
        ? 'Continued non-compliance over the next shift materially increases the risk of a reportable safety incident in this zone.'
        : 'If unaddressed for 24 hours, non-compliance is likely to persist across subsequent shifts without a visible intervention.',
      action: `Dispatch a safety supervisor to ${z.zone} to conduct a PPE compliance check and reinforce the briefing for on-site personnel.`,
      impact: `Estimated to restore PPE compliance in ${z.zone} to above 90% within the shift.`,
    };
  });
  return rank(entries).slice(0, 3);
}

export function emissionsAdvisories(readings = []) {
  const entries = readings
    .filter((r) => r.status === 'breach' || r.status === 'warning')
    .map((r) => ({
      id: `em-${r.parameter}`,
      severity: r.status === 'breach' ? 'critical' : 'warning',
      assetLabel: r.parameter,
      situation: `${r.parameter} is reading ${r.value} mg/Nm³ against a permit limit of ${r.permitLimit} mg/Nm³.`,
      risk: r.status === 'breach'
        ? 'Continued operation above the permit limit risks a regulatory breach notification within 6 hours.'
        : 'If this trend continues over the next 24 hours, the reading is likely to cross the permit limit.',
      action: r.status === 'breach'
        ? `Initiate an immediate compliance review for ${r.parameter} and reduce the associated process load.`
        : `Log a compliance review for ${r.parameter} and increase monitoring cadence for the next 24 hours.`,
      impact: `Estimated to bring ${r.parameter} back within 80% of the permit limit.`,
    }));
  return rank(entries).slice(0, 3);
}

export function stockAdvisories(materials = []) {
  const flagged = materials.filter((m) => Math.abs(m.varianceTons) > 50);
  const entries = flagged
    .sort((a, b) => Math.abs(b.varianceTons) - Math.abs(a.varianceTons))
    .map((m) => ({
      id: `sm-${m.materialId}`,
      severity: Math.abs(m.varianceTons) > 150 ? 'critical' : 'warning',
      assetLabel: m.material,
      situation: `${m.material} shows a variance of ${m.varianceTons > 0 ? '+' : ''}${m.varianceTons}t between book (${m.bookQtyTons}t) and physical (${m.physicalQtyTons}t) stock.`,
      risk: 'If uncorrected within 24 hours, book-vs-physical drift will compound, reducing the reliability of procurement and stock-cover planning.',
      action: `Schedule a drone/LiDAR reconciliation scan for ${m.material} and update the book quantity to match the verified physical measurement.`,
      impact: 'Estimated to eliminate the current variance once the reconciliation scan is confirmed.',
    }));
  return rank(entries).slice(0, 3);
}

export function controlCentreAdvisories(plants = [], deviations = []) {
  const openDeviations = deviations.filter((d) => !d.acknowledged).slice(0, 3);
  const entries = openDeviations.map((d) => ({
    id: `cc-${d.alertId}`,
    severity: d.type === 'critical' ? 'critical' : 'warning',
    assetLabel: d.zone || d.assetId,
    situation: d.message || d.title,
    risk: 'If this deviation remains unreviewed for 24 hours, it is likely to recur across subsequent shifts without a documented corrective action.',
    action: `Review and action the deviation flagged for ${d.zone || d.assetId} before the next shift change.`,
    impact: 'Estimated to resolve the deviation and restore the composite plant benchmark score.',
  }));
  return rank(entries).slice(0, 3);
}
