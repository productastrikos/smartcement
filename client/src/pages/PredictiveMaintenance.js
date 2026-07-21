import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from '../components/chartUtils';
import {
  getPredictiveMaintenanceKpis, getPredictiveMaintenanceAssets, getPredictiveMaintenanceAlerts, getAssetTrend,
} from '../services/api';
import { getModuleBySlug } from '../services/cementKnowledge';
import KPICard, { IcoDollar, IcoHourglass, IcoClipboard, IcoWrench, IcoCheck, IcoClock } from '../components/KPICard';
import AlertPanel from '../components/AlertPanel';
import GenericKPIDetailPanel from '../components/GenericKPIDetailPanel';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const POLL_INTERVAL_MS = 10000;

const STATUS_COLOR = { normal: '#10b981', watch: '#38bdf8', warning: '#f59e0b', critical: '#ef4444' };

function AssetScorecard({ asset, selected, onClick }) {
  const color = STATUS_COLOR[asset.baselineStatus] || STATUS_COLOR.normal;
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg p-3 border transition-colors"
      style={{ background: selected ? `${color}1a` : 'rgba(255,255,255,0.02)', borderColor: selected ? color : 'var(--app-border)' }}
    >
      <p className="text-[11px] font-bold text-slate-200 leading-tight">{asset.name}</p>
      <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{asset.type}</p>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
        <div className="h-full transition-all" style={{ width: `${asset.healthScore}%`, background: color }} />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] font-bold" style={{ color }}>{asset.healthScore}/100</span>
        <span className="text-[9px] text-slate-500">{asset.rulDays}d RUL</span>
      </div>
    </button>
  );
}

