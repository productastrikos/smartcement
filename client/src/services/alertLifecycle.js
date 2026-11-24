// Client-side overlay for the 4-step alert status tracker (Detected →
// Acknowledged → Under Review → Resolved). "Detected" and "Acknowledged" are
// derived directly from the real alert record (createdAt / acknowledged);
// "Under Review" and "Resolved" are manual, operator-triggered states that
// don't exist in the backend alert model, so they're tracked here, scoped to
// this browser, and layered on top of the real data without altering it.
const STORAGE_KEY = 'cempulse_alert_lifecycle_v1';

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable (private browsing, etc.) — overlay state just
    // won't persist across reloads; the tracker still works for the session.
  }
}

export function getAlertOverride(alertId) {
  return readStore()[alertId] || null;
}

export function setAlertOverride(alertId, step) {
  const store = readStore();
  store[alertId] = { step, at: new Date().toISOString() };
  writeStore(store);
  return store[alertId];
}

export const STEP_ORDER = ['detected', 'acknowledged', 'under_review', 'resolved'];

export const STEP_LABELS = {
  detected: 'Detected',
  acknowledged: 'Acknowledged',
  under_review: 'Under Review',
  resolved: 'Resolved',
};

// Computes the effective step + per-step timestamps for an alert, merging the
// real backend record with any manual client-side overlay.
export function getAlertTimeline(alert) {
  const override = getAlertOverride(alert.alertId);
  const timestamps = { detected: alert.createdAt };

  if (alert.acknowledged) timestamps.acknowledged = alert.resolvedAt || alert.createdAt;
  if (override?.step === 'under_review' || override?.step === 'resolved') {
    timestamps.under_review = override.step === 'under_review' ? override.at : (override.underReviewAt || override.at);
  }
  if (override?.step === 'resolved') timestamps.resolved = override.at;

  let currentStep = 'detected';
  if (alert.acknowledged) currentStep = 'acknowledged';
  if (override?.step === 'under_review') currentStep = 'under_review';
  if (override?.step === 'resolved') currentStep = 'resolved';

  return { currentStep, timestamps };
}

export function markUnderReview(alertId) {
  return setAlertOverride(alertId, 'under_review');
}

export function markResolved(alertId) {
  return setAlertOverride(alertId, 'resolved');
}
