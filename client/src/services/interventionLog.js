// Client-side Intervention Log. No backend endpoint exists for logging
// approved AI-advisory actions, so entries are recorded locally (scoped to
// this browser) and surfaced per-module in the Intervention Log panel.
const STORAGE_KEY = 'cempulse_intervention_log_v1';
const listeners = new Set();

function readLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function writeLog(log) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(0, 500)));
  } catch {
    // ignore — storage unavailable
  }
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getInterventionsForModule(moduleId, limit = 10) {
  return readLog()
    .filter((e) => e.moduleId === moduleId)
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, limit);
}

export function logIntervention({ moduleId, assetLabel, action, reason, userName }) {
  const entry = {
    id: `IVN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    moduleId,
    assetLabel,
    action,
    reason,
    userName: userName || 'Operator',
    outcome: 'Pending',
    ts: new Date().toISOString(),
  };
  const log = readLog();
  log.unshift(entry);
  writeLog(log);

  // Simulated execution — flips to Completed shortly after, as a stand-in
  // for the real control-system acknowledgement this would receive.
  setTimeout(() => {
    const current = readLog();
    const idx = current.findIndex((e) => e.id === entry.id);
    if (idx !== -1) {
      current[idx] = { ...current[idx], outcome: 'Completed' };
      writeLog(current);
    }
  }, 4000);

  return entry;
}
