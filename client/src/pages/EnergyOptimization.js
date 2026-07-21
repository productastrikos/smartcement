import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from '../components/chartUtils';
import {
  getEnergyKpis, getKilnProfile, getFuelMix, getEnergyAlerts, getSavingsTrend, getOptimizationEvents,
} from '../services/api';
import { getModuleBySlug } from '../services/cementKnowledge';
import KPICard, { IcoBolt, IcoFire, IcoLeaf, IcoTrendUp, IcoDollar, IcoSignal } from '../components/KPICard';
import AlertPanel from '../components/AlertPanel';
import GenericKPIDetailPanel from '../components/GenericKPIDetailPanel';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const POLL_INTERVAL_MS = 10000;

function tempColor(temp) {
  // blue (cool) -> amber -> red (hot) heat-map style coloring
  if (temp < 1000) return '#3b82f6';
  if (temp < 1250) return '#38bdf8';
  if (temp < 1380) return '#f59e0b';
  if (temp < 1440) return '#f97316';
  return '#ef4444';
}

export default function EnergyOptimization() {
  const mod = getModuleBySlug('kiln-energy-optimization');
  const [kpis, setKpis] = useState(null);
  const [profile, setProfile] = useState([]);
  const [fuelMix, setFuelMix] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [trend, setTrend] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [kpisRes, profileRes, fuelMixRes, alertsRes, trendRes, eventsRes] = await Promise.all([
        getEnergyKpis(), getKilnProfile(), getFuelMix(), getEnergyAlerts(), getSavingsTrend(), getOptimizationEvents(),
      ]);
      setKpis(kpisRes);
      setProfile(profileRes.profile || []);
      setFuelMix(fuelMixRes.fuelMix || null);
      setAlerts(alertsRes.alerts || []);
      setTrend(trendRes.trend || []);
      setEvents(eventsRes.events || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchAll]);

  const kilnChart = useMemo(() => {
    if (!profile.length) return null;
    return {
      labels: profile.map((p) => `${p.positionM}m`),
      datasets: [{
        label: 'Temperature (°C)',
        data: profile.map((p) => p.temperatureC),
        backgroundColor: profile.map((p) => tempColor(p.temperatureC)),
        borderRadius: 3,
      }],
    };
  }, [profile]);

  const fuelMixChart = useMemo(() => {
    if (!fuelMix) return null;
    const labels = Object.keys(fuelMix);
    const colors = { Coal: '#64748b', Petcoke: '#94a3b8', 'Alternative Fuel (RDF)': '#10b981', Biomass: '#84cc16' };
    return {
      labels,
      datasets: [{ data: labels.map((k) => fuelMix[k]), backgroundColor: labels.map((k) => colors[k] || '#3b7de8'), borderWidth: 0 }],
    };
  }, [fuelMix]);

  const savingsChart = useMemo(() => {
    if (!trend) return null;
    return {
      labels: trend.map((d) => d.date.slice(5)),
      datasets: [{ label: 'Cumulative Savings (USD)', data: trend.map((d) => d.cumulativeSavingsUsd), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 1.8 }],
    };
  }, [trend]);

  const kpiDetail = useMemo(() => ({
    specificPower: {
      label: 'Specific Power Consumption',
      value: kpis ? kpis.specificPowerKwhPerTon : '—',
      unit: 'kWh/ton',
      description: 'Total electrical power drawn per ton of cement produced across the grinding and process line.',
      insights: [`Currently running at ${kpis ? kpis.specificPowerKwhPerTon : '—'} kWh/ton.`],
    },
    specificThermal: {
      label: 'Specific Thermal Energy',
      value: kpis ? kpis.specificThermalKcalPerKg : '—',
      unit: 'kcal/kg',
      description: 'Fuel energy consumed per kg of clinker produced in the kiln.',
      insights: [`Currently running at ${kpis ? kpis.specificThermalKcalPerKg : '—'} kcal/kg clinker.`],
      chart: profile.length ? {
        type: 'bar', title: 'Kiln Thermal Profile', xLabel: 'Position (m)', yLabel: 'Temperature (°C)',
        labels: profile.map((p) => `${p.positionM}m`),
        data: profile.map((p) => p.temperatureC),
        colors: profile.map((p) => tempColor(p.temperatureC)),
      } : null,
    },
    altFuelSubstitution: {
      label: 'Alt. Fuel Substitution',
      value: kpis ? `${kpis.altFuelSubstitutionPct}%` : '—',
      description: 'Share of total thermal energy sourced from alternative fuels (RDF, biomass) instead of coal/petcoke.',
      insights: fuelMix ? Object.keys(fuelMix).map((k) => `${k}: ${fuelMix[k]}% of fuel mix.`) : [],
      chart: fuelMix ? {
        type: 'bar', title: 'Fuel Mix (%)', xLabel: 'Fuel Type', yLabel: 'Share (%)',
        labels: Object.keys(fuelMix),
        data: Object.values(fuelMix),
        color: '#10b981',
      } : null,
    },
    throughput: {
      label: 'Throughput',
      value: kpis ? kpis.throughputTonsPerHr : '—',
      unit: 't/hr',
      description: 'Live kiln production throughput measured against the 170 t/h target floor.',
      insights: [`Current throughput is ${kpis ? kpis.throughputTonsPerHr : '—'} t/hr against a 170 t/h target floor.`],
    },
    energySavings: {
      label: 'Energy Savings',
      value: kpis ? `${kpis.energySavingsPct}%` : '—',
      description: 'Cumulative energy savings achieved versus the pre-optimization baseline.',
      insights: [`Energy savings vs. baseline currently stand at ${kpis ? kpis.energySavingsPct : '—'}%.`],
      chart: trend?.length ? {
        type: 'line', title: 'Cumulative Savings Trend (30d)', xLabel: 'Date', yLabel: 'Cumulative Savings (USD)',
        labels: trend.map((d) => d.date.slice(5)),
        data: trend.map((d) => d.cumulativeSavingsUsd),
        color: '#10b981',
      } : null,
    },
    thermalStability: {
      label: 'Kiln Thermal Stability',
      value: kpis ? `${kpis.thermalStabilityScore}/100` : '—',
      description: 'Composite score measuring consistency of the kiln thermal profile — lower scores indicate temperature swings.',
      insights: [`Thermal stability score is ${kpis ? kpis.thermalStabilityScore : '—'}/100.`],
    },
  }), [kpis, profile, fuelMix, trend]);

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Kiln and Energy Optimization</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Live kiln thermal profile, fuel mix, and energy KPIs
          {error && <span className="text-red-400"> · connection error: {error}</span>}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <KPICard size="compact" label="Specific Power Consumption" value={kpis ? kpis.specificPowerKwhPerTon : '—'} unit="kWh/ton" icon={<IcoBolt />} rag="normal" description="Electrical power per ton of cement produced." onClick={() => setSelectedKpi('specificPower')} />
        <KPICard size="compact" label="Specific Thermal Energy" value={kpis ? kpis.specificThermalKcalPerKg : '—'} unit="kcal/kg" icon={<IcoFire />} rag="normal" description="Fuel energy per kg of clinker produced." onClick={() => setSelectedKpi('specificThermal')} />
        <KPICard size="compact" label="Alt. Fuel Substitution" value={kpis ? `${kpis.altFuelSubstitutionPct}%` : '—'} icon={<IcoLeaf />} rag="normal" description="Share of thermal energy from alternative/biomass fuel." onClick={() => setSelectedKpi('altFuelSubstitution')} />
        <KPICard size="compact" label="Throughput" value={kpis ? kpis.throughputTonsPerHr : '—'} unit="t/hr" icon={<IcoSignal />} rag={kpis && kpis.throughputTonsPerHr < 170 ? 'warning' : 'normal'} description="Live kiln throughput vs. the 170 t/h target floor." onClick={() => setSelectedKpi('throughput')} />
        <KPICard size="compact" label="Energy Savings" value={kpis ? `${kpis.energySavingsPct}%` : '—'} icon={<IcoTrendUp />} rag="normal" description="Energy savings vs. pre-optimization baseline." onClick={() => setSelectedKpi('energySavings')} />
        <KPICard size="compact" label="Kiln Thermal Stability" value={kpis ? `${kpis.thermalStabilityScore}/100` : '—'} icon={<IcoDollar />} rag={kpis && kpis.thermalStabilityScore < 75 ? 'warning' : 'normal'} description="Composite score for thermal profile consistency." onClick={() => setSelectedKpi('thermalStability')} />
      </div>

      {/* Active Alerts */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden" style={{ height: 320 }}>
        <AlertPanel alerts={alerts} onClose={() => {}} />
      </div>

      {/* Kiln thermal profile + fuel mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl p-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-3">Kiln Thermal Profile</h3>
          <div style={{ height: 220 }}>
            {kilnChart && (
              <Bar data={kilnChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: chartTooltip() },
                scales: chartScales({
                  x: { title: { display: true, text: 'Position Along Kiln (m)', color: '#94a3b8', font: { size: 9 } } },
                  y: { title: { display: true, text: 'Temperature (°C)', color: '#94a3b8', font: { size: 9 } } },
                }),
              }} />
            )}
          </div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Fuel Mix</h3>
          <div style={{ height: 220 }}>
            {fuelMixChart && (
              <Doughnut data={fuelMixChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'bottom', labels: { color: '#cbd5e1', font: { size: 9 }, boxWidth: 8, usePointStyle: true, padding: 6 } },
                  tooltip: chartTooltip(),
                },
                cutout: '55%',
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Energy savings trend */}
      <div className="bg-app-panel border border-app-border rounded-xl p-4">
        <h3 className="text-sm font-bold text-white mb-3">Energy Savings Trend (30d)</h3>
        <div style={{ height: 200 }}>
          {savingsChart && (
            <Line data={savingsChart} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: chartTooltip() },
              scales: chartScales({
                x: { title: { display: true, text: 'Date', color: '#94a3b8', font: { size: 9 } } },
                y: { title: { display: true, text: 'Cumulative Savings (USD)', color: '#94a3b8', font: { size: 9 } } },
              }),
            }} />
          )}
        </div>
      </div>

      {/* Optimization event log */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border">
          <h3 className="text-sm font-bold text-white">Optimization Event Log</h3>
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Timestamp</th>
              <th className="text-left px-3 py-2 font-bold">Parameter Changed</th>
              <th className="text-left px-3 py-2 font-bold">Before → After</th>
              <th className="text-right px-3 py-2 font-bold">Savings Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {events.map((e, i) => (
              <tr key={i} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{new Date(e.ts).toLocaleString()}</td>
                <td className="px-3 py-2 text-slate-200 font-medium">{e.parameter}</td>
                <td className="px-3 py-2 text-slate-300">{e.beforeValue} → {e.afterValue}</td>
                <td className="px-3 py-2 text-right text-emerald-400 font-semibold">${e.savingsImpactUsd.toLocaleString()}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No optimization events logged yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {mod && (
        <div className="bg-app-panel border border-app-border rounded-xl px-4 py-3 text-[11px] text-slate-400">
          {mod.bottomLine}
        </div>
      )}

      {selectedKpi && (
        <div
          className="w-[420px] max-w-full overflow-hidden animate-slide-up border-l border-app-border bg-app-darker"
          style={{ position: 'fixed', top: 'var(--app-header-h, 62px)', right: 0, bottom: 0, zIndex: 200 }}
        >
          <GenericKPIDetailPanel {...kpiDetail[selectedKpi]} onClose={() => setSelectedKpi(null)} />
        </div>
      )}
    </div>
  );
}
