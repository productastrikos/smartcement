const { BASELINE_PROFILE_C, KILN_POSITIONS_M, state } = require('../data/energyOptimization');
const { addAlert, hasActiveAlertForAsset } = require('../data/alertsStore');
const { insertPlantMetric, insertOptimizationEvent } = require('../db/pg-index');

const THERMAL_DEVIATION_C = 60;
const THROUGHPUT_DROP_THRESHOLD = 170;

function randomWalk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

const OPTIMIZATION_PARAMETERS = [
  { key: 'kiln_feed_rate', label: 'Kiln feed rate', unit: 't/h' },
  { key: 'primary_air_flow', label: 'Primary air flow', unit: '%' },
  { key: 'id_fan_speed', label: 'ID fan speed', unit: 'rpm' },
  { key: 'alt_fuel_ratio', label: 'Alternative fuel ratio', unit: '%' },
  { key: 'burning_zone_setpoint', label: 'Burning zone temperature setpoint', unit: '°C' },
];

async function tick() {
  const now = new Date().toISOString();
  const m = state.metrics;

  m.specificPowerKwhPerTon = randomWalk(m.specificPowerKwhPerTon, 1.2, 58, 82);
  m.specificThermalKcalPerKg = randomWalk(m.specificThermalKcalPerKg, 8, 690, 800);
  m.altFuelSubstitutionPct = randomWalk(m.altFuelSubstitutionPct, 1, 10, 38);
  m.throughputTonsPerHr = randomWalk(m.throughputTonsPerHr, 4, 150, 225);
  m.energySavingsPct = randomWalk(m.energySavingsPct, 0.5, 6, 18);
  m.thermalStabilityScore = randomWalk(m.thermalStabilityScore, 1.5, 65, 99);

  // kiln thermal profile drift, with occasional localized spike/deviation
  const spikeIdx = Math.random() < 0.05 ? Math.floor(Math.random() * KILN_POSITIONS_M.length) : -1;
  state.kilnProfile = state.kilnProfile.map((p, i) => {
    const baseline = BASELINE_PROFILE_C[i];
    const spikeBias = i === spikeIdx ? (Math.random() < 0.5 ? 1 : -1) * (THERMAL_DEVIATION_C + Math.random() * 30) : 0;
    const next = randomWalk(p.temperatureC + spikeBias * 0.3, 12, baseline - 100, baseline + 100);
    return { positionM: p.positionM, temperatureC: Math.round(next) };
  });

  const worstDeviation = state.kilnProfile.reduce((worst, p, i) => {
    const dev = Math.abs(p.temperatureC - BASELINE_PROFILE_C[i]);
    return dev > worst.dev ? { dev, position: p.positionM, temp: p.temperatureC } : worst;
  }, { dev: 0, position: null, temp: null });

  if (worstDeviation.dev > THERMAL_DEVIATION_C) {
    if (!(await hasActiveAlertForAsset('kiln-thermal-profile', 'kiln-energy-optimization'))) {
      await addAlert({
        type: worstDeviation.dev > THERMAL_DEVIATION_C * 1.5 ? 'critical' : 'warning',
        category: 'kiln-energy-optimization',
        subtype: 'thermal_deviation',
        title: `Kiln thermal deviation at ${worstDeviation.position}m — ${worstDeviation.temp}°C`,
        message: `Thermal profile deviates ${Math.round(worstDeviation.dev)}°C from baseline at the ${worstDeviation.position}m position. Review burner and fuel feed.`,
        zone: `${worstDeviation.position}m`,
        assetId: 'kiln-thermal-profile',
      });
    }
  }

  if (m.throughputTonsPerHr < THROUGHPUT_DROP_THRESHOLD) {
    if (!(await hasActiveAlertForAsset('kiln-throughput', 'kiln-energy-optimization'))) {
      await addAlert({
        type: 'warning',
        category: 'kiln-energy-optimization',
        subtype: 'throughput_drop',
        title: `Throughput drop detected — ${Math.round(m.throughputTonsPerHr)} t/h`,
        message: `Kiln throughput has dropped below the ${THROUGHPUT_DROP_THRESHOLD} t/h target. Check feed rate and fan loading.`,
        zone: 'Kiln',
        assetId: 'kiln-throughput',
      });
    }
  }

  if (Math.random() < 0.01) {
    await addAlert({
      type: 'critical',
      category: 'kiln-energy-optimization',
      subtype: 'safety_interlock',
      title: 'Closed-loop safety interlock triggered',
      message: 'AI closed-loop control was automatically halted by a safety interlock. Manual review required before re-enabling autonomous control.',
      zone: 'Kiln',
      assetId: 'kiln-safety-interlock',
    });
  }

  // fuel mix drifts slowly toward/away from alt fuel substitution target
  const shift = (Math.random() - 0.5) * 2;
  state.fuelMix['Alternative Fuel (RDF)'] = Math.max(5, Math.min(35, state.fuelMix['Alternative Fuel (RDF)'] + shift));
  state.fuelMix.Coal = Math.max(30, state.fuelMix.Coal - shift * 0.6);
  const total = Object.values(state.fuelMix).reduce((a, b) => a + b, 0);
  Object.keys(state.fuelMix).forEach((k) => { state.fuelMix[k] = Number(((state.fuelMix[k] / total) * 100).toFixed(1)); });

  // cumulative energy savings ($) — small daily-equivalent increment per tick
  const dailySavingsUsd = (m.energySavingsPct / 100) * m.throughputTonsPerHr * 24 * 3.5;
  await insertPlantMetric('energy_savings_usd_increment', now, Number((dailySavingsUsd / 900).toFixed(2)));
  await insertPlantMetric('alt_fuel_substitution_pct', now, Number(m.altFuelSubstitutionPct.toFixed(1)));

  // occasional logged optimization event for the audit table
  if (Math.random() < 0.02) {
    const param = OPTIMIZATION_PARAMETERS[Math.floor(Math.random() * OPTIMIZATION_PARAMETERS.length)];
    const before = randomWalk(50, 20, 10, 90);
    const after = randomWalk(before, 8, 10, 95);
    const savings = Number((Math.random() * 1800).toFixed(0));
    await insertOptimizationEvent({
      ts: now,
      parameter: param.label,
      beforeValue: `${before.toFixed(1)} ${param.unit}`,
      afterValue: `${after.toFixed(1)} ${param.unit}`,
      savingsImpactUsd: savings,
    });
  }
}

function startEnergyOptimizationSimulationLoop(intervalMs = 8000) {
  tick().catch((err) => console.error('Energy optimization simulation tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Energy optimization simulation tick failed', err));
  }, intervalMs);
}

module.exports = { startEnergyOptimizationSimulationLoop, tick };
