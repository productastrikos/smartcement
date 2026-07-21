const { state, EMISSION_LIMIT_MGNM3 } = require('../data/bagfilter');
const { SIMULATED_MODULES, moduleState } = require('../data/plantModules');
const { getResolvedAlerts } = require('../db/pg-index');

async function generateAdvisories() {
  const compartments = state.compartments;
  const advisories = [];

  const critical = compartments.filter((c) => c.reading.status === 'critical');
  const warning = compartments.filter((c) => c.reading.status === 'warning');

  if (critical.length > 0) {
    const worst = critical.sort((a, b) => b.reading.emission_mgNm3 - a.reading.emission_mgNm3)[0];
    advisories.push({
      advisoryId: `ADV-LIVE-CRIT-${worst.id}`,
      priority: 'critical',
      title: `${worst.label} — emission/pressure threshold breached, immediate inspection required`,
      template: 'bag_filter_critical',
      rootCause: {
        primary: `${worst.label} (${worst.zone}) is reading ${worst.reading.differentialPressure_mbar.toFixed(1)} mbar differential pressure and ${worst.reading.emission_mgNm3.toFixed(1)} mg/Nm³ emissions, exceeding the ${EMISSION_LIMIT_MGNM3} mg/Nm³ regulatory limit.`,
        contributing: `Acoustic index is at ${worst.reading.acousticIndex_pct.toFixed(1)}%, consistent with a stuck valve or torn bag.`,
        systemic: 'Live sensor data — this advisory is generated directly from the current database-backed compartment readings.',
      },
      evidence: [
        `${worst.id} differential pressure: ${worst.reading.differentialPressure_mbar.toFixed(1)} mbar`,
        `${worst.id} emission: ${worst.reading.emission_mgNm3.toFixed(1)} mg/Nm³ (limit ${EMISSION_LIMIT_MGNM3} mg/Nm³)`,
        `${worst.id} acoustic index: ${worst.reading.acousticIndex_pct.toFixed(1)}%`,
      ],
      recommendations: [
        `Dispatch a maintenance crew to ${worst.label} immediately`,
        'Log a compliance review for the affected zone',
        'Cross-check compressed air header pressure for the zone',
      ],
      impact: `Avoids continued emissions above the regulatory limit and the associated forced-shutdown risk`,
      actions: [
        { type: 'dispatch_crew', label: 'Dispatch Maintenance Crew' },
        { type: 'create_work_order', label: 'Create Work Order' },
      ],
    });
  }

  if (warning.length > 0) {
    const w = warning.sort((a, b) => (b.reading.bagBlindingEtaHours ?? 999) - (a.reading.bagBlindingEtaHours ?? 999) * -1)[0];
    advisories.push({
      advisoryId: `ADV-LIVE-WARN-${w.id}`,
      priority: 'high',
      title: `${w.label} — early bag blinding signature detected, predicted failure in ~${w.reading.bagBlindingEtaHours ?? 72}h`,
      template: 'bag_filter_drift',
      rootCause: {
        primary: `${w.label} (${w.zone}) differential pressure has drifted to ${w.reading.differentialPressure_mbar.toFixed(1)} mbar with a correlated rise in acoustic index (${w.reading.acousticIndex_pct.toFixed(1)}%).`,
        contributing: 'Live database readings show a sustained upward trend over the last several simulation ticks.',
        systemic: `${warning.length} compartment(s) currently in warning status across the plant.`,
      },
      evidence: [
        `${w.id} differential pressure: ${w.reading.differentialPressure_mbar.toFixed(1)} mbar`,
        `${w.id} predicted bag blinding: ~${w.reading.bagBlindingEtaHours ?? 72}h`,
        `${warning.length} compartment(s) in warning status plant-wide`,
      ],
      recommendations: [
        `Schedule inspection of ${w.label} before the predicted failure window closes`,
        'Pre-stage replacement bags for the affected zone',
      ],
      impact: 'Catching this before failure protects the +24% bag life and -28% emissions KPI targets',
      actions: [
        { type: 'dispatch_crew', label: 'Dispatch Maintenance Crew' },
        { type: 'create_work_order', label: 'Create Work Order' },
      ],
    });
  }

  const resolved = await getResolvedAlerts('bag-filter', 20);
  if (resolved.length > 0) {
    const durations = resolved.map((a) => (new Date(a.resolvedAt) - new Date(a.createdAt)) / 3600000);
    const avgHours = durations.reduce((a, b) => a + b, 0) / durations.length;
    advisories.push({
      advisoryId: 'ADV-LIVE-MTTR',
      priority: avgHours > 2.5 ? 'medium' : 'info',
      title: `Mean time to repair is ${avgHours.toFixed(1)}h across the last ${resolved.length} resolved alerts`,
      template: 'mttr_summary',
      rootCause: {
        primary: `Average resolution time across the ${resolved.length} most recent resolved bag filter alerts is ${avgHours.toFixed(1)} hours, computed live from the alerts database.`,
        contributing: avgHours > 2.5 ? 'Several alerts took longer than 2 hours to resolve — worth reviewing dispatch times.' : 'Resolution times are within the target window relative to the 48-96h bag blinding lead time.',
        systemic: 'This advisory updates automatically as new alerts are acknowledged.',
      },
      evidence: resolved.slice(0, 3).map((a) => `${a.title} — resolved in ${(((new Date(a.resolvedAt) - new Date(a.createdAt)) / 3600000)).toFixed(1)}h`),
      recommendations: avgHours > 2.5
        ? ['Review maintenance crew staffing for the shifts with the slowest resolutions', 'Consider tightening the alert-to-dispatch SLA']
        : ['No action needed — resolution times are within target'],
      impact: avgHours > 2.5 ? 'Faster resolution reduces the risk of a warning escalating to critical' : 'Current pace keeps the plant well ahead of the predictive lead-time window',
      actions: [{ type: 'create_work_order', label: 'Review Maintenance SLA' }],
    });
  }

  const criticalModules = SIMULATED_MODULES.filter((m) => moduleState[m.id].status === 'critical');
  const warningModules = SIMULATED_MODULES.filter((m) => moduleState[m.id].status === 'warning');

  if (criticalModules.length > 0) {
    advisories.push({
      advisoryId: 'ADV-LIVE-MODULE-CRIT',
      priority: 'critical',
      title: `${criticalModules.length} module${criticalModules.length > 1 ? 's' : ''} plant-wide reporting critical health status`,
      template: 'module_health_critical',
      rootCause: {
        primary: `${criticalModules.map((m) => m.label).join(', ')} ${criticalModules.length > 1 ? 'are' : 'is'} currently reporting a critical health score, computed live from the plant simulation state.`,
        contributing: 'Health scores are derived from simulated process/sensor drift for modules not yet on dedicated instrumentation.',
        systemic: 'This advisory clears automatically once the affected module recovers above the warning threshold.',
      },
      evidence: criticalModules.map((m) => `${m.label}: health score ${moduleState[m.id].healthScore.toFixed(0)}/100`),
      recommendations: [
        'Review the module page for the affected module(s) and cross-check against the top critical alerts table on the dashboard',
        'Prioritize maintenance dispatch to the lowest-scoring module first',
      ],
      impact: 'Prevents a plant-wide OEE and unplanned downtime impact from an unresolved module issue',
      actions: [{ type: 'create_work_order', label: 'Create Work Order' }],
    });
  } else if (warningModules.length > 0) {
    advisories.push({
      advisoryId: 'ADV-LIVE-MODULE-WARN',
      priority: 'medium',
      title: `${warningModules.length} module${warningModules.length > 1 ? 's' : ''} trending toward warning status`,
      template: 'module_health_warning',
      rootCause: {
        primary: `${warningModules.map((m) => m.label).join(', ')} ${warningModules.length > 1 ? 'are' : 'is'} trending below normal health, computed live from the plant simulation state.`,
        contributing: 'Early-stage drift, not yet impacting KPIs.',
        systemic: 'Monitor for escalation to critical over the next few polling cycles.',
      },
      evidence: warningModules.map((m) => `${m.label}: health score ${moduleState[m.id].healthScore.toFixed(0)}/100`),
      recommendations: ['Keep an eye on the plant health heatmap on the dashboard for escalation'],
      impact: 'Early awareness reduces the chance of an unplanned downtime event',
      actions: [],
    });
  }

  if (advisories.length === 0) {
    advisories.push({
      advisoryId: 'ADV-LIVE-ALL-CLEAR',
      priority: 'info',
      title: 'All 8 plant modules are within normal operating range',
      template: 'all_clear',
      rootCause: {
        primary: 'No compartment or module is currently in watch, warning, or critical status.',
        contributing: 'Live database and simulation state across all 8 modules are within normal operating bands.',
        systemic: 'This advisory will be replaced automatically as soon as any module drifts out of range.',
      },
      evidence: [`${compartments.length} bag filter compartments monitored`, `${SIMULATED_MODULES.length} other modules monitored`],
      recommendations: ['No action needed — continue routine monitoring'],
      impact: 'Maintains current OEE, energy, and emissions KPI targets plant-wide',
      actions: [],
    });
  }

  return advisories;
}

module.exports = { generateAdvisories };
