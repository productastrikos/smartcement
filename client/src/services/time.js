// 24h, IST-labeled timestamp formatting used across alert trackers, advisory
// panels, and the intervention log.
export function formatIST(iso) {
  if (!iso) return '—';
  try {
    const time = new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    });
    return `${time} IST`;
  } catch {
    return '—';
  }
}
