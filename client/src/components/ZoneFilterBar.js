import React from 'react';
import { PLANT_ZONES } from '../services/cementKnowledge';

const ZONES = [
  { id: 'all', label: 'All Zones' },
  ...PLANT_ZONES.map((z) => ({ id: z, label: z })),
];

export default function ZoneFilterBar({ value, onChange, className = '' }) {
  return (
    <div className={`flex items-center flex-wrap gap-1.5 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide mr-0.5"
        style={{ color: 'var(--app-text-faint)' }}>Zone:</span>
      {ZONES.map(z => {
        const active = value === z.id;
        return (
          <button
            key={z.id}
            onClick={() => onChange(z.id)}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all"
            style={{
              background:  active ? 'rgba(59, 125, 232, 0.15)' : 'transparent',
              borderColor: active ? 'rgba(59, 125, 232, 0.45)' : 'var(--app-border)',
              color:       active ? '#3b7de8'                   : 'var(--app-text-faint)',
            }}
          >
            {z.label}
          </button>
        );
      })}
    </div>
  );
}
