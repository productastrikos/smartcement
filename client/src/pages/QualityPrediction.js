import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from '../components/chartUtils';
import { getQualityKpis, getQualityBatches, getQualityAlerts } from '../services/api';
import { getModuleBySlug } from '../services/cementKnowledge';
import KPICard, { IcoAlert, IcoCheck, IcoClock, IcoTrendDown, IcoScale, IcoBox } from '../components/KPICard';
import AlertPanel from '../components/AlertPanel';
import GenericKPIDetailPanel from '../components/GenericKPIDetailPanel';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const POLL_INTERVAL_MS = 10000;

export default function QualityPrediction() {
  const mod = getModuleBySlug('quality-prediction-lab-automation');
  const [kpis, setKpis] = useState(null);
  const [batches, setBatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [kpisRes, batchesRes, alertsRes] = await Promise.all([
        getQualityKpis(), getQualityBatches(), getQualityAlerts(),
      ]);
      setKpis(kpisRes);
      setBatches(batchesRes.batches || []);
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

  const orderedBatches = useMemo(() => [...batches].reverse(), [batches]);

  const overlayChart = useMemo(() => {
    if (!orderedBatches.length) return null;
    return {
      labels: orderedBatches.map((b) => b.batchId),
      datasets: [
        { label: 'Predicted Free Lime (%)', data: orderedBatches.map((b) => b.predictedFreeLime), borderColor: '#3b7de8', borderDash: [5, 3], tension: 0.3, pointRadius: 1.5, borderWidth: 1.6, fill: false },
        { label: 'Lab-Measured Free Lime (%)', data: orderedBatches.map((b) => b.measuredFreeLime), borderColor: '#10b981', tension: 0.3, pointRadius: 1.5, borderWidth: 1.8, fill: false },
      ],
    };
  }, [orderedBatches]);

  const driftTimelineChart = useMemo(() => {
    if (!orderedBatches.length) return null;
    const target = kpis?.targets?.freeLimePct?.target ?? 1.5;
    return {
      labels: orderedBatches.map((b) => new Date(b.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
      datasets: [{
        label: 'Deviation Magnitude (|measured - target|)',
        data: orderedBatches.map((b) => Number(Math.abs(b.measuredFreeLime - target).toFixed(2))),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 1.5,
        borderWidth: 1.6,
      }],
    };
  }, [orderedBatches, kpis]);

  const kpiDetail = useMemo(() => ({
    offSpecBatchRate: {
      label: 'Off-spec Batch Rate',
      value: kpis ? `${kpis.offSpecBatchRatePct}%` : '—',
      description: 'Share of production batches falling outside quality spec over the trailing 7-day window.',
      insights: [`${kpis ? kpis.offSpecBatchRatePct : '—'}% of batches were off-spec this period.`],
    },
    predictionAccuracy: {
      label: 'Prediction Accuracy',
      value: kpis ? `${kpis.predictionAccuracyPct}%` : '—',
      description: 'Soft-sensor model accuracy comparing predicted free lime against lab-confirmed results.',
      insights: [`Model accuracy currently at ${kpis ? kpis.predictionAccuracyPct : '—'}%.`],
      chart: overlayChart ? {
        type: 'line', title: 'Predicted vs. Measured Free Lime (%)', xLabel: 'Batch ID', yLabel: 'Free Lime (%)',
        labels: overlayChart.labels,
        data: orderedBatches.map((b) => b.measuredFreeLime),
        color: '#10b981',
      } : null,
    },
    timeToDetectDrift: {
      label: 'Time to Detect Drift',
      value: kpis ? kpis.timeToDetectDriftMin : '—',
      unit: 'min',
      description: 'Average time elapsed from when process drift begins to when it is detected by the soft-sensor model.',
      insights: [`Average detection time is ${kpis ? kpis.timeToDetectDriftMin : '—'} minutes.`],
      chart: driftTimelineChart ? {
        type: 'line', title: 'Drift Alert Timeline', xLabel: 'Time', yLabel: 'Deviation Magnitude',
        labels: driftTimelineChart.labels,
        data: driftTimelineChart.datasets[0].data,
        color: '#ef4444',
      } : null,
    },
    reworkRejectionRate: {
      label: 'Rework/Rejection Rate',
      value: kpis ? `${kpis.reworkRejectionRatePct}%` : '—',
      description: 'Share of production requiring rework or full rejection due to quality deviations.',
      insights: [`Rework/rejection rate is ${kpis ? kpis.reworkRejectionRatePct : '—'}% this period.`],
    },
    rawMaterialConsistency: {
      label: 'Raw Material Consistency',
      value: kpis ? `${kpis.rawMaterialConsistencyIndex}/100` : '—',
      description: 'Composite index measuring incoming raw material consistency versus the established baseline.',
      insights: [`Consistency index is currently ${kpis ? kpis.rawMaterialConsistencyIndex : '—'}/100.`],
    },
    batchesTraced: {
      label: 'Batches Traced',
      value: kpis ? kpis.batchesTracedCount : '—',
      description: 'Total number of production batches logged with full process traceability, from raw material to lab confirmation.',
      insights: [`${kpis ? kpis.batchesTracedCount : '—'} batches have full traceability records.`],
    },
  }), [kpis, overlayChart, driftTimelineChart, orderedBatches]);

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Quality Prediction and Lab Automation</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Soft-sensor quality prediction vs. lab-confirmed results, {kpis?.batchesTracedCount ?? 0} batches traced
          {error && <span className="text-red-400"> · connection error: {error}</span>}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <KPICard size="compact" label="Off-spec Batch Rate" value={kpis ? `${kpis.offSpecBatchRatePct}%` : '—'} icon={<IcoAlert />} rag={kpis && kpis.offSpecBatchRatePct > 10 ? 'warning' : 'normal'} description="Share of batches outside spec over the last 7 days." onClick={() => setSelectedKpi('offSpecBatchRate')} />
        <KPICard size="compact" label="Prediction Accuracy" value={kpis ? `${kpis.predictionAccuracyPct}%` : '—'} icon={<IcoCheck />} rag="normal" description="Soft-sensor model accuracy vs. lab-confirmed results." onClick={() => setSelectedKpi('predictionAccuracy')} />
        <KPICard size="compact" label="Time to Detect Drift" value={kpis ? kpis.timeToDetectDriftMin : '—'} unit="min" icon={<IcoClock />} rag="normal" description="Average time from process drift to detection." onClick={() => setSelectedKpi('timeToDetectDrift')} />
        <KPICard size="compact" label="Rework/Rejection Rate" value={kpis ? `${kpis.reworkRejectionRatePct}%` : '—'} icon={<IcoTrendDown />} rag="normal" description="Share of production requiring rework or rejection." onClick={() => setSelectedKpi('reworkRejectionRate')} />
        <KPICard size="compact" label="Raw Material Consistency" value={kpis ? `${kpis.rawMaterialConsistencyIndex}/100` : '—'} icon={<IcoScale />} rag="normal" description="Index of incoming raw material consistency vs. baseline." onClick={() => setSelectedKpi('rawMaterialConsistency')} />
        <KPICard size="compact" label="Batches Traced" value={kpis ? kpis.batchesTracedCount : '—'} icon={<IcoBox />} rag="normal" description="Total batches logged with full process traceability." onClick={() => setSelectedKpi('batchesTraced')} />
      </div>

      {/* Active Alerts */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden" style={{ height: 320 }}>
        <AlertPanel alerts={alerts} onClose={() => {}} />
      </div>

      {/* Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Predicted vs. Measured — Free Lime %</h3>
          <div style={{ height: 220 }}>
            {overlayChart && (
              <Line data={overlayChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 9 }, boxWidth: 8, usePointStyle: true, padding: 6 } },
                  tooltip: chartTooltip(),
                },
                scales: chartScales({
                  x: { title: { display: true, text: 'Batch ID', color: '#94a3b8', font: { size: 9 } }, ticks: { maxTicksLimit: 8 } },
                  y: { title: { display: true, text: 'Free Lime (%)', color: '#94a3b8', font: { size: 9 } } },
                }),
              }} />
            )}
          </div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Drift Alert Timeline</h3>
          <div style={{ height: 220 }}>
            {driftTimelineChart && (
              <Line data={driftTimelineChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: chartTooltip() },
                scales: chartScales({
                  x: { title: { display: true, text: 'Time', color: '#94a3b8', font: { size: 9 } }, ticks: { maxTicksLimit: 8 } },
                  y: { title: { display: true, text: 'Deviation Magnitude', color: '#94a3b8', font: { size: 9 } } },
                }),
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border">
          <h3 className="text-sm font-bold text-white">Batch Quality Log</h3>
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Batch ID</th>
              <th className="text-left px-3 py-2 font-bold">Timestamp</th>
              <th className="text-right px-3 py-2 font-bold">Predicted (Free Lime)</th>
              <th className="text-right px-3 py-2 font-bold">Lab-Confirmed (Free Lime)</th>
              <th className="text-center px-3 py-2 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {batches.map((b) => (
              <tr key={b.batchId} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-mono text-slate-400">{b.batchId}</td>
                <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{new Date(b.ts).toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-slate-300">{b.predictedFreeLime}%</td>
                <td className="px-3 py-2 text-right text-slate-300">{b.measuredFreeLime}%</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${b.status === 'off-spec' ? 'text-red-400 bg-red-500/15' : 'text-emerald-400 bg-emerald-500/15'}`}>{b.status}</span>
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
