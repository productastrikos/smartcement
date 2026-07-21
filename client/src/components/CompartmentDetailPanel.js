import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from './chartUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const STATUS_META = {
  normal:   { label: 'Normal',   color: '#10b981' },
  watch:    { label: 'Watch',    color: '#38bdf8' },
  warning:  { label: 'Warning',  color: '#f59e0b' },
  critical: { label: 'Critical', color: '#ef4444' },
};

export default function CompartmentDetailPanel({ compartment, emissionLimitMgNm3, onClose }) {
  if (!compartment) return null;
  const r = compartment.reading;
  const meta = STATUS_META[r.status] || STATUS_META.normal;
  const history = compartment.history || [];

  const chartData = {
    labels: history.map((h, i) => `${(history.length - i - 1) * 10}s ago`),
    datasets: [
      { label: 'Differential Pressure (mbar)', data: history.map((h) => h.differentialPressure_mbar), borderColor: '#3b7de8', backgroundColor: 'rgba(59,125,232,0.1)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 1.6, yAxisID: 'y' },
      { label: 'Emission (mg/Nm³)', data: history.map((h) => h.emission_mgNm3), borderColor: '#ec4899', backgroundColor: 'transparent', tension: 0.35, pointRadius: 0, borderWidth: 1.6, yAxisID: 'y1' },
    ],
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-app-border flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white">{compartment.label}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">{compartment.zone} · Compartment {compartment.id}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
          {r.bagBlindingEtaHours && (
            <span className="text-[10px] text-slate-400 ml-2">Predicted bag blinding in ~{r.bagBlindingEtaHours}h</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Differential Pressure</p>
            <p className="text-lg font-bold text-white mt-0.5">{r.differentialPressure_mbar.toFixed(1)} <span className="text-[11px] font-normal text-slate-400">mbar</span></p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Airflow</p>
            <p className="text-lg font-bold text-white mt-0.5">{Math.round(r.airflow_m3h)} <span className="text-[11px] font-normal text-slate-400">m³/h</span></p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Acoustic Index</p>
            <p className="text-lg font-bold text-white mt-0.5">{r.acousticIndex_pct.toFixed(1)}<span className="text-[11px] font-normal text-slate-400">%</span></p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Emission</p>
            <p className="text-lg font-bold text-white mt-0.5">{r.emission_mgNm3.toFixed(1)} <span className="text-[11px] font-normal text-slate-400">mg/Nm³</span></p>
            <p className="text-[9px] text-slate-500 mt-0.5">Limit {emissionLimitMgNm3} mg/Nm³</p>
          </div>
        </div>

        {history.length > 1 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Pressure & Emission Trend</p>
            <div style={{ height: 200 }}>
              <Line data={chartData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 9 }, boxWidth: 8, usePointStyle: true, padding: 6 } },
                  tooltip: chartTooltip(),
                },
                scales: {
                  ...chartScales(),
                  x: { ...chartScales().x, title: { display: true, text: 'Time', color: '#94a3b8', font: { size: 9 } } },
                  y: { ...chartScales().y, position: 'left', title: { display: true, text: 'Differential Pressure (mbar)', color: '#94a3b8', font: { size: 9 } } },
                  y1: { ...chartScales().y, position: 'right', grid: { display: false }, title: { display: true, text: 'Emission (mg/Nm³)', color: '#94a3b8', font: { size: 9 } } },
                },
              }} />
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Live readings for this compartment are recorded to the database on every simulation tick and drive the
          plant-wide KPIs, alerts, and advisories shown elsewhere in CemPulse.
        </p>
      </div>
    </div>
  );
}
