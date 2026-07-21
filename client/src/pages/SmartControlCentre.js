import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from '../components/chartUtils';
import {
  getControlCentreKpis, getControlCentreDeviations, getControlCentrePlants, getControlCentreDeviationTrend,
  getBagFilterStatus,
} from '../services/api';
import { getModuleBySlug, PLANT_ZONES } from '../services/cementKnowledge';
import KPICard, { IcoSignal, IcoDollar, IcoClock, IcoGlobe, IcoHourglass, IcoShield } from '../components/KPICard';
import AlertPanel from '../components/AlertPanel';
import GenericKPIDetailPanel from '../components/GenericKPIDetailPanel';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const POLL_INTERVAL_MS = 10000;

const STATUS_META = {
  normal: { color: '#10b981', label: 'Normal' },
  watch: { color: '#38bdf8', label: 'Watch' },
  warning: { color: '#f59e0b', label: 'Warning' },
  critical: { color: '#ef4444', label: 'Critical' },
};
const STATUS_RANK = { normal: 0, watch: 1, warning: 2, critical: 3 };

function ProcessFlowTwin({ zoneStatuses }) {
  return (
    <div className="bg-app-panel border border-app-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Digital Twin — Plant Process Flow</h3>
        <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 border border-slate-600/40">
          Simulated 2D schematic
        </span>
      </div>
      <p className="text-[10px] text-slate-500 mb-4">
        Live process-line view of the home plant, status derived from Bag Filter Dust Monitoring compartment readings per zone.
      </p>
      <div className="flex items-stretch overflow-x-auto pb-1">
        {zoneStatuses.map((z, i) => {
          const meta = STATUS_META[z.status] || STATUS_META.normal;
          return (
            <React.Fragment key={z.zone}>
              <div
                className="flex flex-col items-center justify-center rounded-lg p-3 shrink-0"
                style={{ minWidth: 120, background: `${meta.color}12`, border: `1px solid ${meta.color}44` }}
              >
                <span className="w-2.5 h-2.5 rounded-full mb-1.5" style={{ background: meta.color }} />
                <p className="text-[11px] font-bold text-slate-200 text-center leading-tight">{z.zone}</p>
                <p className="text-[9px] mt-1 font-semibold uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{z.compartmentCount} compartment{z.compartmentCount !== 1 ? 's' : ''}</p>
              </div>
              {i < zoneStatuses.length - 1 && (
                <div className="flex items-center px-1.5 shrink-0">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function SmartControlCentre() {
  const mod = getModuleBySlug('smart-control-centre');
  const [kpis, setKpis] = useState(null);
  const [deviations, setDeviations] = useState([]);
  const [plants, setPlants] = useState([]);
  const [trend, setTrend] = useState(null);
  const [bagFilterStatus, setBagFilterStatus] = useState(null);
  const [error, setError] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [kpisRes, deviationsRes, plantsRes, trendRes, bagFilterRes] = await Promise.all([
        getControlCentreKpis(),
        getControlCentreDeviations(),
        getControlCentrePlants(),
        getControlCentreDeviationTrend(),
        getBagFilterStatus(),
      ]);
      setKpis(kpisRes);
      setDeviations(deviationsRes.deviations || []);
      setPlants(plantsRes.plants || []);
      setTrend(trendRes.trend || []);
      setBagFilterStatus(bagFilterRes);
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

  const comparisonChart = useMemo(() => {
    if (!plants.length) return null;
    return {
      labels: plants.map((p) => p.plant.replace(' — ', '\n')),
      datasets: [
        { label: 'Availability (%)', data: plants.map((p) => p.availabilityPct), backgroundColor: '#3b7de8', borderRadius: 4, yAxisID: 'y' },
        { label: 'MTBF (hrs)', data: plants.map((p) => p.mtbfHours), backgroundColor: '#8b5cf6', borderRadius: 4, yAxisID: 'y1' },
      ],
    };
  }, [plants]);

  const zoneStatuses = useMemo(() => {
    const compartments = bagFilterStatus?.compartments || [];
    return PLANT_ZONES.map((zone) => {
      const inZone = compartments.filter((c) => c.zone === zone);
      const worst = inZone.reduce((acc, c) => {
        const s = c.reading.status;
        return (STATUS_RANK[s] ?? 0) > (STATUS_RANK[acc] ?? 0) ? s : acc;
      }, 'normal');
      return { zone, status: worst, compartmentCount: inZone.length };
    });
  }, [bagFilterStatus]);

  const deviationTrendChart = useMemo(() => {
    if (!trend) return null;
    return {
      labels: trend.map((d) => d.date.slice(5)),
      datasets: [
        { label: 'Safety', data: trend.map((d) => d.safety), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', tension: 0.35, pointRadius: 2, borderWidth: 1.5 },
        { label: 'Environment', data: trend.map((d) => d.environment), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', tension: 0.35, pointRadius: 2, borderWidth: 1.5 },
        { label: 'Efficiency', data: trend.map((d) => d.efficiency), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', tension: 0.35, pointRadius: 2, borderWidth: 1.5 },
        { label: 'Quality', data: trend.map((d) => d.quality), borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.08)', tension: 0.35, pointRadius: 2, borderWidth: 1.5 },
      ],
    };
  }, [trend]);

  const kpiDetail = useMemo(() => ({
    equipmentAvailability: {
      label: 'Equipment Availability', value: kpis ? `${kpis.equipmentAvailabilityPct}%` : '—',
      description: 'Share of scheduled time equipment was available for production across the plant network, live from the control centre.',
      insights: plants.length ? [
        `Fleet range: ${Math.min(...plants.map(p => p.availabilityPct))}% – ${Math.max(...plants.map(p => p.availabilityPct))}% across ${plants.length} plants.`,
        `Home plant ranks #${plants.find(p => p.isHome)?.rank ?? '—'} of ${plants.length} on OEE.`,
      ] : [],
      chart: plants.length ? { type: 'bar', labels: plants.map(p => p.plant), data: plants.map(p => p.availabilityPct), color: '#3b7de8', title: 'Availability by Plant', xLabel: 'Plant', yLabel: 'Availability (%)' } : null,
    },
    maintenanceCostReduction: {
      label: 'Maintenance Cost Reduction', value: kpis ? `${kpis.maintenanceCostReductionPct}%` : '—',
      description: 'Maintenance cost reduction vs. the pre-control-centre baseline, driven by standardized SOPs and cross-plant benchmarking.',
      insights: plants.length ? [`Live maintenance cost ranges $${Math.min(...plants.map(p => p.maintenanceCostUsdPerTon))} – $${Math.max(...plants.map(p => p.maintenanceCostUsdPerTon))} per ton across the network.`] : [],
      chart: plants.length ? { type: 'bar', labels: plants.map(p => p.plant), data: plants.map(p => p.maintenanceCostUsdPerTon), color: '#f59e0b', title: 'Maintenance Cost by Plant ($/ton)', xLabel: 'Plant', yLabel: 'USD per ton' } : null,
    },
    mtbf: {
      label: 'MTBF', value: kpis ? kpis.mtbfHours : '—', unit: 'hrs',
      description: 'Mean time between failures for fleet-wide equipment — higher is better, reflects predictive maintenance effectiveness.',
      insights: plants.length ? [`Best-performing plant: ${[...plants].sort((a, b) => b.mtbfHours - a.mtbfHours)[0]?.plant}.`] : [],
      chart: plants.length ? { type: 'bar', labels: plants.map(p => p.plant), data: plants.map(p => p.mtbfHours), color: '#8b5cf6', title: 'MTBF by Plant (hrs)', xLabel: 'Plant', yLabel: 'MTBF (hrs)' } : null,
    },
    crossPlantBenchmark: {
      label: 'Cross-plant Benchmark Score', value: kpis ? kpis.crossPlantBenchmarkScore : '—',
      description: 'Composite score (availability, MTBF, uptime) ranking the home plant against peer plants in the network.',
      insights: plants.length ? [`OEE used as a benchmark proxy — home plant OEE ${plants.find(p => p.isHome)?.oeePct ?? '—'}%.`] : [],
      chart: plants.length ? { type: 'bar', labels: plants.map(p => p.plant), data: plants.map(p => p.oeePct), color: '#10b981', title: 'OEE by Plant (%)', xLabel: 'Plant', yLabel: 'OEE (%)' } : null,
    },
    timeToCorrectiveAction: {
      label: 'Time to Corrective Action', value: kpis ? kpis.timeToCorrectiveActionMin : '—', unit: 'min',
      description: 'Average time from a deviation being flagged by the control centre to corrective action being taken on-site.',
      insights: [`${deviations.filter(d => !d.acknowledged).length} deviation(s) currently awaiting action across the network.`],
      chart: null,
    },
    systemUptime: {
      label: 'System Uptime', value: kpis ? `${kpis.systemUptimePct}%` : '—',
      description: 'Control centre platform uptime — the availability of the unified monitoring layer itself, not the plants it observes.',
      insights: ['Centralization concentrates risk: a control-centre outage affects visibility across every connected plant.'],
      chart: null,
    },
  }), [kpis, plants, deviations]);

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Smart Control Centre Management</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Unified oversight across {plants.length || 6} plants
          {error && <span className="text-red-400"> · connection error: {error}</span>}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <KPICard size="compact" label="Equipment Availability" value={kpis ? `${kpis.equipmentAvailabilityPct}%` : '—'} icon={<IcoSignal />} rag="normal" description="Live availability for the home plant vs. the fleet." onClick={() => setSelectedKpi('equipmentAvailability')} />
        <KPICard size="compact" label="Maintenance Cost Reduction" value={kpis ? `${kpis.maintenanceCostReductionPct}%` : '—'} icon={<IcoDollar />} rag="normal" description="Cost reduction vs. pre-control-centre baseline." onClick={() => setSelectedKpi('maintenanceCostReduction')} />
        <KPICard size="compact" label="MTBF" value={kpis ? kpis.mtbfHours : '—'} unit="hrs" icon={<IcoClock />} rag="normal" description="Mean time between failures, fleet-wide equipment." onClick={() => setSelectedKpi('mtbf')} />
        <KPICard size="compact" label="Cross-plant Benchmark Score" value={kpis ? kpis.crossPlantBenchmarkScore : '—'} icon={<IcoGlobe />} rag="normal" description="Composite score vs. peer plants (availability, MTBF, uptime)." onClick={() => setSelectedKpi('crossPlantBenchmark')} />
        <KPICard size="compact" label="Time to Corrective Action" value={kpis ? kpis.timeToCorrectiveActionMin : '—'} unit="min" icon={<IcoHourglass />} rag="normal" description="Average time from deviation flagged to action taken." onClick={() => setSelectedKpi('timeToCorrectiveAction')} />
        <KPICard size="compact" label="System Uptime" value={kpis ? `${kpis.systemUptimePct}%` : '—'} icon={<IcoShield />} rag="normal" description="Control centre platform uptime across the network." onClick={() => setSelectedKpi('systemUptime')} />
      </div>

      {/* Active Alerts */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden" style={{ height: 320 }}>
        <AlertPanel alerts={deviations} onClose={() => {}} />
      </div>

      {/* Comparison + deviation trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Multi-Plant KPI Comparison</h3>
          <div style={{ height: 220 }}>
            {comparisonChart && (
              <Bar data={comparisonChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 9 }, boxWidth: 8, usePointStyle: true, padding: 6 } },
                  tooltip: chartTooltip(),
                },
                scales: {
                  x: { ...chartScales().x, title: { display: true, text: 'Plant', color: '#94a3b8', font: { size: 9 } }, ticks: { color: '#94a3b8', font: { size: 8 } } },
                  y: { ...chartScales().y, position: 'left', title: { display: true, text: 'Availability (%)', color: '#94a3b8', font: { size: 9 } } },
                  y1: { ...chartScales().y, position: 'right', grid: { display: false }, title: { display: true, text: 'MTBF (hrs)', color: '#94a3b8', font: { size: 9 } } },
                },
              }} />
            )}
          </div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Live Deviation Trend (7d)</h3>
          <div style={{ height: 220 }}>
            {deviationTrendChart && (
              <Line data={deviationTrendChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 9 }, boxWidth: 8, usePointStyle: true, padding: 6 } },
                  tooltip: chartTooltip(),
                },
                scales: chartScales({
                  x: { title: { display: true, text: 'Date', color: '#94a3b8', font: { size: 9 } } },
                  y: { title: { display: true, text: 'Deviation count', color: '#94a3b8', font: { size: 9 } }, ticks: { precision: 0 } },
                }),
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Digital twin schematic */}
      <ProcessFlowTwin zoneStatuses={zoneStatuses} />

      {/* Plant table */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border">
          <h3 className="text-sm font-bold text-white">Plant Benchmarking</h3>
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Plant</th>
              <th className="text-right px-3 py-2 font-bold">OEE</th>
              <th className="text-right px-3 py-2 font-bold">Availability</th>
              <th className="text-right px-3 py-2 font-bold">MTBF</th>
              <th className="text-right px-3 py-2 font-bold">Maintenance Cost</th>
              <th className="text-center px-3 py-2 font-bold">Rank</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {plants.map((p) => (
              <tr key={p.plantId} className={`hover:bg-white/[0.02] ${p.isHome ? 'bg-sky-500/[0.04]' : ''}`}>
                <td className="px-3 py-2 text-slate-200 font-medium">{p.plant}{p.isHome && <span className="ml-1.5 text-[9px] text-sky-400 font-bold uppercase">Home</span>}</td>
                <td className="px-3 py-2 text-right text-slate-300">{p.oeePct}%</td>
                <td className="px-3 py-2 text-right text-slate-300">{p.availabilityPct}%</td>
                <td className="px-3 py-2 text-right text-slate-300">{p.mtbfHours}h</td>
                <td className="px-3 py-2 text-right text-slate-300">${p.maintenanceCostUsdPerTon}/ton</td>
                <td className="px-3 py-2 text-center font-bold text-slate-200">#{p.rank}</td>
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
