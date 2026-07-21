import React, { useEffect, useMemo, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from './chartUtils';
import { getBagFilterKpis } from '../services/api';
import { BAG_FILTER_KPI_META } from '../services/bagFilterKpiMeta';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const STATUS_COLOR = { normal: '#10b981', watch: '#38bdf8', warning: '#f59e0b', critical: '#ef4444' };

function buildChart(kpiKey, data, meta) {
  if (data.series) {
    return {
      type: 'line',
      xLabel: 'Date',
      yLabel: meta.axisLabel,
      xTicks: { maxTicksLimit: 7, maxRotation: 0, autoSkip: true },
      chartData: {
        labels: data.series.map((p) => p.t.slice(0, 10)),
        datasets: [{
          label: meta.label,
          data: data.series.map((p) => p.value),
          borderColor: '#3b7de8',
          backgroundColor: 'rgba(59,125,232,0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          borderWidth: 1.6,
          spanGaps: true,
        }],
      },
    };
  }

  if (kpiKey === 'bagFailureLeadTime') {
    return {
      type: 'bar',
      xLabel: 'Compartment',
      yLabel: meta.axisLabel,
      chartData: {
        labels: data.activePredictions.map((p) => p.id),
        datasets: [{ label: 'Predicted lead time (h)', data: data.activePredictions.map((p) => p.etaHours), backgroundColor: '#8b5cf6', borderRadius: 4 }],
      },
    };
  }

  if (kpiKey === 'mttr') {
    return {
      type: 'bar',
      xLabel: 'Alert',
      yLabel: meta.axisLabel,
      chartData: {
        labels: data.recent.map((r) => r.zone),
        datasets: [{ label: 'Resolution time (h)', data: data.recent.map((r) => r.durationHours), backgroundColor: '#10b981', borderRadius: 4 }],
      },
    };
  }

  if (kpiKey === 'pressureDeviation') {
    return {
      type: 'bar',
      xLabel: 'Compartment',
      yLabel: meta.axisLabel,
      chartData: {
        labels: data.compartments.map((c) => c.id),
        datasets: [{
          label: 'Differential pressure (mbar)',
          data: data.compartments.map((c) => c.differentialPressure),
          backgroundColor: data.compartments.map((c) => STATUS_COLOR[c.status] || STATUS_COLOR.normal),
          borderRadius: 4,
        }],
      },
    };
  }

  return null;
}

export default function KPIDetailPanel({ kpiKey, onClose }) {
  const [kpis, setKpis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getBagFilterKpis()
      .then((res) => { if (!cancelled) setKpis(res); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [kpiKey]);

  const meta = BAG_FILTER_KPI_META[kpiKey];
  const data = kpis?.[kpiKey];

  const chart = useMemo(() => (data && meta ? buildChart(kpiKey, data, meta) : null), [data, meta, kpiKey]);

  if (!meta) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-app-border flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white">{meta.label}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Live KPI detail</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && <div className="text-[11px] text-red-400">Failed to load: {error}</div>}
        {!data && !error && <div className="text-[11px] text-slate-500">Loading…</div>}

        {data && (
          <>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Description</p>
              <p className="text-[12px] text-slate-300 leading-relaxed">{meta.description}</p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 mb-1">Trend Summary</p>
              <p className="text-[12px] text-slate-200 leading-snug">{meta.getTrendSummary(data)}</p>
            </div>

            {chart && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Historical Trend</p>
                <div style={{ height: 200 }}>
                  {chart.chartData.labels.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center px-4">
                      <p className="text-[11px] text-slate-500">No data to plot right now — this updates automatically as new readings come in.</p>
                    </div>
                  ) : chart.type === 'line' ? (
                    <Line
                      data={chart.chartData}
                      options={{
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: chartTooltip() },
                        scales: chartScales({
                          x: { title: { display: true, text: chart.xLabel, color: '#94a3b8', font: { size: 9 } }, ticks: { color: '#94a3b8', font: { size: 9 }, ...(chart.xTicks || {}) } },
                          y: { title: { display: true, text: chart.yLabel, color: '#94a3b8', font: { size: 9 } } },
                        }),
                      }}
                    />
                  ) : (
                    <Bar
                      data={chart.chartData}
                      options={{
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: chartTooltip() },
                        scales: chartScales({
                          x: { title: { display: true, text: chart.xLabel, color: '#94a3b8', font: { size: 9 } } },
                          y: { title: { display: true, text: chart.yLabel, color: '#94a3b8', font: { size: 9 } } },
                        }),
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1.5">Operational Insights</p>
              <div className="space-y-1.5">
                {meta.getInsights(data).map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <p className="text-[12px] text-slate-300 leading-snug">{line}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-1.5">AI Forecast & Plan</p>
              <div className="space-y-1.5">
                {meta.getForecast(data).map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <p className="text-[12px] text-slate-300 leading-snug">{line}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
