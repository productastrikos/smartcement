import React, { useState } from 'react';
import { X } from 'lucide-react';

const MIN_REASON_LENGTH = 10;

// Human-intervention gate: no AI-recommended action executes without an
// explicit, reasoned approval from a logged-in operator. Shown whenever an
// advisory's "Approve & Execute" button is clicked.
export default function ApproveExecuteModal({ action, assetLabel, impact, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const canConfirm = reason.trim().length >= MIN_REASON_LENGTH;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,15,0.72)', backdropFilter: 'blur(2px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-app-border bg-app-darker shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
          <h3 className="text-sm font-bold text-white">Confirm Intervention</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Action to be taken</p>
            <p className="text-[13px] text-slate-100 font-medium leading-snug">{action}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Affected asset / zone</p>
            <p className="text-[12px] text-slate-300">{assetLabel}</p>
          </div>
          {impact && (
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Estimated impact</p>
              <p className="text-[12px] text-emerald-400 font-medium">{impact}</p>
            </div>
          )}
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Enter your authorisation reason
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the operational justification for this intervention (minimum 10 characters)..."
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-teal-500/40"
            />
            {reason.length > 0 && !canConfirm && (
              <p className="text-[9px] text-amber-400 mt-1">
                {MIN_REASON_LENGTH - reason.trim().length} more character(s) required.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-app-border">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          <button
            onClick={() => canConfirm && onConfirm(reason.trim())}
            disabled={!canConfirm}
            className="flex-1 py-2.5 rounded-lg text-[12px] font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#0d9488' }}
          >
            Confirm &amp; Execute
          </button>
        </div>
      </div>
    </div>
  );
}