export default function PredictiveMaintenance() {
  const mod = getModuleBySlug('predictive-maintenance');
  const [kpis, setKpis] = useState(null);
  const [assets, setAssets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [assetTrend, setAssetTrend] = useState(null);
  const [error, setError] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [kpisRes, assetsRes, alertsRes] = await Promise.all([
        getPredictiveMaintenanceKpis(), getPredictiveMaintenanceAssets(), getPredictiveMaintenanceAlerts(),
      ]);
      setKpis(kpisRes);
      setAssets(assetsRes.assets || []);
      setAlerts(alertsRes.alerts || []);
      setError(null);
      setSelectedAssetId((prev) => prev || assetsRes.assets?.sort((a, b) => a.healthScore - b.healthScore)[0]?.assetId);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchAll]);

  useEffect(() => {
    if (!selectedAssetId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await getAssetTrend(selectedAssetId);
        if (!cancelled) setAssetTrend(data);
      } catch (e) { /* ignore */ }
    };
    poll();
    const t = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [selectedAssetId]);

  const trendChart = useMemo(() => {
    if (!assetTrend) return null;
    return {
      labels: assetTrend.vibration.map((p) => new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
      datasets: [
        { label: 'Vibration (mm/s)', data: assetTrend.vibration.map((p) => p.value), borderColor: '#3b7de8', backgroundColor: 'rgba(59,125,232,0.1)', tension: 0.3, pointRadius: 0, borderWidth: 1.6, yAxisID: 'y' },
        { label: 'Temperature (°C)', data: assetTrend.temperature.map((p) => p.value), borderColor: '#f59e0b', backgroundColor: 'transparent', tension: 0.3, pointRadius: 0, borderWidth: 1.6, yAxisID: 'y1' },
      ],
    };
  }, [assetTrend]);

  const rulChart = useMemo(() => {
    if (!assets.length) return null;
    return {
      labels: assets.map((a) => a.assetId),
      datasets: [{
        label: 'Remaining Useful Life (days)',
        data: assets.map((a) => a.rulDays),
        backgroundColor: assets.map((a) => STATUS_COLOR[a.baselineStatus] || STATUS_COLOR.normal),
        borderRadius: 4,
      }],
    };
  }, [assets]);

  const selectedAsset = assets.find((a) => a.assetId === selectedAssetId);

  const worstAsset = useMemo(() => {
    if (!assets.length) return null;
    return [...assets].sort((a, b) => a.healthScore - b.healthScore)[0];
  }, [assets]);

  const kpiDetail = useMemo(() => ({
    downtimeAvoided: {
      label: 'Downtime Avoided',
      value: kpis ? `$${(kpis.downtimeAvoidedUsd / 1000).toFixed(0)}K` : '—',
      description: 'Estimated value of unplanned downtime avoided through early failure prediction and scheduled interventions.',
      insights: [
        `${kpis ? kpis.downtimeAvoidedDays : '—'} days of downtime avoided to date.`,
        'Savings are calculated against historical unplanned-failure cost baselines per asset type.',
      ],
    },
    assetHealthScore: {
      label: 'Asset Health Score',
      value: kpis ? `${kpis.assetHealthScoreAvg}/100` : '—',
      description: 'Fleet-average composite health score derived from vibration, temperature, and operating trend data.',
      insights: worstAsset ? [
        `${worstAsset.name} currently has the lowest health score at ${worstAsset.healthScore}/100.`,
        `Fleet average is ${kpis ? kpis.assetHealthScoreAvg : '—'}/100 across ${assets.length} assets.`,
      ] : [],
      chart: assets.length ? {
        type: 'bar', title: 'Health Score by Asset', xLabel: 'Asset', yLabel: 'Health Score (/100)',
        labels: assets.map((a) => a.assetId),
        data: assets.map((a) => a.healthScore),
        colors: assets.map((a) => STATUS_COLOR[a.baselineStatus] || STATUS_COLOR.normal),
      } : null,
    },
    remainingUsefulLife: {
      label: 'Remaining Useful Life',
      value: kpis ? kpis.remainingUsefulLifeDays : '—',
      unit: 'days',
      description: 'Shortest predicted remaining useful life across the fleet — identifies the most urgent asset for intervention.',
      insights: worstAsset ? [`${worstAsset.name} has the shortest RUL at ${worstAsset.rulDays} days.`] : [],
      chart: assets.length ? {
        type: 'bar', title: 'RUL Countdown by Asset', xLabel: 'Asset', yLabel: 'RUL (days)',
        labels: assets.map((a) => a.assetId),
        data: assets.map((a) => a.rulDays),
        colors: assets.map((a) => STATUS_COLOR[a.baselineStatus] || STATUS_COLOR.normal),
      } : null,
    },
    maintenanceCostPerAsset: {
      label: 'Maintenance Cost/Asset',
      value: kpis ? `$${kpis.maintenanceCostPerAssetUsd.toLocaleString()}` : '—',
      description: 'Average maintenance spend per asset, trending with fleet health and failure prediction accuracy.',
      insights: [`Average spend per asset is $${kpis ? kpis.maintenanceCostPerAssetUsd.toLocaleString() : '—'} this period.`],
    },
    predictionAccuracy: {
      label: 'Prediction Accuracy',
      value: kpis ? `${kpis.predictionAccuracyPct}%` : '—',
      description: 'Model accuracy comparing predicted asset issues against actual maintenance findings.',
      insights: [`Prediction model is currently running at ${kpis ? kpis.predictionAccuracyPct : '—'}% accuracy.`],
    },
    workOrderLeadTime: {
      label: 'Work Order Lead Time',
      value: kpis?.workOrderLeadTimeHours != null ? kpis.workOrderLeadTimeHours : '—',
      unit: 'hrs',
      description: 'Average time elapsed from a predictive alert being raised to the corresponding work order being resolved.',
      insights: [`Average lead time is ${kpis?.workOrderLeadTimeHours != null ? kpis.workOrderLeadTimeHours : '—'} hours from prediction to resolution.`],
    },
  }), [kpis, assets, worstAsset]);

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Predictive Maintenance</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Live vibration, temperature, and health monitoring across {assets.length || 6} rotating assets
          {error && <span className="text-red-400"> · connection error: {error}</span>}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <KPICard size="compact" label="Downtime Avoided" value={kpis ? `$${(kpis.downtimeAvoidedUsd / 1000).toFixed(0)}K` : '—'} icon={<IcoDollar />} rag="normal" subValues={kpis ? [{ label: 'DAYS', value: kpis.downtimeAvoidedDays }] : undefined} description="Value of unplanned downtime avoided via early prediction." onClick={() => setSelectedKpi('downtimeAvoided')} />
        <KPICard size="compact" label="Asset Health Score" value={kpis ? `${kpis.assetHealthScoreAvg}/100` : '—'} icon={<IcoCheck />} rag="normal" description="Fleet-average health score across all monitored assets." onClick={() => setSelectedKpi('assetHealthScore')} />
        <KPICard size="compact" label="Remaining Useful Life" value={kpis ? kpis.remainingUsefulLifeDays : '—'} unit="days" icon={<IcoHourglass />} rag={kpis && kpis.remainingUsefulLifeDays < 60 ? 'warning' : 'normal'} description="Shortest predicted RUL across the fleet — most urgent asset." onClick={() => setSelectedKpi('remainingUsefulLife')} />
        <KPICard size="compact" label="Maintenance Cost/Asset" value={kpis ? `$${kpis.maintenanceCostPerAssetUsd.toLocaleString()}` : '—'} icon={<IcoWrench />} rag="normal" description="Average maintenance spend per asset, trending with fleet health." onClick={() => setSelectedKpi('maintenanceCostPerAsset')} />
        <KPICard size="compact" label="Prediction Accuracy" value={kpis ? `${kpis.predictionAccuracyPct}%` : '—'} icon={<IcoClipboard />} rag="normal" description="Model accuracy for predicted vs. actual asset issues." onClick={() => setSelectedKpi('predictionAccuracy')} />
        <KPICard size="compact" label="Work Order Lead Time" value={kpis?.workOrderLeadTimeHours != null ? kpis.workOrderLeadTimeHours : '—'} unit="hrs" icon={<IcoClock />} rag="normal" description="Average time from prediction to work order resolution." onClick={() => setSelectedKpi('workOrderLeadTime')} />
      </div>

      {/* Active Alerts */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden" style={{ height: 320 }}>
        <AlertPanel alerts={alerts} onClose={() => {}} />
      </div>

      {/* Asset scorecards */}
      <div>
        <h3 className="text-sm font-bold text-white mb-2">Asset Health Scorecards</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {assets.map((a) => (
            <AssetScorecard key={a.assetId} asset={a} selected={a.assetId === selectedAssetId} onClick={() => setSelectedAssetId(a.assetId)} />
          ))}
        </div>
      </div>

      {/* Vibration/temp trend + RUL countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-1">Vibration & Temperature Trend</h3>
          <p className="text-[10px] text-slate-500 mb-2">{selectedAsset?.name || 'Select an asset'} — anomaly threshold: vibration &gt; 6 mm/s, temp &gt; 80°C</p>
          <div style={{ height: 200 }}>
            {trendChart && (
              <Line data={trendChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 9 }, boxWidth: 8, usePointStyle: true, padding: 6 } },
                  tooltip: chartTooltip(),
                },
                scales: {
                  x: { ...chartScales().x, title: { display: true, text: 'Time', color: '#94a3b8', font: { size: 9 } } },
                  y: { ...chartScales().y, position: 'left', title: { display: true, text: 'Vibration (mm/s)', color: '#94a3b8', font: { size: 9 } } },
                  y1: { ...chartScales().y, position: 'right', grid: { display: false }, title: { display: true, text: 'Temperature (°C)', color: '#94a3b8', font: { size: 9 } } },
                },
              }} />
            )}
          </div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">RUL Countdown by Asset</h3>
          <div style={{ height: 200 }}>
            {rulChart && (
              <Bar data={rulChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: chartTooltip() },
                scales: chartScales({
                  x: { title: { display: true, text: 'Asset ID', color: '#94a3b8', font: { size: 9 } } },
                  y: { title: { display: true, text: 'Remaining Useful Life (days)', color: '#94a3b8', font: { size: 9 } } },
                }),
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border">
          <h3 className="text-sm font-bold text-white">Asset Registry</h3>
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Asset ID</th>
              <th className="text-left px-3 py-2 font-bold">Type</th>
              <th className="text-right px-3 py-2 font-bold">Health Score</th>
              <th className="text-left px-3 py-2 font-bold">Last Maintenance</th>
              <th className="text-center px-3 py-2 font-bold">Baseline Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {assets.map((a) => (
              <tr key={a.assetId} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-mono text-slate-400">{a.assetId}</td>
                <td className="px-3 py-2 text-slate-200 font-medium">{a.type}</td>
                <td className="px-3 py-2 text-right text-slate-300">{a.healthScore}/100</td>
                <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{new Date(a.lastMaintenanceAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-center">
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ color: STATUS_COLOR[a.baselineStatus], background: `${STATUS_COLOR[a.baselineStatus]}22` }}>{a.baselineStatus}</span>
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
