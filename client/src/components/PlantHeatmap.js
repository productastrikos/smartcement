import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MODULES } from '../services/cementKnowledge';

const STATUS_META = {
  normal:   { label: 'Normal',   color: '#10b981', bg: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.4)' },
  watch:    { label: 'Watch',    color: '#38bdf8', bg: 'rgba(56,189,248,0.14)', border: 'rgba(56,189,248,0.4)' },
  warning:  { label: 'Warning',  color: '#f59e0b', bg: 'rgba(245,158,11,0.16)', border: 'rgba(245,158,11,0.45)' },
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.18)',  border: 'rgba(239,68,68,0.5)' },
};

const ROUTE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m.route]));

export default function PlantHeatmap({ moduleHealth = [] }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {moduleHealth.map((m) => {
        const meta = STATUS_META[m.status] || STATUS_META.normal;
        const route = ROUTE_BY_ID[m.id] || '/compliance';
        return (
          <button
            key={m.id}
            onClick={() => navigate(route)}
            className="text-left rounded-lg p-3 border transition-transform hover:scale-[1.02]"
            style={{ background: meta.bg, borderColor: meta.border }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
              <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-200 leading-tight">{m.label}</p>
          </button>
        );
      })}
    </div>
  );
}
