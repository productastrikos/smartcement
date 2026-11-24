import React, { useState } from 'react';
import { Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';
import ApproveExecuteModal from './ApproveExecuteModal';
import { logIntervention } from '../services/interventionLog';
import { markUnderReview } from '../services/alertLifecycle';
import { useAuth } from '../services/auth';

const SEVERITY_META = {
  critical: { label: 'Critical', color: '#ef4444' },
  warning: { label: 'Elevated', color: '#f59e0b' },
  info: { label: 'Informational', color: '#38bdf8' },
};

// Per-module AI Advisory panel: generated from live module data (passed in
// as `advisories`, already ranked by severity, max 3), each with Situation /
// Risk if unresolved / Recommended action. No recommendation executes
// automatically — every "Approve & Execute" goes through the human
// intervention gate (ApproveExecuteModal) and is written to the
// Intervention Log.
export default function ModuleAdvisoryPanel({ moduleId, advisories = [] }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [toast, setToast] = useState(null);

  const handleApprove = (reason) => {
    if (!pendingAction) return;
    logIntervention({
      moduleId,
      assetLabel: pendingAction.assetLabel,
      action: pendingAction.action,
      reason,
      userName: user?.fullName || user?.username,
    });
    if (pendingAction.alertId) markUnderReview(pendingAction.alertId);
    setPendingAction(null);
    setToast('Action approved and logged. Executing...');
    setTimeout(() => setToast(null), 3200);
  };

  return (
    <div className="bg-app-panel border rounded-xl overflow-hidden" style={{ borderColor: 'rgba(20,184,166,0.3)' }}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(20,184,166,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={18} strokeWidth={1.8} color="#2dd4bf" />
          <div className="text-left">
            <h3 className="text-sm font-bold text-white">AI Advisory</h3>
            <p className="text-[10px] text-slate-400">{advisories.length} active recommendation{advisories.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>

      {!collapsed && (
        <div className="p-3 space-y-2.5">
          {advisories.length === 0 && (
            <div className="text-center py-6 text-[11px] text-slate-500">
              No advisories at this time — all monitored parameters are within normal operating range.
            </div>
          )}
          {advisories.slice(0, 3).map((a) => {
            const meta = SEVERITY_META[a.severity] || SEVERITY_META.info;
            return (
              <div
                key={a.id}
                className="rounded-lg border px-3.5 py-3"
                style={{ borderColor: `${meta.color}3a`, background: `${meta.color}0c` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ color: meta.color, background: `${meta.color}22` }}>
                    {meta.label}
                  </span>
                  <span className="text-[9px] text-slate-500">{a.assetLabel}</span>
                </div>
                <div className="space-y-1.5 text-[11px] leading-snug">
                  <p><span className="font-bold text-slate-300">Situation: </span><span className="text-slate-300">{a.situation}</span></p>
                  <p><span className="font-bold text-slate-300">Risk if unresolved: </span><span className="text-slate-300">{a.risk}</span></p>
                  <p><span className="font-bold text-slate-300">Recommended action: </span><span className="text-slate-300">{a.action}</span></p>
                </div>
                <button
                  onClick={() => setPendingAction(a)}
                  className="mt-2.5 w-full text-center py-2 rounded-lg text-[11px] font-bold text-white"
                  style={{ background: '#0d9488' }}
                >
                  Approve &amp; Execute
                </button>
              </div>
            );
          })}
        </div>
      )}

      {pendingAction && (
        <ApproveExecuteModal
          action={pendingAction.action}
          assetLabel={pendingAction.assetLabel}
          impact={pendingAction.impact}
          onConfirm={handleApprove}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[401] bg-emerald-500/95 text-white text-[12px] font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2">
          <CheckCircle2 size={16} strokeWidth={2} />
          {toast}
        </div>
      )}
    </div>
  );
}
