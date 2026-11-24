// Demo currency helper — the backend's economic KPIs are generated as USD
// amounts; this converts them to Indian Rupees (lakh/crore notation) for
// display, since the client-facing demo shows currency in ₹ rather than $.
const USD_TO_INR = 83;

export function usdToInr(usd) {
  return usd * USD_TO_INR;
}

// Formats a USD amount as a ₹ string using lakh/crore notation for large
// figures, and plain Indian-grouped digits for anything under ₹1 lakh.
export function formatINR(usd, { decimals = 2 } = {}) {
  if (usd == null || Number.isNaN(usd)) return '—';
  const inr = usdToInr(usd);
  const abs = Math.abs(inr);
  if (abs >= 1e7) return `₹${(inr / 1e7).toFixed(decimals)} Cr`;
  if (abs >= 1e5) return `₹${(inr / 1e5).toFixed(decimals)} L`;
  return `₹${Math.round(inr).toLocaleString('en-IN')}`;
}

// Compact form for small per-unit figures (e.g. "$/ton" cards) — no
// lakh/crore suffix, just the converted, Indian-grouped rupee amount.
export function formatINRCompact(usd) {
  if (usd == null || Number.isNaN(usd)) return '—';
  return `₹${Math.round(usdToInr(usd)).toLocaleString('en-IN')}`;
}
