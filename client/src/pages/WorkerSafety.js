import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { chartTooltip, chartScales } from '../components/chartUtils';
import { acknowledgeAlert, getSafetyKpis, getSafetyZones, getSafetyAlerts, getSafetyIncidentTrend } from '../services/api';
import { getModuleBySlug } from '../services/cementKnowledge';
import KPICard, { IcoShield, IcoAlert, IcoClock, IcoSignal, IcoAttendance, IcoGlobe } from '../components/KPICard';
import GenericKPIDetailPanel from '../components/GenericKPIDetailPanel';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const POLL_INTERVAL_MS = 10000;

const STATUS_META = {
  normal: { color: '#10b981', label: 'Normal' },
  warning: { color: '#f59e0b', label: 'Warning' },
  critical: { color: '#ef4444', label: 'Critical' },
};

const INCIDENT_LABELS = {
  ppe_violation: 'PPE violation',
  restricted_zone_breach: 'Restricted zone breach',
  proximity_alert: 'Proximity alert',
};

// Stock footage stand-ins for each zone's camera feed (Pexels — free license, no attribution required).
const ZONE_FOOTAGE = {
  'kiln area': 'https://videos.pexels.com/video-files/32268399/13762621_2560_1440_24fps.mp4',
  'raw mill': 'https://videos.pexels.com/video-files/30836675/13186853_1920_1080_60fps.mp4',
  'packing': 'https://videos.pexels.com/video-files/34572324/14649299_3840_2160_30fps.mp4',
  'loading bay': 'https://videos.pexels.com/video-files/35223023/14922491_1920_1080_25fps.mp4',
  'conveyor belt': 'https://videos.pexels.com/video-files/30911632/13223374_2560_1440_30fps.mp4',
  'clinker silo': 'https://videos.pexels.com/video-files/24800209/11896784_2560_1440_60fps.mp4',
};
const FOOTAGE_FALLBACK = 'https://videos.pexels.com/video-files/34289834/14526894_1920_1080_25fps.mp4';

function footageFor(zoneName) {
  return ZONE_FOOTAGE[(zoneName || '').toLowerCase()] || FOOTAGE_FALLBACK;
}

function CameraThumbnail({ online, status }) {
  const color = !online ? '#64748b' : (STATUS_META[status] || STATUS_META.normal).color;
  return (
    <div
      className="rounded-md flex items-center justify-center shrink-0"
      style={{ width: 44, height: 32, background: `${color}1a`, border: `1px solid ${color}55` }}
    >
      <svg className="w-4 h-4" fill="none" stroke={color} viewBox="0 0 24 24">
        {online ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 3l18 18M10.5 6h2.5a2 2 0 012 2v.5M5 8v8a2 2 0 002 2h8" />
        )}
      </svg>
    </div>
  );
}

