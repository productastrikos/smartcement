// Static descriptive content for each Bag Filter Dust Monitoring KPI, paired
// with live numbers/series fetched from GET /api/bagfilter/kpis at render time.

export const BAG_FILTER_KPI_META = {
  filterBagLife: {
    label: 'Filter Bag Life',
    unit: '%',
    axisLabel: 'Improvement vs. baseline (%)',
    description:
      'Measures how much longer filter bags last under AI-guided cleaning cycles compared to the pre-deployment baseline. Longer bag life means fewer replacements, less downtime, and lower maintenance spend.',
    getTrendSummary: (d) =>
      `Currently +${d.value.toFixed(1)}% vs. baseline, ${d.deltaVsYesterday >= 0 ? 'up' : 'down'} ${Math.abs(d.deltaVsYesterday).toFixed(1)} pts vs. yesterday.`,
    getInsights: (d) => [
      `14-day average holds close to the +24% documented target, with day-to-day noise of a few points.`,
      `Improvement is driven by predictive cleaning cycles that trigger before bags are fully blinded, rather than on a fixed schedule.`,
      d.value < 20 ? 'Recent readings are trending below target — worth cross-checking compressed air cycle frequency.' : 'Readings remain within the expected operating band.',
    ],
    getForecast: () => [
      'AI model expects bag life improvement to stay in the +20% to +28% band absent a major process change.',
      'Recommended: review compartments with repeat warning-status entries — they disproportionately affect the fleet average.',
    ],
    tableColumns: ['Date', 'Improvement vs. baseline'],
    getTableRows: (d) => d.table.map((r) => [r.date, `+${r.value.toFixed(1)}%`]),
  },

  compressedAir: {
    label: 'Compressed Air Consumption',
    unit: '%',
    axisLabel: 'Change vs. baseline (%)',
    description:
      'Tracks compressed-air usage for bag cleaning cycles against the pre-deployment baseline. Lower consumption means the cleaning system is running only when needed instead of on a fixed timer.',
    getTrendSummary: (d) =>
      `Currently ${d.value.toFixed(1)}% vs. baseline, ${d.deltaVsYesterday <= 0 ? 'improving' : 'ticking up'} ${Math.abs(d.deltaVsYesterday).toFixed(1)} pts vs. yesterday.`,
    getInsights: () => [
      'Consumption reduction comes from condition-based cleaning cycles replacing fixed-interval pulses.',
      'Compartments in warning or critical status temporarily increase local air use as cleaning cycles run more frequently.',
    ],
    getForecast: () => [
      'Expect consumption to stay near -30% to -34% vs. baseline under normal operating load.',
      'A sustained move toward 0% would indicate cleaning cycles have reverted to fixed-interval mode — check controller configuration.',
    ],
    tableColumns: ['Date', 'Change vs. baseline'],
    getTableRows: (d) => d.table.map((r) => [r.date, `${r.value.toFixed(1)}%`]),
  },

  particulateEmissions: {
    label: 'Particulate Emissions',
    unit: '%',
    axisLabel: 'Change vs. regulatory limit (%)',
    description:
      'Tracks particulate matter output relative to the plant baseline that predates smart monitoring, expressed as a percentage change. More negative is better.',
    getTrendSummary: (d) =>
      `Currently ${d.value.toFixed(1)}% vs. baseline, ${d.deltaVsYesterday <= 0 ? 'improving' : 'ticking up'} ${Math.abs(d.deltaVsYesterday).toFixed(1)} pts vs. yesterday.`,
    getInsights: () => [
      'Reduction is achieved by catching bag degradation before particulate breakthrough occurs.',
      'Emission readings per compartment are checked against the 30 mg/Nm³ regulatory limit in real time on the module page.',
    ],
    getForecast: () => [
      'AI model expects the -25% to -30% band to hold as long as compartments are inspected within the predicted lead-time window.',
      'Any compartment sustaining emissions above 85% of the regulatory limit should be prioritized for inspection.',
    ],
    tableColumns: ['Date', 'Change vs. baseline'],
    getTableRows: (d) => d.table.map((r) => [r.date, `${r.value.toFixed(1)}%`]),
  },

  bagFailureLeadTime: {
    label: 'Predicted Bag Failure Lead Time',
    unit: 'hr',
    axisLabel: 'Predicted lead time (hours)',
    description:
      'The AI model flags likely bag blinding 48–96 hours before it would be caught by manual inspection, based on differential pressure and acoustic drift. This is the live window across all compartments currently under an active prediction.',
    getTrendSummary: (d) =>
      d.hasActive
        ? `${d.activePredictions.length} compartment(s) under active prediction, lead time ${d.minHours}–${d.maxHours}h.`
        : 'No active predictions right now — showing the typical 48–96h documented window.',
    getInsights: (d) => [
      d.hasActive
        ? `Shortest lead time is on ${d.activePredictions.sort((a, b) => a.etaHours - b.etaHours)[0]?.id} at ${Math.min(...d.activePredictions.map((p) => p.etaHours))}h — prioritize inspection there first.`
        : 'All compartments are within normal operating range; no early-warning predictions are active.',
      'Acoustic sensors typically detect stuck valves or leaking diaphragms up to 8 weeks before a manual inspection would.',
    ],
    getForecast: (d) => [
      d.hasActive
        ? 'Schedule inspections in ascending order of predicted lead time to avoid overlapping maintenance windows.'
        : 'No action needed — the model will surface a prediction as soon as pressure or acoustic drift crosses the warning threshold.',
    ],
    tableColumns: ['Compartment', 'Zone', 'Status', 'Predicted lead time'],
    getTableRows: (d) => d.activePredictions.map((p) => [p.id, p.zone, p.status, `${p.etaHours}h`]),
  },

  mttr: {
    label: 'Mean Time to Repair (MTTR)',
    unit: 'hr',
    axisLabel: 'Resolution time (hours)',
    description:
      'Average time from an alert being raised to it being acknowledged/resolved, measured across the most recent resolved bag filter alerts. Lower MTTR means issues are being caught and closed out faster.',
    getTrendSummary: (d) =>
      d.hours != null
        ? `Averaging ${d.hours.toFixed(1)}h to resolve across the last ${d.sampleSize} alerts.`
        : 'No resolved alerts yet — MTTR will populate once alerts are acknowledged.',
    getInsights: (d) => [
      d.recent.length
        ? `Longest recent resolution was ${Math.max(...d.recent.map((r) => r.durationHours)).toFixed(1)}h; shortest was ${Math.min(...d.recent.map((r) => r.durationHours)).toFixed(1)}h.`
        : 'Once alerts are acknowledged, this panel will show resolution-time spread across compartments.',
      'Critical alerts should target sub-2h resolution to stay ahead of the 48–96h bag blinding window.',
    ],
    getForecast: () => [
      'Sustained MTTR above 3h suggests maintenance crew dispatch times, not detection, are the bottleneck — worth reviewing staffing for the affected shift.',
    ],
    tableColumns: ['Alert', 'Zone', 'Created', 'Resolved', 'Duration'],
    getTableRows: (d) =>
      d.recent.map((r) => [
        r.title,
        r.zone,
        new Date(r.createdAt).toLocaleString(),
        new Date(r.resolvedAt).toLocaleString(),
        `${r.durationHours.toFixed(1)}h`,
      ]),
  },

  pressureDeviation: {
    label: 'Differential Pressure Deviation',
    unit: '',
    axisLabel: 'Compartments out of normal range',
    description:
      'Live count of baghouse compartments currently reading outside the normal differential pressure band (watch, warning, or critical status). A rising count signals fleet-wide degradation rather than an isolated compartment issue.',
    getTrendSummary: (d) => `${d.count} of ${d.totalCompartments} compartments currently out of normal range.`,
    getInsights: (d) => [
      d.count === 0
        ? 'All compartments are within normal operating range.'
        : `${d.count} compartment(s) need attention: ${d.compartments.filter((c) => c.status !== 'normal').map((c) => c.id).join(', ')}.`,
      'Compartments sharing a zone that deviate together often point to a shared root cause (e.g. a compressed-air header issue) rather than independent bag wear.',
    ],
    getForecast: (d) => [
      d.count > 2
        ? 'Multiple simultaneous deviations — recommend checking shared compressed-air supply and fan loading before inspecting bags individually.'
        : 'Deviation count within normal day-to-day variance.',
    ],
    tableColumns: ['Compartment', 'Zone', 'Differential Pressure', 'Status'],
    getTableRows: (d) => d.compartments.map((c) => [c.id, c.zone, `${c.differentialPressure} mbar`, c.status]),
  },
};
