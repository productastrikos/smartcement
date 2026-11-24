import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { STEP_ORDER, STEP_LABELS, getAlertTimeline, markUnderReview, markResolved } from '../services/alertLifecycle';
import { formatIST } from '../services/time';

// 4-step status tracker rendered under every alert card: Detected →
// Acknowledged → Under Review → Resolved. Completed steps show a filled,
// checked circle and timestamp; the current step pulses; upcoming steps are
// empty and greyed out. "Under Review" and "Resolved" only advance when an
// authorised operator triggers them (via the inline link here, or via the
// AI Advisory "Approve & Execute" flow for Under Review).
export default function AlertStatusTracker({ alert, size = 'sm' }) {
  const [, forceRender] = useState(0);
  const { currentStep, timestamps } = getAlertTimeline(alert);
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  const advance = (step) => {
    if (step === 'under_review') markUnderReview(alert.alertId);
    if (step === 'resolved') markResolved(alert.alertId);
    forceRender((n) => n + 1);
  };

  const nextManualStep = currentStep === 'acknowledged' ? 'under_review' : currentStep === 'under_review' ? 'resolved' : null;

  return (
    <div className="mt-2.5 pt-2.5 border-t border-white/[0.06]">
      <div className="flex items-center">
        {STEP_ORDER.map((step, i) => {
          const isComplete = i < currentIdx || (i === currentIdx && step === 'resolved');
          const isCurrent = i === currentIdx && step !== 'resolved';
          const isUpcoming = i > currentIdx;
          const ts = timestamps[step];

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center" style={{ minWidth: size === 'sm' ? 58 : 72 }}>
                <div className="relative flex items-center justify-center">
                  {isCurrent && (
                    <span className="absolute rounded-full animate-ping" style={{ width: 14, height: 14, background: 'rgba(56,189,248,0.35)' }} />
                  )}
                  <span
                    className="relative rounded-full flex items-center justify-center shrink-0"
                    style={{
                      width: 10,
                      height: 10,
                      background: isComplete ? '#10b981' : isCurrent ? '#38bdf8' : 'transparent',
                      border: isUpcoming ? '1.5px solid rgba(148,163,184,0.4)' : 'none',
                    }}
                  >
                    {isComplete && <Check size={7} strokeWidth={3} color="#06241a" />}
                  </span>
                </div>
                <span
                  className="text-[8px] font-bold uppercase tracking-wide mt-1 text-center leading-tight"
                  style={{ color: isUpcoming ? '#64748b' : isCurrent ? '#38bdf8' : '#cbd5e1' }}
                >
                  {STEP_LABELS[step]}
                </span>
                {ts && <span className="text-[8px] text-slate-500 mt-0.5">{formatIST(ts)}</span>}
              </div>
              {i < STEP_ORDER.length - 1 && (
                <div className="flex-1 h-px mx-1" style={{ background: i < currentIdx ? '#10b981' : 'rgba(148,163,184,0.25)', marginBottom: 14 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {nextManualStep && (
        <button
          onClick={() => advance(nextManualStep)}
          className="mt-2 text-[9px] font-semibold text-sky-400 hover:text-sky-300"
        >
          Mark as {STEP_LABELS[nextManualStep]} →
        </button>
      )}
    </div>
  );
}