function ZoneCard({ zone }) {
  const meta = STATUS_META[zone.status] || STATUS_META.normal;
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = zone.cameraOnline && !videoFailed;
  return (
    <div className="rounded-lg overflow-hidden border" style={{ borderColor: `${meta.color}44` }}>
      <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
        {showVideo ? (
          <video
            key={zone.zoneId}
            className="w-full h-full object-cover"
            src={footageFor(zone.zone)}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setVideoFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-slate-900">
            <CameraThumbnail online={false} status={zone.status} />
            {zone.cameraOnline && videoFailed && (
              <span className="text-[9px] text-slate-500">Feed preview unavailable</span>
            )}
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 py-1.5" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.7), transparent)' }}>
          <span className="text-[9px] font-mono text-white/90">{zone.cameraId}</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 4px ${meta.color}` }} />
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/90">{zone.cameraOnline ? 'live' : 'offline'}</span>
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-2 py-1.5" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.75), transparent)' }}>
          <p className="text-[11px] font-bold text-white leading-tight truncate">{zone.zone}</p>
        </div>
      </div>
      <div className="flex items-center justify-between px-2.5 py-1.5" style={{ background: `${meta.color}0f` }}>
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
        <span className="text-[10px] text-slate-400">PPE {zone.ppeCompliancePct}%</span>
      </div>
    </div>
  );
}

export default function WorkerSafety() {
  const mod = getModuleBySlug('worker-safety-computer-vision');
  const [kpis, setKpis] = useState(null);
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trend, setTrend] = useState(null);
  const [error, setError] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [kpisRes, zonesRes, alertsRes, trendRes] = await Promise.all([
        getSafetyKpis(), getSafetyZones(), getSafetyAlerts(), getSafetyIncidentTrend(),
      ]);
      setKpis(kpisRes);
      setZones(zonesRes.zones || []);
      setAlerts(alertsRes.alerts || []);
      setTrend(trendRes.trend || []);
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

  const [ackIds, setAckIds] = useState(() => new Set());
  const [toast, setToast] = useState(null);

  const handleAck = async (alertId) => {
    setAckIds((prev) => new Set(prev).add(alertId));
    setToast('Acknowledged');
    setTimeout(() => setToast(null), 2200);
    try { await acknowledgeAlert(alertId); fetchAll(); } catch (e) { /* ignore */ }
  };

  const unresolvedIncidents = useMemo(() => alerts.filter((a) => !a.acknowledged && !ackIds.has(a.alertId)), [alerts, ackIds]);

  const trendChart = useMemo(() => {
    if (!trend) return null;
    return {
      labels: trend.map((d) => d.week),
      datasets: [{ label: 'Incidents', data: trend.map((d) => d.count), backgroundColor: '#ef4444', borderRadius: 4 }],
    };
  }, [trend]);

  const ppeByZoneChart = useMemo(() => {
    if (!zones.length) return null;
    return {
      labels: zones.map((z) => z.zone),
      datasets: [{ label: 'PPE Compliance (%)', data: zones.map((z) => z.ppeCompliancePct), backgroundColor: zones.map((z) => (STATUS_META[z.status] || STATUS_META.normal).color), borderRadius: 4 }],
    };
  }, [zones]);

  const kpiDetail = useMemo(() => ({
    ppeComplianceRate: {
      label: 'PPE Compliance Rate',
      value: kpis ? `${kpis.ppeComplianceRatePct}%` : '—',
      description: 'Fleet-average PPE (hard hat, vest, gloves) compliance across all AI camera-monitored zones.',
      insights: [`Overall compliance is ${kpis ? kpis.ppeComplianceRatePct : '—'}% across ${zones.length} zones.`],
      chart: ppeByZoneChart ? {
        type: 'bar', title: 'PPE Compliance by Zone', xLabel: 'Zone', yLabel: 'Compliance Rate (%)',
        labels: ppeByZoneChart.labels,
        data: ppeByZoneChart.datasets[0].data,
        colors: ppeByZoneChart.datasets[0].backgroundColor,
      } : null,
    },
    restrictedZoneBreaches: {
      label: 'Restricted Zone Breaches',
      value: kpis ? kpis.restrictedZoneBreachCount : '—',
      description: 'Number of restricted-zone breach events detected by AI cameras in the last 24 hours.',
      insights: [`${kpis ? kpis.restrictedZoneBreachCount : '—'} breaches recorded in the last 24 hours.`],
    },
    incidentResponseTime: {
      label: 'Incident Response Time',
      value: kpis ? kpis.incidentResponseTimeSec : '—',
      unit: 'sec',
      description: 'Average time from an incident being detected by computer vision to a supervisor being alerted.',
      insights: [`Average response time is ${kpis ? kpis.incidentResponseTimeSec : '—'} seconds.`],
      chart: trendChart ? {
        type: 'bar', title: 'Incident Count Trend (8 weeks)', xLabel: 'Week', yLabel: 'Incident Count',
        labels: trendChart.labels,
        data: trendChart.datasets[0].data,
        color: '#ef4444',
      } : null,
    },
    cameraUptime: {
      label: 'Camera Uptime',
      value: kpis ? `${kpis.cameraUptimePct}%` : '—',
      description: 'Share of AI cameras currently online and streaming across all monitored zones.',
      insights: [`Camera fleet uptime is ${kpis ? kpis.cameraUptimePct : '—'}%.`, `${zones.filter((z) => !z.cameraOnline).length} camera(s) currently offline.`],
    },
    falseAlarmRate: {
      label: 'False Alarm Rate',
      value: kpis ? `${kpis.falseAlarmRatePct}%` : '—',
      description: 'Share of flagged incidents later confirmed by review as false alarms.',
      insights: [`False alarm rate is ${kpis ? kpis.falseAlarmRatePct : '—'}% of flagged incidents.`],
    },
    activeZonesMonitored: {
      label: 'Active Zones Monitored',
      value: kpis ? kpis.activeZonesMonitored : '—',
      description: 'Number of plant zones currently under continuous AI camera coverage.',
      insights: [`${kpis ? kpis.activeZonesMonitored : '—'} zones under continuous coverage.`],
    },
  }), [kpis, zones, ppeByZoneChart, trendChart]);

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Worker Safety and Computer Vision</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Live AI camera monitoring across {zones.length || 6} zones
          {error && <span className="text-red-400"> · connection error: {error}</span>}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <KPICard size="compact" label="PPE Compliance Rate" value={kpis ? `${kpis.ppeComplianceRatePct}%` : '—'} icon={<IcoShield />} rag="normal" description="Fleet-average PPE compliance across all monitored zones." onClick={() => setSelectedKpi('ppeComplianceRate')} />
        <KPICard size="compact" label="Restricted Zone Breaches" value={kpis ? kpis.restrictedZoneBreachCount : '—'} icon={<IcoAlert />} rag={kpis && kpis.restrictedZoneBreachCount > 0 ? 'warning' : 'normal'} description="Breach count in the last 24 hours." onClick={() => setSelectedKpi('restrictedZoneBreaches')} />
        <KPICard size="compact" label="Incident Response Time" value={kpis ? kpis.incidentResponseTimeSec : '—'} unit="sec" icon={<IcoClock />} rag="normal" description="Average time from incident detected to supervisor alerted." onClick={() => setSelectedKpi('incidentResponseTime')} />
        <KPICard size="compact" label="Camera Uptime" value={kpis ? `${kpis.cameraUptimePct}%` : '—'} icon={<IcoSignal />} rag={kpis && kpis.cameraUptimePct < 90 ? 'warning' : 'normal'} description="Share of cameras currently online across all zones." onClick={() => setSelectedKpi('cameraUptime')} />
        <KPICard size="compact" label="False Alarm Rate" value={kpis ? `${kpis.falseAlarmRatePct}%` : '—'} icon={<IcoGlobe />} rag="normal" description="Share of flagged incidents later confirmed as false alarms." onClick={() => setSelectedKpi('falseAlarmRate')} />
        <KPICard size="compact" label="Active Zones Monitored" value={kpis ? kpis.activeZonesMonitored : '—'} icon={<IcoAttendance />} rag="normal" description="Number of zones under continuous AI camera coverage." onClick={() => setSelectedKpi('activeZonesMonitored')} />
      </div>

      {/* Real-time incident feed */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden relative">
        {toast && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 animate-slide-up">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        )}
        <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Real-Time Incident Feed</h3>
          <span className="text-[10px] text-slate-500">{unresolvedIncidents.length} active</span>
        </div>
        <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
          {unresolvedIncidents.length === 0 && (
            <div className="text-center py-8 text-[11px] text-slate-500">No active incidents</div>
          )}
          {unresolvedIncidents.map((a) => {
            const meta = a.type === 'critical' ? STATUS_META.critical : STATUS_META.warning;
            return (
              <div key={a.alertId} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: `${meta.color}0f`, border: `1px solid ${meta.color}33` }}>
                <CameraThumbnail online status={a.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>{a.zone}</span>
                    <span className="text-[9px] text-slate-500">{a.assetId}</span>
                  </div>
                  <p className="text-[12px] text-slate-200 font-medium leading-snug mt-0.5">{a.title}</p>
                </div>
                <button onClick={() => handleAck(a.alertId)} className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 shrink-0">Acknowledge</button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live zone status map */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white">Live Zone Status Map</h3>
          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 border border-slate-600/40">
            Simulated feed · stock footage stand-in
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {zones.map((z) => <ZoneCard key={z.zoneId} zone={z} />)}
        </div>
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Incident Count Trend (8 weeks)</h3>
          <div style={{ height: 200 }}>
            {trendChart && (
              <Bar data={trendChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: chartTooltip() },
                scales: chartScales({
                  x: { title: { display: true, text: 'Week', color: '#94a3b8', font: { size: 9 } } },
                  y: { title: { display: true, text: 'Incident Count', color: '#94a3b8', font: { size: 9 } }, ticks: { precision: 0 } },
                }),
              }} />
            )}
          </div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">PPE Compliance by Zone</h3>
          <div style={{ height: 200 }}>
            {ppeByZoneChart && (
              <Bar data={ppeByZoneChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: chartTooltip() },
                scales: chartScales({
                  x: { title: { display: true, text: 'Zone', color: '#94a3b8', font: { size: 9 } } },
                  y: { title: { display: true, text: 'Compliance Rate (%)', color: '#94a3b8', font: { size: 9 } } },
                }),
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border">
          <h3 className="text-sm font-bold text-white">Incident Log</h3>
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Timestamp</th>
              <th className="text-left px-3 py-2 font-bold">Zone</th>
              <th className="text-left px-3 py-2 font-bold">Incident Type</th>
              <th className="text-left px-3 py-2 font-bold">Camera ID</th>
              <th className="text-center px-3 py-2 font-bold">Status</th>
              <th className="text-center px-3 py-2 font-bold">Video</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {alerts.map((a) => (
              <tr key={a.alertId} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{new Date(a.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-slate-200 font-medium">{a.zone}</td>
                <td className="px-3 py-2 text-slate-300">{INCIDENT_LABELS[a.subtype] || a.subtype || '—'}</td>
                <td className="px-3 py-2 font-mono text-slate-400">{a.assetId}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.acknowledged ? 'text-emerald-400 bg-emerald-500/15' : 'text-amber-400 bg-amber-500/15'}`}>{a.acknowledged ? 'resolved' : 'open'}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-[10px] text-sky-400 underline underline-offset-2 cursor-not-allowed" title="Simulated — no real camera feed connected">snapshot (sim)</span>
                </td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No incidents logged yet</td></tr>
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
