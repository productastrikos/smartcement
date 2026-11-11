import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from '../components/chartUtils';
import { getBagFilterStatus, getBagFilterKpis } from '../services/api';
import { getModuleBySlug } from '../services/cementKnowledge';
import KPICard, { IcoShield, IcoWind, IcoThermometer, IcoHourglass, IcoClock, IcoBarChart } from '../components/KPICard';
import ZoneFilterBar from '../components/ZoneFilterBar';
import AlertPanel from '../components/AlertPanel';
import KPIDetailPanel from '../components/KPIDetailPanel';
import CompartmentDetailPanel from '../components/CompartmentDetailPanel';
import { useData } from '../services/socket';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const STATUS_META = {
  normal:   { label: 'Normal',   color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.35)' },
  watch:    { label: 'Watch',    color: '#38bdf8', bg: 'rgba(56,189,248,0.10)', border: 'rgba(56,189,248,0.35)' },
  warning:  { label: 'Warning',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)' },
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.14)',  border: 'rgba(239,68,68,0.45)' },
};

const POLL_INTERVAL_MS = 10000;

function CompartmentTile({ compartment, onClick }) {
  const meta = STATUS_META[compartment.reading.status] || STATUS_META.normal;
  const r = compartment.reading;
  return (
    <button
      onClick={onClick}
      className="rounded-xl p-3 border transition-colors text-left hover:border-white/20 cursor-pointer w-full"
      style={{ background: meta.bg, borderColor: meta.border }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold text-white">{compartment.label}</span>
        <span
          className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ color: meta.color, background: 'rgba(255,255,255,0.06)' }}
        >
          {meta.label}
        </span>
      </div>
      <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">{compartment.zone}</p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        <div><span className="text-slate-500">DP </span><span className="text-slate-200 font-semibold">{r.differentialPressure_mbar.toFixed(1)} mbar</span></div>
        <div><span className="text-slate-500">Airflow </span><span className="text-slate-200 font-semibold">{Math.round(r.airflow_m3h)} m³/h</span></div>
        <div><span className="text-slate-500">Acoustic </span><span className="text-slate-200 font-semibold">{r.acousticIndex_pct.toFixed(1)}%</span></div>
        <div><span className="text-slate-500">Emission </span><span className="text-slate-200 font-semibold">{r.emission_mgNm3.toFixed(1)} mg/Nm³</span></div>
      </div>
      {r.bagBlindingEtaHours && (
        <div className="mt-2 text-[9px] font-semibold" style={{ color: meta.color }}>
          Predicted bag blinding in ~{r.bagBlindingEtaHours}h
        </div>
      )}
    </button>
  );
}

