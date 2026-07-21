import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getGovernanceKpis, getGovernanceAuditLog } from '../services/api';
import KPICard, { IcoCalendar, IcoAlert, IcoCheck } from '../components/KPICard';
import GenericKPIDetailPanel from '../components/GenericKPIDetailPanel';

const POLL_INTERVAL_MS = 15000;

export default function Compliance() {
  const [kpis, setKpis] = useState(null);
  const [log, setLog] = useState([]);
  const [error, setError] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [kpisRes, logRes] = await Promise.all([getGovernanceKpis(), getGovernanceAuditLog()]);
      setKpis(kpisRes);
      setLog(logRes.log || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchAll]);

  const kpiDetail = useMemo(() => ({
    consecutiveCompliantDays: {
      label: 'Consecutive Compliant Days',
      value: kpis ? kpis.consecutiveCompliantDays : '—',
      unit: 'days',
      description: 'Number of consecutive days since the last critical compliance violation across governed modules.',
      insights: [`Currently at ${kpis ? kpis.consecutiveCompliantDays : '—'} consecutive compliant days.`],
    },
    totalViolationsYtd: {
      label: 'Total Violations (YTD)',
      value: kpis ? kpis.totalViolationsYtd : '—',
      description: 'Total count of critical alerts from Bag Filter Dust Monitoring and Emissions & Carbon Tracking since January 1.',
      insights: log.length ? log.slice(0, 5).map((r) => `${r.module}: ${r.event} (${new Date(r.date).toLocaleDateString()}).`) : [`${kpis ? kpis.totalViolationsYtd : '—'} violations recorded year-to-date.`],
    },
    dataCompleteness: {
      label: 'Data Completeness',
      value: kpis ? `${kpis.dataCompletenessPct}%` : '—',
      description: 'Share of expected sensor and CEMS data points successfully recorded across governed modules.',
      insights: [`Data completeness is currently ${kpis ? kpis.dataCompletenessPct : '—'}%.`],
    },
  }), [kpis, log]);

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Compliance & Audit</h1>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Plant-wide compliance rollup — sourced from Bag Filter Dust Monitoring and Emissions & Carbon Tracking only
          {error && <span className="text-red-400"> · connection error: {error}</span>}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KPICard
          label="Consecutive Compliant Days"
          value={kpis ? kpis.consecutiveCompliantDays : '—'}
          unit="days"
          icon={<IcoCalendar />}
          rag={kpis && kpis.consecutiveCompliantDays === 0 ? 'critical' : 'normal'}
          description="Days since the last critical compliance violation."
          onClick={() => setSelectedKpi('consecutiveCompliantDays')}
        />
        <KPICard
          label="Total Violations (YTD)"
          value={kpis ? kpis.totalViolationsYtd : '—'}
          icon={<IcoAlert />}
          rag={kpis && kpis.totalViolationsYtd > 0 ? 'warning' : 'normal'}
          description="Critical alerts from governed modules since January 1."
          onClick={() => setSelectedKpi('totalViolationsYtd')}
        />
        <KPICard
          label="Data Completeness"
          value={kpis ? `${kpis.dataCompletenessPct}%` : '—'}
          icon={<IcoCheck />}
          rag="normal"
          description="Share of expected sensor/CEMS data successfully recorded."
          onClick={() => setSelectedKpi('dataCompleteness')}
        />
      </div>

      {/* Audit log */}
      <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border">
          <h3 className="text-sm font-bold text-white">Compliance Audit Log</h3>
        </div>
        <table className="w-full text-[11px]">
          <thead className="text-[9px] uppercase tracking-widest text-slate-500 bg-white/[0.02] sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Date</th>
              <th className="text-left px-3 py-2 font-bold">Module</th>
              <th className="text-left px-3 py-2 font-bold">Event</th>
              <th className="text-left px-3 py-2 font-bold">Action Taken</th>
              <th className="text-left px-3 py-2 font-bold">Reviewed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {log.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{new Date(row.date).toLocaleString()}</td>
                <td className="px-3 py-2 text-slate-300">{row.module}</td>
                <td className="px-3 py-2 text-slate-200 font-medium">{row.event}</td>
                <td className="px-3 py-2 text-slate-300">{row.actionTaken}</td>
                <td className="px-3 py-2 text-slate-400">{row.reviewedBy}</td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No compliance events logged yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedKpi && (
        <div
          className="w-[420px] max-w-full overflow-hidden animate-slide-up border-l border-app-border bg-app-darker"
          style={{ position: 'fixed', top: 'var(--app-header-h, 62px)', right: 0, bottom: 0, zIndex: 200 }}
        >
          <GenericKPIDetailPanel {...kpiDetail[selectedKpi]} onClose={() => setSelectedKpi(null)} />
        </div>
      )}
    </div>
  );
}
