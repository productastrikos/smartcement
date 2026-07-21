import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from '../components/chartUtils';
import {
  getEmissionsKpis, getEmissionsTrend, getAltFuelTrend, getEmissionsReadingsTable, getEmissionsAlerts,
} from '../services/api';
import { getModuleBySlug } from '../services/cementKnowledge';
import KPICard, { IcoLeaf, IcoWind, IcoFuel, IcoCheck, IcoClipboard, IcoFire } from '../components/KPICard';
import AlertPanel from '../components/AlertPanel';
import GenericKPIDetailPanel from '../components/GenericKPIDetailPanel';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const POLL_INTERVAL_MS = 10000;

const STATUS_STYLE = {
  normal: 'text-emerald-400 bg-emerald-500/15',
  warning: 'text-amber-400 bg-amber-500/15',
  breach: 'text-red-400 bg-red-500/15',
};

export default function EmissionsTracking() {
  const mod = getModuleBySlug('emissions-carbon-tracking');
  const [kpis, setKpis] = useState(null);
  const [trend, setTrend] = useState(null);
  const [altFuelTrend, setAltFuelTrend] = useState(null);
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [kpisRes, trendRes, altFuelRes, readingsRes, alertsRes] = await Promise.all([
        getEmissionsKpis(), getEmissionsTrend(), getAltFuelTrend(), getEmissionsReadingsTable(), getEmissionsAlerts(),
      ]);
      setKpis(kpisRes);
      setTrend(trendRes);
      setAltFuelTrend(altFuelRes.trend || []);
      setReadings(readingsRes.readings || []);
      setAlerts(alertsRes.alerts || []);
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

  const emissionsChart = useMemo(() => {
    if (!trend || !trend.dust?.length) return null;
    const labels = trend.dust.map((p) => new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    return {
      labels,
      datasets: [
        { label: 'Dust (mg/Nm³)', data: trend.dust.map((p) => p.value), borderColor: '#3b7de8', backgroundColor: 'rgba(59,125,232,0.08)', tension: 0.3, pointRadius: 0, borderWidth: 1.6, fill: true },
        { label: 'Dust Permit Limit', data: labels.map(() => trend.limits.dust), borderColor: '#3b7de8', borderDash: [6, 4], borderWidth: 1.2, pointRadius: 0, fill: false },
        { label: 'NOx (mg/Nm³)', data: trend.nox.map((p) => p.value), borderColor: '#f59e0b', tension: 0.3, pointRadius: 0, borderWidth: 1.6, fill: false },
        { label: 'SO2 (mg/Nm³)', data: trend.so2.map((p) => p.value), borderColor: '#8b5cf6', tension: 0.3, pointRadius: 0, borderWidth: 1.6, fill: false },
      ],
    };
  }, [trend]);

  const altFuelChart = useMemo(() => {
    if (!altFuelTrend) return null;
    return {
      labels: altFuelTrend.map((d) => d.date.slice(5)),
      datasets: [{ label: 'Alt. Fuel Substitution (%)', data: altFuelTrend.map((d) => d.substitutionPct), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 1.8 }],
    };
  }, [altFuelTrend]);

  const kpiDetail = useMemo(() => ({
    co2PerTon: {
      label: 'CO2 per Ton',
      value: kpis?.co2PerTonKg ?? '—',
      unit: 'kg/ton',
      description: 'Live CO2 emissions per ton of cement produced, derived from kiln fuel mix and process data.',
      insights: [`Current CO2 intensity is ${kpis?.co2PerTonKg ?? '—'} kg/ton.`],
    },
    noxPerTon: {
      label: 'NOx per Ton',
      value: kpis ? kpis.noxKgPerTon : '—',
      unit: 'kg/ton',
      description: 'NOx emissions per ton of cement, derived from live stack gas concentration readings.',
      insights: [`Current NOx intensity is ${kpis ? kpis.noxKgPerTon : '—'} kg/ton.`],
      chart: emissionsChart ? {
        type: 'line', title: 'Live Emissions vs. Permit Limit', xLabel: 'Time', yLabel: 'Concentration (mg/Nm³)',
        labels: emissionsChart.labels,
        data: trend?.nox?.map((p) => p.value) || [],
        color: '#f59e0b',
      } : null,
    },
    so2DustPerTon: {
      label: 'SO2/Dust per Ton',
      value: kpis ? kpis.so2DustKgPerTon : '—',
      unit: 'kg/ton',
      description: 'Combined SO2 and particulate matter emissions per ton of cement produced.',
      insights: [`Current SO2/Dust intensity is ${kpis ? kpis.so2DustKgPerTon : '—'} kg/ton.`],
      chart: trend?.dust?.length ? {
        type: 'line', title: 'Live Dust vs. Permit Limit', xLabel: 'Time', yLabel: 'Concentration (mg/Nm³)',
        labels: emissionsChart?.labels || [],
        data: trend.dust.map((p) => p.value),
        color: '#3b7de8',
      } : null,
    },
    altFuelSubstitution: {
      label: 'Alt. Fuel Substitution',
      value: kpis ? `${kpis.altFuelThermalSubstitutionPct}%` : '—',
      description: 'Share of total thermal energy from alternative fuel sources (shared metric with Kiln & Energy Optimization).',
      insights: [`Alt. fuel substitution currently at ${kpis ? kpis.altFuelThermalSubstitutionPct : '—'}%.`],
      chart: altFuelChart ? {
        type: 'line', title: 'Alternative Fuel Share Trend (30d)', xLabel: 'Date', yLabel: 'Substitution Rate (%)',
        labels: altFuelChart.labels,
        data: altFuelChart.datasets[0].data,
        color: '#10b981',
      } : null,
    },
    permitComplianceRate: {
      label: 'Permit Compliance Rate',
      value: kpis ? `${kpis.permitComplianceRatePct}%` : '—',
      description: 'Live compliance rate of stack emissions against active regulatory permit limits.',
      insights: readings.length ? readings.map((r) => `${r.parameter}: ${r.value} mg/Nm³ (limit ${r.permitLimit}) — ${r.status}.`) : [],
    },
    auditReadinessScore: {
      label: 'Audit Readiness Score',
      value: kpis ? `${kpis.auditReadinessScore}/100` : '—',
      description: 'Composite score reflecting open compliance findings and completeness of emissions records.',
      insights: [`Audit readiness score is ${kpis ? kpis.auditReadinessScore : '—'}/100.`],
    },
  }), [kpis, trend, emissionsChart, altFuelChart, readings]);

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Emissions and Carbon Tracking</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Live CEMS stack data — dust readings shared with the Bag Filter module, alt. fuel share shared with Energy Optimization
          {error && <span className="text-red-400"> · connection error: {error}</span>}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <KPICard size="compact" label="CO2 per Ton" value={kpis?.co2PerTonKg ?? '—'} unit="kg/ton" icon={<IcoLeaf />} rag="normal" description="Live CO2 emissions per ton of cement produced." onClick={() => setSelectedKpi('co2PerTon')} />
        <KPICard size="compact" label="NOx per Ton" value={kpis ? kpis.noxKgPerTon : '—'} unit="kg/ton" icon={<IcoWind />} rag="normal" description="NOx emissions per ton, derived from live stack concentration." onClick={() => setSelectedKpi('noxPerTon')} />
        <KPICard size="compact" label="SO2/Dust per Ton" value={kpis ? kpis.so2DustKgPerTon : '—'} unit="kg/ton" icon={<IcoFire />} rag="normal" description="Combined SO2 and particulate emissions per ton." onClick={() => setSelectedKpi('so2DustPerTon')} />
        <KPICard size="compact" label="Alt. Fuel Substitution" value={kpis ? `${kpis.altFuelThermalSubstitutionPct}%` : '—'} icon={<IcoFuel />} rag="normal" description="Share of thermal energy from alternative fuel (shared with Energy Optimization)." onClick={() => setSelectedKpi('altFuelSubstitution')} />
        <KPICard size="compact" label="Permit Compliance Rate" value={kpis ? `${kpis.permitComplianceRatePct}%` : '—'} icon={<IcoCheck />} rag={kpis && kpis.permitComplianceRatePct < 90 ? 'warning' : 'normal'} description="Live compliance rate against active regulatory permit limits." onClick={() => setSelectedKpi('permitComplianceRate')} />
        <KPICard size="compact" label="Audit Readiness Score" value={kpis ? `${kpis.auditReadinessScore}/100` : '—'} icon={<IcoClipboard />} rag={kpis && kpis.auditReadinessScore < 80 ? 'warning' : 'normal'} description="Composite score reflecting open findings and record completeness." onClick={() => setSelectedKpi('auditReadinessScore')} />
      </div>

      {/* Active Alerts */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden" style={{ height: 320 }}>
        <AlertPanel alerts={alerts} onClose={() => {}} />
      </div>

      {/* Graphs */}
      <div className="bg-app-panel border border-app-border rounded-xl p-4">
        <h3 className="text-sm font-bold text-white mb-1">Live Emissions vs. Permit Limit</h3>
        <p className="text-[10px] text-slate-500 mb-2">Dashed line = dust/PM regulatory permit limit ({trend?.limits?.dust ?? 30} mg/Nm³)</p>
        <div style={{ height: 220 }}>
          {emissionsChart && (
            <Line data={emissionsChart} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 9 }, boxWidth: 8, usePointStyle: true, padding: 6 } },
                tooltip: chartTooltip(),
              },
              scales: chartScales({
                x: { title: { display: true, text: 'Time', color: '#94a3b8', font: { size: 9 } } },
                y: { title: { display: true, text: 'Concentration (mg/Nm³)', color: '#94a3b8', font: { size: 9 } } },
              }),
            }} />
          )}
        </div>
      </div>

      <div className="bg-app-panel border border-app-border rounded-xl p-4">
        <h3 className="text-sm font-bold text-white mb-3">Alternative Fuel Share Trend (30d)</h3>
        <div style={{ height: 200 }}>
          {altFuelChart && (
            <Line data={altFuelChart} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: chartTooltip() },
              scales: chartScales({
                x: { title: { display: true, text: 'Date', color: '#94a3b8', font: { size: 9 } } },
                y: { title: { display: true, text: 'Substitution Rate (%)', color: '#94a3b8', font: { size: 9 } } },
              }),
            }} />
          )}
        </div>
      </div>

      {/* Live readings table */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border">
          <h3 className="text-sm font-bold text-white">Live Compliance Readings</h3>
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Timestamp</th>
              <th className="text-left px-3 py-2 font-bold">Parameter</th>
              <th className="text-right px-3 py-2 font-bold">Value</th>
              <th className="text-right px-3 py-2 font-bold">Permit Limit</th>
              <th className="text-center px-3 py-2 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {readings.map((r) => (
              <tr key={r.parameter} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{new Date(r.timestamp).toLocaleString()}</td>
                <td className="px-3 py-2 text-slate-200 font-medium">{r.parameter}</td>
                <td className="px-3 py-2 text-right text-slate-300">{r.value} mg/Nm³</td>
                <td className="px-3 py-2 text-right text-slate-400">{r.permitLimit} mg/Nm³</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_STYLE[r.status] || STATUS_STYLE.normal}`}>{r.status}</span>
                </td>
              </tr>
            ))}
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
