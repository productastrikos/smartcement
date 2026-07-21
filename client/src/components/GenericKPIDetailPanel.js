import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { chartTooltip, chartScales } from './chartUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

/**
 * Reusable "View Details" side panel for any module's KPI cards.
 *
 * Props:
 *   label        — KPI name
 *   value        — current formatted value (string/number)
 *   unit         — optional unit string
 *   description  — 1-2 sentence explanation of what the KPI measures
 *   insights     — array of short bullet strings (live, derived from already-fetched page data)
 *   chart        — optional { type:'bar'|'line', labels, data, datasetLabel, color, xLabel, yLabel }
 *   onClose
 */
export default function GenericKPIDetailPanel({ label, value, unit, description, insights = [], chart, onClose }) {
  const chartData = chart && {
    labels: chart.labels,
    datasets: [{
      label: chart.datasetLabel || label,
      data: chart.data,
      borderColor: chart.color || '#3b7de8',
      backgroundColor: chart.type === 'line' ? `${chart.color || '#3b7de8'}20` : (chart.colors || chart.color || '#3b7de8'),
      fill: chart.type === 'line',
      tension: 0.35,
      pointRadius: chart.type === 'line' ? 2 : undefined,
      borderWidth: chart.type === 'line' ? 1.6 : undefined,
      borderRadius: chart.type === 'bar' ? 4 : undefined,
    }],
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-app-border flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-bold text-white">{label}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Live KPI detail</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Description</p>
          <p className="text-[12px] text-slate-300 leading-relaxed">{description}</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 mb-1">Current Value</p>
          <p className="text-lg font-bold text-white">{value}{unit && <span className="text-[12px] font-normal text-slate-400 ml-1">{unit}</span>}</p>
        </div>

        {chart && chart.labels?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{chart.title || 'Breakdown'}</p>
            <div style={{ height: 200 }}>
              {chart.type === 'line' ? (
                <Line data={chartData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: chartTooltip() },
                  scales: chartScales({
                    x: { title: { display: true, text: chart.xLabel || '', color: '#94a3b8', font: { size: 9 } } },
                    y: { title: { display: true, text: chart.yLabel || '', color: '#94a3b8', font: { size: 9 } } },
                  }),
                }} />
              ) : (
                <Bar data={chartData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: chartTooltip() },
                  scales: chartScales({
                    x: { title: { display: true, text: chart.xLabel || '', color: '#94a3b8', font: { size: 9 } } },
                    y: { title: { display: true, text: chart.yLabel || '', color: '#94a3b8', font: { size: 9 } } },
                  }),
                }} />
              )}
            </div>
          </div>
        )}

        {insights.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1.5">Operational Insights</p>
            <div className="space-y-1.5">
              {insights.map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <p className="text-[12px] text-slate-300 leading-snug">{line}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
