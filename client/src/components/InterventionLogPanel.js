import React, { useState, useSyncExternalStore } from 'react';
import { ChevronDown, ClipboardList } from 'lucide-react';
import { getInterventionsForModule, subscribe } from '../services/interventionLog';
import { formatIST } from '../services/time';

const OUTCOME_STYLE = {
  Pending: 'text-amber-400 bg-amber-500/15',
  Completed: 'text-emerald-400 bg-emerald-500/15',
};

// Collapsible Intervention Log shown at the bottom of every module page —
// the audit trail of every "Approve & Execute" action a human operator has
// confirmed for this module (last 10).
export default function InterventionLogPanel({ moduleId }) {
  const [collapsed, setCollapsed] = useState(true);
  const entries = useSyncExternalStore(
    subscribe,
    () => getInterventionsForModule(moduleId, 10)
  );

  return (
    <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <ClipboardList size={16} strokeWidth={1.8} className="text-slate-400" />
          <h3 className="text-sm font-bold text-white">Intervention Log</h3>
          <span className="text-[10px] text-slate-500">({entries.length})</span>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>

      {!collapsed && (
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02]">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Time</th>
              <th className="text-left px-3 py-2 font-bold">User</th>
              <th className="text-left px-3 py-2 font-bold">Action Taken</th>
              <th className="text-left px-3 py-2 font-bold">Authorisation Reason</th>
              <th className="text-center px-3 py-2 font-bold">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 text-slate-500 font-mono text-[10px] whitespace-nowrap">{formatIST(e.ts)}</td>
                <td className="px-3 py-2 text-slate-300">{e.userName}</td>
                <td className="px-3 py-2 text-slate-200 font-medium">{e.action}</td>
                <td className="px-3 py-2 text-slate-400">{e.reason}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${OUTCOME_STYLE[e.outcome] || OUTCOME_STYLE.Pending}`}>
                    {e.outcome}
                  </span>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No interventions logged yet for this module</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
