import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../services/socket';
import { MODULES } from '../services/cementKnowledge';

const TYPE_META = {
  critical: { dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25' },
  info: { dot: 'bg-sky-500', text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25' },
};

const ROUTE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m.route]));

function timeSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function NotificationsPanel({ notifications = [], onClose }) {
  const navigate = useNavigate();
  const { acknowledgeAlert } = useData();
  const [toast, setToast] = useState(null);
  const unresolved = notifications.filter((n) => !n.acknowledged);
  const resolved = notifications.filter((n) => n.acknowledged).slice(0, 8);

  const handleAcknowledge = (alertId) => {
    acknowledgeAlert(alertId);
    setToast('Acknowledged');
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="h-full flex flex-col relative">
      {toast && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 animate-slide-up">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}

      <div className="px-4 py-3 border-b border-app-border flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
          <p className="text-[11px] text-slate-400">{unresolved.length} unread across the plant</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Unread</p>
          <div className="space-y-1.5">
            {unresolved.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.info;
              return (
                <div key={n.alertId} className={`rounded-lg p-2.5 border ${meta.bg} ${meta.border}`}>
                  <div className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${meta.dot} ${n.type === 'critical' ? 'animate-pulse' : ''}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${meta.text}`}>{n.module}</span>
                        <span className="text-[9px] text-slate-500 shrink-0">{timeSince(n.createdAt)}</span>
                      </div>
                      <p className="text-[12px] font-medium text-slate-100 mt-0.5 leading-snug">{n.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <button
                          onClick={() => { navigate(ROUTE_BY_ID[n.moduleId] || '/'); onClose && onClose(); }}
                          className="text-[10px] font-semibold text-slate-300 hover:text-white"
                        >
                          View module
                        </button>
                        <button
                          onClick={() => handleAcknowledge(n.alertId)}
                          className="text-[10px] font-semibold text-sky-400 hover:text-sky-300"
                        >
                          Acknowledge
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {unresolved.length === 0 && (
              <div className="text-center py-8 text-[11px] text-slate-500">No unread notifications</div>
            )}
          </div>
        </div>

        {resolved.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Earlier</p>
            <div className="space-y-1">
              {resolved.map((n) => (
                <div key={n.alertId} className="rounded-lg p-2.5 border border-white/[0.05] bg-white/[0.02] opacity-70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{n.module}</span>
                    <span className="text-[9px] text-slate-600 shrink-0">{timeSince(n.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{n.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
