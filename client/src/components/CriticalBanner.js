import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../services/socket';
import { MODULES } from '../services/cementKnowledge';

const ROUTE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m.route]));

export default function CriticalBanner() {
  const { criticalBanners, dismissBanner } = useData();
  const navigate = useNavigate();

  if (!criticalBanners || criticalBanners.length === 0) return null;

  return (
    <div
      className="flex flex-col gap-2"
      style={{ position: 'fixed', top: 'calc(var(--app-header-h, 62px) + 12px)', right: 16, zIndex: 300, width: 340 }}
    >
      {criticalBanners.map((b) => (
        <div
          key={b.id}
          className="rounded-lg border px-3.5 py-3 shadow-2xl animate-slide-up"
          style={{ background: 'rgba(239,68,68,0.16)', borderColor: 'rgba(239,68,68,0.5)', backdropFilter: 'blur(6px)' }}
        >
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-red-300 uppercase tracking-wide">Module Critical</p>
              <p className="text-[12px] text-slate-100 font-semibold leading-snug mt-0.5">{b.label}</p>
              <button
                onClick={() => { navigate(ROUTE_BY_ID[b.moduleId] || '/'); dismissBanner(b.id); }}
                className="text-[10px] font-bold text-red-300 hover:text-red-200 mt-1.5 underline underline-offset-2"
              >
                View module
              </button>
            </div>
            <button onClick={() => dismissBanner(b.id)} className="text-slate-400 hover:text-white shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
