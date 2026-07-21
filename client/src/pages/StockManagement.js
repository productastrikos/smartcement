import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from '../components/chartUtils';
import { getStockKpis, getStockMaterials, getStockAlerts, getStockTrend } from '../services/api';
import { getModuleBySlug } from '../services/cementKnowledge';
import KPICard, { IcoScale, IcoClock, IcoDollar, IcoSignal, IcoCalendar, IcoCheck } from '../components/KPICard';
import AlertPanel from '../components/AlertPanel';
import GenericKPIDetailPanel from '../components/GenericKPIDetailPanel';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const POLL_INTERVAL_MS = 10000;

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const HEIGHT_STOPS = [
  { t: 0.0, c: [30, 64, 175] },   // deep blue (base)
  { t: 0.45, c: [56, 189, 248] }, // sky blue (mid)
  { t: 0.75, c: [45, 212, 191] }, // teal (upper)
  { t: 1.0, c: [253, 224, 71] },  // amber (peak)
];

function heightColor(t) {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < HEIGHT_STOPS.length - 1; i++) {
    const a = HEIGHT_STOPS[i], b = HEIGHT_STOPS[i + 1];
    if (clamped >= a.t && clamped <= b.t) {
      const f = (clamped - a.t) / (b.t - a.t || 1);
      const c = a.c.map((v, idx) => Math.round(v + (b.c[idx] - v) * f));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return `rgb(${HEIGHT_STOPS[HEIGHT_STOPS.length - 1].c.join(',')})`;
}

function PointCloudViewer({ material }) {
  const realPeakHeightM = useMemo(() => (
    material ? Number((8 + ((material.physicalQtyTons % 5000) / 5000) * 10).toFixed(1)) : 0
  ), [material]);
  const realRadiusM = useMemo(() => (
    material ? Number((18 + ((material.physicalQtyTons % 3000) / 3000) * 14).toFixed(1)) : 0
  ), [material]);

  const points3d = useMemo(() => {
    if (!material) return [];
    const rnd = seededRandom(material.material.length * 97 + Math.round(material.physicalQtyTons));
    const peakHeight = 26 + (material.physicalQtyTons % 5000) / 5000 * 14;
    return Array.from({ length: 900 }, () => {
      const angle = rnd() * Math.PI * 2;
      const r = Math.pow(rnd(), 0.55) * 40;
      const noise = (rnd() - 0.5) * 3;
      const heightFrac = Math.max(0, 1 - r / 41);
      const y = heightFrac * peakHeight + noise * 0.4;
      const clampedFrac = Math.max(0, Math.min(1, y / peakHeight));
      return {
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        y,
        heightFrac: clampedFrac,
        elevationM: Number((clampedFrac * realPeakHeightM).toFixed(1)),
        radiusM: Number(((r / 41) * realRadiusM).toFixed(1)),
        angleDeg: Math.round(((angle * 180) / Math.PI + 360) % 360),
      };
    });
  }, [material, realPeakHeightM, realRadiusM]);

  const [rotation, setRotation] = useState(0.6);
  const [dragging, setDragging] = useState(false);
  const dragRef = React.useRef({ x: 0, rotation: 0 });
  const autoRotateRef = React.useRef(true);
  const containerRef = React.useRef(null);
  const [hover, setHover] = useState(null);

  const showHover = (e, p) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let left = e.clientX - rect.left + 12;
    let top = e.clientY - rect.top + 12;
    if (left > rect.width - 150) left = e.clientX - rect.left - 162;
    if (top > rect.height - 90) top = e.clientY - rect.top - 96;
    setHover({ left, top, ...p });
  };

  useEffect(() => {
    let raf;
    const tick = () => {
      if (autoRotateRef.current && !dragging) {
        setRotation((r) => r + 0.0032);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragging]);

  const onPointerDown = (e) => {
    setDragging(true);
    autoRotateRef.current = false;
    dragRef.current = { x: e.clientX, rotation };
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.x;
    setRotation(dragRef.current.rotation + dx * 0.012);
  };
  const onPointerUp = () => {
    setDragging(false);
    setTimeout(() => { autoRotateRef.current = true; }, 3500);
  };

  const projected = useMemo(() => {
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const elevCos = Math.cos(0.55), elevSin = Math.sin(0.55);
    return points3d
      .map((p) => {
        const rx = p.x * cos - p.z * sin;
        const rz = p.x * sin + p.z * cos;
        const projY = -p.y * elevCos - rz * elevSin;
        const depth = rz * elevCos - p.y * elevSin;
        return {
          sx: 50 + rx * 0.92,
          sy: 78 + projY * 0.92,
          depth,
          heightFrac: p.heightFrac,
          elevationM: p.elevationM,
          radiusM: p.radiusM,
          angleDeg: p.angleDeg,
        };
      })
      .sort((a, b) => a.depth - b.depth);
  }, [points3d, rotation]);

  return (
    <div className="bg-app-panel border border-app-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-white">3D Point Cloud Viewer</h3>
        <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 border border-slate-600/40">
          Simulated stand-in
        </span>
      </div>
      <p className="text-[10px] text-slate-500 mb-3">
        Drag to rotate — placeholder for a future drone/LiDAR-generated point cloud of the {material?.material} stockpile, colored by pile height.
      </p>
      <div ref={containerRef} className="relative">
        <svg
          viewBox="0 0 100 90"
          className="w-full touch-none select-none"
          style={{ maxHeight: 260, cursor: dragging ? 'grabbing' : 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <defs>
            <radialGradient id="pcvFloor" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(56,189,248,0.10)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0)" />
            </radialGradient>
          </defs>
          <ellipse cx="50" cy="79" rx="42" ry="8" fill="url(#pcvFloor)" />
          <ellipse cx="50" cy="79" rx="42" ry="8" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="0.4" />
          {projected.map((p, i) => (
            <circle
              key={i}
              cx={p.sx}
              cy={p.sy}
              r={(hover?.i === i ? 1.3 : 0.55) + p.heightFrac * 0.35}
              fill={heightColor(p.heightFrac)}
              opacity={0.55 + p.heightFrac * 0.4}
              stroke={hover?.i === i ? '#ffffff' : 'none'}
              strokeWidth={hover?.i === i ? 0.4 : 0}
              onMouseEnter={(e) => showHover(e, { i, heightFrac: p.heightFrac, elevationM: p.elevationM, radiusM: p.radiusM, angleDeg: p.angleDeg })}
              onMouseMove={(e) => showHover(e, { i, heightFrac: p.heightFrac, elevationM: p.elevationM, radiusM: p.radiusM, angleDeg: p.angleDeg })}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        {hover && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-900/95 border border-slate-600/60 rounded-lg px-2.5 py-2 shadow-xl text-[10px] leading-relaxed"
            style={{ left: hover.left, top: hover.top, minWidth: 140 }}
          >
            <p className="text-white font-bold mb-0.5">{material?.material} scan point</p>
            <p className="text-slate-300">Elevation: <span className="font-mono text-sky-300">{hover.elevationM}m</span> <span className="text-slate-500">({Math.round(hover.heightFrac * 100)}% of pile)</span></p>
            <p className="text-slate-300">Distance from center: <span className="font-mono text-sky-300">{hover.radiusM}m</span></p>
            <p className="text-slate-300">Bearing: <span className="font-mono text-sky-300">{hover.angleDeg}°</span></p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-1 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-500">Height</span>
          <div className="w-24 h-1.5 rounded-full" style={{ background: 'linear-gradient(90deg, rgb(30,64,175), rgb(56,189,248), rgb(45,212,191), rgb(253,224,71))' }} />
          <span className="text-[9px] text-slate-500">Peak</span>
        </div>
        <span className="text-[9px] text-slate-500 font-mono">{points3d.length.toLocaleString()} pts · {material?.physicalQtyTons?.toLocaleString()}t</span>
      </div>
    </div>
  );
}

export default function StockManagement() {
  const mod = getModuleBySlug('3d-stock-management');
  const [kpis, setKpis] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trend, setTrend] = useState(null);
  const [error, setError] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [kpisRes, materialsRes, alertsRes, trendRes] = await Promise.all([
        getStockKpis(), getStockMaterials(), getStockAlerts(), getStockTrend(),
      ]);
      setKpis(kpisRes);
      setMaterials(materialsRes.materials || []);
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

  const tonnageChart = useMemo(() => {
    if (!materials.length) return null;
    return {
      labels: materials.map((m) => m.material),
      datasets: [{ label: 'Physical Tonnage', data: materials.map((m) => m.physicalQtyTons), backgroundColor: '#3b7de8', borderRadius: 4 }],
    };
  }, [materials]);

  const trendChart = useMemo(() => {
    if (!trend) return null;
    return {
      labels: trend.map((d) => d.date.slice(5)),
      datasets: [
        { label: 'Intake', data: trend.map((d) => d.intake), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 1.6 },
        { label: 'Consumption', data: trend.map((d) => d.consumption), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 1.6 },
      ],
    };
  }, [trend]);

  const highestVarianceMaterial = useMemo(() => {
    if (!materials.length) return null;
    return [...materials].sort((a, b) => Math.abs(b.varianceTons) - Math.abs(a.varianceTons))[0];
  }, [materials]);

  const kpiDetail = useMemo(() => ({
    measurementAccuracy: {
      label: 'Measurement Accuracy',
      value: kpis ? `${kpis.measurementAccuracyPct}%` : '—',
      description: 'Combined drone + ground LiDAR volumetric accuracy vs. manual survey, averaged across all stockpiles.',
      insights: [
        `Current accuracy is ${kpis ? kpis.measurementAccuracyPct : '—'}%, ${kpis && kpis.measurementAccuracyPct >= 98 ? 'within' : 'below'} the sub-1% variance target.`,
        `${materials.length} materials are being tracked with automated scans this cycle.`,
      ],
    },
    surveyCycleTime: {
      label: 'Survey Cycle Time',
      value: kpis ? kpis.surveyCycleTimeMin : '—',
      unit: 'min',
      description: 'Time required to complete a full stockyard survey, from drone flight/scan to reconciled report.',
      insights: [
        `Latest full survey cycle took ${kpis ? kpis.surveyCycleTimeMin : '—'} minutes, down from multi-hour manual surveys.`,
        'Automated flights are scheduled to run outside peak loading windows to avoid airspace conflicts.',
      ],
    },
    bookVsPhysicalVariance: {
      label: 'Book vs. Physical Variance',
      value: kpis ? `$${kpis.bookVsPhysicalVarianceUsd.toLocaleString()}` : '—',
      description: 'Total dollar variance between ERP book inventory and physically measured stockpile quantities.',
      insights: highestVarianceMaterial ? [
        `${highestVarianceMaterial.material} shows the largest variance at ${highestVarianceMaterial.varianceTons > 0 ? '+' : ''}${highestVarianceMaterial.varianceTons.toLocaleString()}t ($${highestVarianceMaterial.varianceUsd.toLocaleString()}).`,
        `Total variance across all materials is ${kpis ? `$${kpis.bookVsPhysicalVarianceUsd.toLocaleString()}` : '—'}.`,
      ] : [],
      chart: materials.length ? {
        type: 'bar', title: 'Variance by Material ($)', xLabel: 'Material', yLabel: 'Variance (USD)',
        labels: materials.map((m) => m.material),
        data: materials.map((m) => m.varianceUsd),
        color: '#f59e0b',
      } : null,
    },
    flightsPerMonth: {
      label: 'Flights/Scans per Month',
      value: kpis ? kpis.flightsPerMonth : '—',
      description: 'Number of drone flights or fixed-scanner passes completed monthly across the stockyard.',
      insights: [
        `${kpis ? kpis.flightsPerMonth : '—'} automated flights/scans completed this month, replacing manual tape-and-clipboard surveys.`,
      ],
    },
    daysOfStockCover: {
      label: 'Days of Stock Cover',
      value: kpis ? kpis.daysOfStockCover : '—',
      unit: 'days',
      description: 'Physical stock currently on hand divided by recent average daily consumption, per material.',
      insights: [
        `Current cover is ${kpis ? kpis.daysOfStockCover : '—'} days at present consumption rates.`,
        'Procurement should be triggered before cover drops below the safety threshold to avoid production disruption.',
      ],
      chart: materials.length ? {
        type: 'bar', title: 'Physical Tonnage by Material', xLabel: 'Material', yLabel: 'Tonnage (tons)',
        labels: materials.map((m) => m.material),
        data: materials.map((m) => m.physicalQtyTons),
        color: '#3b7de8',
      } : null,
    },
    densityCalibrationAccuracy: {
      label: 'Density Calibration Accuracy',
      value: kpis ? `${kpis.densityCalibrationAccuracyPct}%` : '—',
      description: 'Accuracy of per-material bulk-density assumptions used to convert volumetric scans into tonnage.',
      insights: [
        `Density calibration is currently at ${kpis ? kpis.densityCalibrationAccuracyPct : '—'}% accuracy.`,
        'Periodic re-calibration against weighbridge data keeps volumetric-to-tonnage conversion errors low.',
      ],
    },
  }), [kpis, materials, highestVarianceMaterial]);

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">3D Stock Management</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Drone/LiDAR stockpile tracking across {materials.length || 5} materials
          {error && <span className="text-red-400"> · connection error: {error}</span>}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <KPICard size="compact" label="Measurement Accuracy" value={kpis ? `${kpis.measurementAccuracyPct}%` : '—'} icon={<IcoCheck />} rag="normal" description="Combined drone + ground LiDAR accuracy vs. manual survey." onClick={() => setSelectedKpi('measurementAccuracy')} />
        <KPICard size="compact" label="Survey Cycle Time" value={kpis ? kpis.surveyCycleTimeMin : '—'} unit="min" icon={<IcoClock />} rag="normal" description="Time for a full stockyard survey, drone flight to report." onClick={() => setSelectedKpi('surveyCycleTime')} />
        <KPICard size="compact" label="Book vs. Physical Variance" value={kpis ? `$${kpis.bookVsPhysicalVarianceUsd.toLocaleString()}` : '—'} icon={<IcoDollar />} rag={kpis && Math.abs(kpis.bookVsPhysicalVarianceUsd) > 5000 ? 'warning' : 'normal'} description="Total dollar variance between book and physical inventory." onClick={() => setSelectedKpi('bookVsPhysicalVariance')} />
        <KPICard size="compact" label="Flights/Scans per Month" value={kpis ? kpis.flightsPerMonth : '—'} icon={<IcoSignal />} rag="normal" description="Drone flights or fixed-scanner passes completed monthly." onClick={() => setSelectedKpi('flightsPerMonth')} />
        <KPICard size="compact" label="Days of Stock Cover" value={kpis ? kpis.daysOfStockCover : '—'} unit="days" icon={<IcoCalendar />} rag="normal" description="Physical stock on hand vs. recent average daily consumption." onClick={() => setSelectedKpi('daysOfStockCover')} />
        <KPICard size="compact" label="Density Calibration Accuracy" value={kpis ? `${kpis.densityCalibrationAccuracyPct}%` : '—'} icon={<IcoScale />} rag="normal" description="Accuracy of per-material density assumptions used for tonnage." onClick={() => setSelectedKpi('densityCalibrationAccuracy')} />
      </div>

      {/* Active Alerts */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden" style={{ height: 320 }}>
        <AlertPanel alerts={alerts} onClose={() => {}} />
      </div>

      {/* Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Volume/Tonnage by Material</h3>
          <div style={{ height: 220 }}>
            {tonnageChart && (
              <Bar data={tonnageChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: chartTooltip() },
                scales: chartScales({
                  x: { title: { display: true, text: 'Material Type', color: '#94a3b8', font: { size: 9 } } },
                  y: { title: { display: true, text: 'Tonnage (tons)', color: '#94a3b8', font: { size: 9 } } },
                }),
              }} />
            )}
          </div>
        </div>
        <div className="bg-app-panel border border-app-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3">Intake vs. Consumption (14d)</h3>
          <div style={{ height: 220 }}>
            {trendChart && (
              <Line data={trendChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 9 }, boxWidth: 8, usePointStyle: true, padding: 6 } },
                  tooltip: chartTooltip(),
                },
                scales: chartScales({
                  x: { title: { display: true, text: 'Date', color: '#94a3b8', font: { size: 9 } } },
                  y: { title: { display: true, text: 'Quantity (tons)', color: '#94a3b8', font: { size: 9 } } },
                }),
              }} />
            )}
          </div>
        </div>
      </div>

      {highestVarianceMaterial && <PointCloudViewer material={highestVarianceMaterial} />}

      {/* Materials table */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border">
          <h3 className="text-sm font-bold text-white">Material Reconciliation</h3>
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Material</th>
              <th className="text-right px-3 py-2 font-bold">Book Qty</th>
              <th className="text-right px-3 py-2 font-bold">Physical Qty</th>
              <th className="text-right px-3 py-2 font-bold">Variance</th>
              <th className="text-left px-3 py-2 font-bold">Last Scan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {materials.map((m) => (
              <tr key={m.materialId} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-slate-200 font-medium">{m.material}</td>
                <td className="px-3 py-2 text-right text-slate-300">{m.bookQtyTons.toLocaleString()}t</td>
                <td className="px-3 py-2 text-right text-slate-300">{m.physicalQtyTons.toLocaleString()}t</td>
                <td className={`px-3 py-2 text-right font-semibold ${Math.abs(m.varianceTons) > 100 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {m.varianceTons > 0 ? '+' : ''}{m.varianceTons.toLocaleString()}t
                </td>
                <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{new Date(m.lastScanAt).toLocaleString()}</td>
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