export default function BagFilterMonitoring() {
  const mod = getModuleBySlug('bag-filter-dust-monitoring');
  const { alerts, acknowledgeAlert } = useData();
  const [status, setStatus] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [zone, setZone] = useState('all');
  const [error, setError] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [selectedCompartmentId, setSelectedCompartmentId] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getBagFilterStatus();
      setStatus(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const fetchKpis = useCallback(async () => {
    try {
      const data = await getBagFilterKpis();
      setKpis(data);
    } catch (e) {
      // handled via `error` from status polling
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchKpis();
    const t1 = setInterval(fetchStatus, POLL_INTERVAL_MS);
    const t2 = setInterval(fetchKpis, POLL_INTERVAL_MS);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchStatus, fetchKpis]);

  const compartments = status?.compartments || [];
  const filtered = zone === 'all' ? compartments : compartments.filter((c) => c.zone === zone);

  const bagFilterAlerts = useMemo(
    () => (alerts || []).filter((a) => a.category === 'bag-filter'),
    [alerts]
  );

  const emissionTrend = useMemo(() => {
    if (!filtered.length) return null;
    const maxLen = Math.max(...filtered.map((c) => c.history.length), 1);
    const labels = Array.from({ length: maxLen }, (_, i) => `${(maxLen - i - 1) * 10}s ago`).reverse();
    const datasets = filtered.map((c, idx) => {
      const palette = ['#3b7de8', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#f472b6', '#a3e635'];
      const color = palette[idx % palette.length];
      const data = c.history.map((h) => h.emission_mgNm3);
      while (data.length < maxLen) data.unshift(null);
      return {
        label: c.id,
        data,
        borderColor: color,
        backgroundColor: 'transparent',
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 1.4,
      };
    });
    datasets.push({
      label: 'Regulatory Limit',
      data: Array.from({ length: maxLen }, () => status.emissionLimitMgNm3),
      borderColor: '#ef4444',
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    });
    return { labels, datasets };
  }, [filtered, status]);

  const leadTimeValue = kpis?.bagFailureLeadTime
    ? `${kpis.bagFailureLeadTime.minHours}–${kpis.bagFailureLeadTime.maxHours}h`
    : '48–96h';
  const mttrValue = (() => {
    if (kpis?.mttr?.hours == null || !kpis.mttr.sampleSize) return '—';
    const hours = kpis.mttr.hours;
    return hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`;
  })();
  const deviationCount = kpis?.pressureDeviation?.count ?? 0;
  const deviationTotal = kpis?.pressureDeviation?.totalCompartments ?? compartments.length;

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Bag Filter Dust Monitoring</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Live compartment-level pressure, airflow, acoustic, and emission telemetry across {compartments.length} baghouses
          {error && <span className="text-red-400"> · connection error: {error}</span>}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <KPICard
          size="compact"
          label="Filter Bag Life"
          value={kpis ? `+${kpis.filterBagLife.value.toFixed(1)}%` : '+24%'}
          icon={<IcoShield />}
          rag="normal"
          description="Bag lifespan gain from AI-guided cleaning cycles vs. the pre-deployment baseline."
          onClick={() => { setSelectedKpi('filterBagLife'); setSelectedCompartmentId(null); }}
        />
        <KPICard
          size="compact"
          label="Compressed Air Consumption"
          value={kpis ? `${kpis.compressedAir.value.toFixed(1)}%` : '-32%'}
          icon={<IcoWind />}
          rag="normal"
          description="Change in cleaning-cycle air use vs. baseline, from condition-based triggering."
          onClick={() => { setSelectedKpi('compressedAir'); setSelectedCompartmentId(null); }}
        />
        <KPICard
          size="compact"
          label="Particulate Emissions"
          value={kpis ? `${kpis.particulateEmissions.value.toFixed(1)}%` : '-28%'}
          icon={<IcoThermometer />}
          rag="normal"
          description="Particulate output change vs. baseline, tracked against the regulatory limit."
          onClick={() => { setSelectedKpi('particulateEmissions'); setSelectedCompartmentId(null); }}
        />
        <KPICard
          size="compact"
          label="Predicted Bag Failure Lead Time"
          value={leadTimeValue}
          icon={<IcoHourglass />}
          rag={kpis?.bagFailureLeadTime?.hasActive ? 'warning' : 'normal'}
          description="AI-predicted window before bag blinding, from live pressure and acoustic drift."
          onClick={() => { setSelectedKpi('bagFailureLeadTime'); setSelectedCompartmentId(null); }}
        />
        <KPICard
          size="compact"
          label="Mean Time to Repair (MTTR)"
          value={mttrValue}
          icon={<IcoClock />}
          rag="normal"
          description="Average time from alert raised to resolved, across recent bag filter alerts."
          subValues={kpis?.mttr ? [{ label: 'SAMPLE', value: kpis.mttr.sampleSize }] : undefined}
          onClick={() => { setSelectedKpi('mttr'); setSelectedCompartmentId(null); }}
        />
        <KPICard
          size="compact"
          label="Differential Pressure Deviation"
          value={`${deviationCount}/${deviationTotal}`}
          icon={<IcoBarChart />}
          rag={deviationCount > 2 ? 'critical' : deviationCount > 0 ? 'warning' : 'normal'}
          description="Live count of compartments reading outside the normal pressure band."
          onClick={() => { setSelectedKpi('pressureDeviation'); setSelectedCompartmentId(null); }}
        />
      </div>

      {/* Active Alerts */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden" style={{ height: 320 }}>
        <AlertPanel alerts={bagFilterAlerts} onClose={() => {}} onAcknowledge={acknowledgeAlert} />
      </div>

      <ZoneFilterBar value={zone} onChange={setZone} />

      {/* Compartment grid */}
      <div>
        <h3 className="text-sm font-bold text-white mb-2">Compartment Pressure Map</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((c) => (
            <CompartmentTile
              key={c.id}
              compartment={c}
              onClick={() => { setSelectedCompartmentId(c.id); setSelectedKpi(null); }}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-[11px] text-slate-500 py-8">Loading compartment telemetry…</div>
          )}
        </div>
      </div>

      {/* Emission trend */}
      <div className="bg-app-panel border border-app-border rounded-xl p-4">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-white">Emission Trend vs Regulatory Limit</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Dashed line = {status?.emissionLimitMgNm3 ?? 30} mg/Nm³ regulatory limit</p>
        </div>
        <div style={{ height: 220 }}>
          {emissionTrend && (
            <Line data={emissionTrend} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 9 }, boxWidth: 8, usePointStyle: true, padding: 6 } },
                tooltip: chartTooltip(),
              },
              scales: chartScales({
                x: { title: { display: true, text: 'Time', color: '#94a3b8', font: { size: 9 } } },
                y: { title: { display: true, text: 'Emission (mg/Nm³)', color: '#94a3b8', font: { size: 9 } } },
              }),
            }} />
          )}
        </div>
      </div>

      {mod && (
        <div className="bg-app-panel border border-app-border rounded-xl px-4 py-3 text-[11px] text-slate-400">
          {mod.bottomLine}
        </div>
      )}

      {/* KPI detail slide-in panel */}
      {selectedKpi && (
        <div
          className="w-[420px] max-w-full overflow-hidden animate-slide-up border-l border-app-border bg-app-darker"
          style={{ position: 'fixed', top: 'var(--app-header-h, 62px)', right: 0, bottom: 0, zIndex: 200 }}
        >
          <KPIDetailPanel kpiKey={selectedKpi} onClose={() => setSelectedKpi(null)} />
        </div>
      )}

      {/* Compartment detail slide-in panel */}
      {selectedCompartmentId && (
        <div
          className="w-[420px] max-w-full overflow-hidden animate-slide-up border-l border-app-border bg-app-darker"
          style={{ position: 'fixed', top: 'var(--app-header-h, 62px)', right: 0, bottom: 0, zIndex: 200 }}
        >
          <CompartmentDetailPanel
            compartment={compartments.find((c) => c.id === selectedCompartmentId)}
            emissionLimitMgNm3={status?.emissionLimitMgNm3 ?? 30}
            onClose={() => setSelectedCompartmentId(null)}
          />
        </div>
      )}
    </div>
  );
}
