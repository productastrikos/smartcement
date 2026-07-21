import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../services/socket';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from '../components/chartUtils';
import { PLATFORM } from '../services/cementKnowledge';
import KPICard, { IcoGlobe, IcoAlert, IcoBolt, IcoLeaf, IcoClock, IcoShield } from '../components/KPICard';
import GaugeChart from '../components/GaugeChart';
import GenericKPIDetailPanel from '../components/GenericKPIDetailPanel';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const SEVERITY_STYLE = {
  critical: 'text-red-300 bg-red-500/15 border-red-500/30',
  warning: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
  info: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { plantKpis } = useContext(DataContext);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const alertTrendChart = useMemo(() => {
    if (!plantKpis?.alertTrend7d) return null;
    return {
      labels: plantKpis.alertTrend7d.map((d) => d.date.slice(5)),
      datasets: [
        { label: 'Critical', data: plantKpis.alertTrend7d.map((d) => d.critical), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.12)', fill: true, tension: 0.35, pointRadius: 2, borderWidth: 1.6 },
        { label: 'Warning', data: plantKpis.alertTrend7d.map((d) => d.warning), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.35, pointRadius: 2, borderWidth: 1.6 },
      ],
    };
  }, [plantKpis]);

  const oee = plantKpis?.oee;
  const energy = plantKpis?.energyPerTon;
  const co2 = plantKpis?.co2PerTon;
  const activeAlerts = plantKpis?.activeAlerts;
  const complianceDays = plantKpis?.complianceDaysSinceViolation;

  const kpiDetail = useMemo(() => ({
    oee: {
      label: 'OEE',
      value: oee ? `${oee.value.toFixed(1)}%` : '—',
      description: 'Overall Equipment Effectiveness — composite measure of availability, performance, and quality across the plant.',
      insights: [`Current OEE is ${oee ? oee.value.toFixed(1) : '—'}% against a ${oee ? oee.target : '—'}% target.`],
    },
    energy: {
      label: 'Energy Consumption',
      value: energy ? energy.value.toFixed(1) : '—',
      unit: 'kWh/ton',
      description: 'Plant-wide electrical energy consumed per ton of cement produced.',
      insights: [`Current draw is ${energy ? energy.value.toFixed(1) : '—'} kWh/ton against a ${energy ? energy.target : '—'} kWh/ton target.`],
    },
    co2: {
      label: 'CO2 Emissions',
      value: co2 ? Math.round(co2.value) : '—',
      unit: 'kg/ton',
      description: 'Plant-wide CO2 emissions per ton of cement produced, sourced from the Emissions & Carbon Tracking module.',
      insights: [`Current CO2 intensity is ${co2 ? Math.round(co2.value) : '—'} kg/ton against a ${co2 ? co2.target : '—'} kg/ton target.`],
    },
    downtime: {
      label: 'Unplanned Downtime',
      value: plantKpis ? plantKpis.unplannedDowntimeMtdHours.toFixed(1) : '—',
      unit: 'hrs MTD',
      description: 'Total unplanned downtime hours accumulated month-to-date across all monitored assets.',
      insights: [`${plantKpis ? plantKpis.unplannedDowntimeMtdHours.toFixed(1) : '—'} hours of unplanned downtime recorded this month.`],
    },
  }), [oee, energy, co2, plantKpis]);

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">{PLATFORM.name} — {PLATFORM.plantName}</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">Plant-wide operations overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <KPICard
          size="compact"
          label="OEE"
          value={oee ? `${oee.value.toFixed(1)}%` : '—'}
          icon={<IcoGlobe />}
          rag={oee && oee.value >= oee.target - 5 ? 'normal' : 'warning'}
          subValues={oee ? [{ label: 'TARGET', value: `${oee.target}%` }] : undefined}
          onClick={() => setSelectedKpi('oee')}
        />
        <KPICard
          size="compact"
          label="Active Alerts"
          value={activeAlerts?.total ?? 0}
          icon={<IcoAlert />}
          rag={activeAlerts?.critical > 0 ? 'critical' : activeAlerts?.warning > 0 ? 'warning' : 'normal'}
          subValues={activeAlerts ? [
            { label: 'CRITICAL', value: activeAlerts.critical },
            { label: 'WARNING', value: activeAlerts.warning },
          ] : undefined}
          onClick={() => navigate('/modules/bag-filter-dust-monitoring')}
        />
        <KPICard
          size="compact"
          label="Energy Consumption"
          value={energy ? energy.value.toFixed(1) : '—'}
          unit="kWh/ton"
          icon={<IcoBolt />}
          rag={energy && Math.abs(energy.value - energy.target) < 6 ? 'normal' : 'warning'}
          subValues={energy ? [{ label: 'TARGET', value: `${energy.target} kWh/ton` }] : undefined}
          onClick={() => setSelectedKpi('energy')}
        />
        <KPICard
          size="compact"
          label="CO2 Emissions"
          value={co2 ? Math.round(co2.value) : '—'}
          unit="kg/ton"
          icon={<IcoLeaf />}
          rag={co2 && Math.abs(co2.value - co2.target) < 25 ? 'normal' : 'warning'}
          subValues={co2 ? [{ label: 'TARGET', value: `${co2.target} kg/ton` }] : undefined}
          onClick={() => setSelectedKpi('co2')}
        />
        <KPICard
          size="compact"
          label="Unplanned Downtime"
          value={plantKpis ? plantKpis.unplannedDowntimeMtdHours.toFixed(1) : '—'}
          unit="hrs MTD"
          icon={<IcoClock />}
          rag={plantKpis && plantKpis.unplannedDowntimeMtdHours > 8 ? 'warning' : 'normal'}
          onClick={() => setSelectedKpi('downtime')}
        />
        <KPICard
          size="compact"
          label="Compliance Status"
          value={complianceDays != null ? complianceDays : 'None yet'}
          unit={complianceDays != null ? 'days since violation' : ''}
          icon={<IcoShield />}
          rag={complianceDays == null || complianceDays > 3 ? 'normal' : 'critical'}
          onClick={() => navigate('/compliance')}
        />
      </div>

      {/* Alert trend + Energy gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl p-4 lg:col-span-2">
          <h3 className="text-sm font-bold text-white mb-3">7-Day Alert Trend</h3>
          <div style={{ height: 200 }}>
            {alertTrendChart && (
              <Line data={alertTrendChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 9 }, boxWidth: 8, usePointStyle: true, padding: 6 } },
                  tooltip: chartTooltip(),
                },
                scales: chartScales({
                  x: { title: { display: true, text: 'Date', color: '#94a3b8', font: { size: 9 } } },
                  y: { title: { display: true, text: 'Alert count', color: '#94a3b8', font: { size: 9 } }, ticks: { precision: 0 } },
                }),
              }} />
            )}
          </div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4 flex flex-col items-center justify-center">
          <h3 className="text-sm font-bold text-white mb-1 self-start">Energy vs. Target</h3>
          {energy && (
            <GaugeChart value={energy.value} min={energy.min} max={energy.max} target={energy.target} unit=" kWh/ton" />
          )}
        </div>
      </div>

      {/* Top 5 critical alerts */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border">
          <h3 className="text-sm font-bold text-white">Top Critical Alerts</h3>
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Module</th>
              <th className="text-left px-3 py-2 font-bold">Alert</th>
              <th className="text-left px-3 py-2 font-bold">Time</th>
              <th className="text-center px-3 py-2 font-bold">Severity</th>
              <th className="text-center px-3 py-2 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {(plantKpis?.topCriticalAlerts || []).map((a) => (
              <tr key={a.alertId} className="hover:bg-white/[0.02] cursor-pointer" onClick={() => navigate(`/modules/${a.moduleId}`)}>
                <td className="px-3 py-2 text-slate-300">{a.module}</td>
                <td className="px-3 py-2 text-slate-200 font-medium">{a.title}</td>
                <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{new Date(a.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info}`}>{a.severity}</span>
                </td>
                <td className="px-3 py-2 text-center text-slate-400 uppercase text-[9px] font-bold">{a.status}</td>
              </tr>
            ))}
            {(!plantKpis?.topCriticalAlerts || plantKpis.topCriticalAlerts.length === 0) && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No active critical or warning alerts</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
