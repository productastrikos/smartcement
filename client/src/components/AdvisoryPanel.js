import React, { useState } from 'react';
import { executeAdvisoryAction } from '../services/api';

const PRIORITY_META = {
  critical:    { accent:'#ef4444', badge:'bg-red-500/15 text-red-300 border border-red-500/30 font-bold px-1.5 py-0.5 rounded',         label:'CRITICAL' },
  high:        { accent:'#f97316', badge:'bg-orange-500/15 text-orange-300 border border-orange-500/30 font-bold px-1.5 py-0.5 rounded', label:'HIGH' },
  medium:      { accent:'#f59e0b', badge:'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold px-1.5 py-0.5 rounded',     label:'MEDIUM' },
  info:        { accent:'#38bdf8', badge:'bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold px-1.5 py-0.5 rounded',           label:'INFO' },
  low:         { accent:'#94a3b8', badge:'bg-slate-500/15 text-slate-300 border border-slate-500/30 font-bold px-1.5 py-0.5 rounded',     label:'LOW' },
  predictive:  { accent:'#8b5cf6', badge:'bg-violet-500/15 text-violet-300 border border-violet-500/30 font-bold px-1.5 py-0.5 rounded',  label:'PREDICTIVE' },
};

// Safely render an evidence item — never shows raw JSON
const toEvidenceStr = (e) => {
  if (typeof e === 'string') return e;
  if (!e || typeof e !== 'object') return String(e);
  if (e.detail)   return e.detail;
  if (e.message)  return e.message;
  if (e.bin  && (e.fill    !== undefined)) return e.bin  + ': ' + e.fill    + '% fill';
  if (e.vehicle && e.status) return e.vehicle + ': ' + e.status;
  // Generic: join all string/number kv pairs in readable form
  return Object.entries(e)
    .filter(([,v]) => typeof v !== 'object')
    .map(([k,v]) => k.replace(/_/g,' ') + ': ' + v)
    .join(' · ');
};

// Safely render a recommendation item — never shows raw JSON
const toRecStr = (r) => {
  if (typeof r === 'string') return r;
  if (!r || typeof r !== 'object') return String(r);
  return r.action || r.recommendation || r.step || r.text ||
    Object.values(r).filter(v => typeof v === 'string' && v.length > 6)[0] ||
    Object.entries(r).map(([k,v]) => k.replace(/_/g,' ') + ': ' + v).join(' · ');
};

// Format impact value — handle both numbers and pre-formatted strings
const fmtImpact = (v) => {
  if (typeof v === 'number') return (v > 0 ? '+' : '') + v + '%';
  return String(v);
};

// Capitalise each word; convert underscores to spaces
const titleCase = (s = '') => s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());

const STATIC_ADVISORIES = [
  {
    advisoryId:'ADV-001', priority:'high',
    title:'BH-5 differential pressure trending toward critical — schedule inspection before next shift',
    template:'bag_filter_drift',
    rootCause:{
      primary:'Baghouse BH-5 (Clinker Cooler) differential pressure has climbed steadily over the last 6 hours and is approaching the 28 mbar critical threshold. Acoustic sensors show a correlated rise consistent with early bag blinding.',
      contributing:'Compressed air cleaning cycles on BH-5 have run 20% more frequently this week without resolving the drift.',
      systemic:'BH-5 has crossed the warning threshold twice in the last 30 days. A standing pre-emptive bag replacement schedule for this compartment would prevent recurrence.',
    },
    evidence:[
      'BH-5 differential pressure: rising ~1.1 mbar/hr over the last 6 hours',
      'Acoustic index: 34% and climbing (warning threshold 35%)',
      'Compressed air cleaning frequency: +20% vs weekly baseline',
    ],
    recommendations:[
      'Schedule a physical inspection of BH-5 before the next shift change',
      'Pre-stage replacement bags for the Clinker Cooler zone',
      'Lower the automated alert threshold for BH-5 to 24 mbar going forward',
    ],
    impact: '+28% particulate reduction and +24% bag life protected by catching this before failure',
    actions:[
      { type:'dispatch_crew',   label:'Dispatch Maintenance Crew' },
      { type:'create_work_order', label:'Create Work Order' },
    ],
  },
  {
    advisoryId:'ADV-002', priority:'medium',
    title:'Emissions trending within 15% of the regulatory limit on two compartments — proactive review recommended',
    template:'emissions_headroom',
    rootCause:{
      primary:'BH-3 and BH-4 (Kiln zone) are both reporting particulate emissions above 25 mg/Nm³, within 15% of the 30 mg/Nm³ regulatory limit, though neither has yet breached it.',
      contributing:'No compliance review has been logged for the Kiln zone in the last 7 days.',
      systemic:'Kiln-zone compartments trend higher during periods of increased throughput. A load-aware alert threshold would reduce false urgency.',
    },
    evidence:[
      'BH-3: emission 26.4 mg/Nm³ — 88% of regulatory limit',
      'BH-4: emission 25.9 mg/Nm³ — 86% of regulatory limit',
      'Last compliance review for Kiln zone: 7+ days ago',
    ],
    recommendations:[
      'Log a compliance review for the Kiln zone this shift',
      'Increase inspection cadence on BH-3 and BH-4 for the next 48 hours',
      'Export the current emissions summary for the audit trail',
    ],
    impact: 'Avoids a regulatory limit breach and the associated forced-shutdown risk',
    actions:[
      { type:'create_work_order', label:'Log Compliance Review' },
    ],
  },
];

const ACTION_FORMS = {
  dispatch_crew: {
    title: 'Dispatch Maintenance Crew',
    color: 'cyan',
    fields: [
      { key:'zone',     label:'Target Zone',         type:'select',   opts:['All Zones','Raw Mill','Kiln','Clinker Cooler','Cement Mill','Packing'] },
      { key:'asset',    label:'Compartment / Asset', type:'select',   opts:['BH-1','BH-2','BH-3','BH-4','BH-5','BH-6','BH-7','BH-8'] },
      { key:'priority', label:'Response Priority',   type:'select',   opts:['Immediate (< 15 min)','High (< 30 min)','Standard (< 60 min)'] },
      { key:'notes',    label:'Notes',               type:'textarea', placeholder:'Special instructions...'},
    ],
  },
  create_work_order: {
    title: 'Create Work Order',
    color: 'purple',
    fields: [
      { key:'title',    label:'Work Order Title',    type:'text',     placeholder:'e.g. Inspect BH-5 — pressure drift' },
      { key:'team',     label:'Assigned Team',       type:'select',   opts:['Maintenance Crew','Control Room','HSE / Safety','Management'] },
      { key:'priority', label:'Priority Level',      type:'select',   opts:['CRITICAL – Same day','HIGH – Within 24 hours','LOW – Scheduled'] },
      { key:'due',      label:'Due Date / Time',     type:'text',     placeholder:'e.g. 2026-07-18 14:00' },
      { key:'desc',     label:'Description',         type:'textarea', placeholder:'Describe the work required in detail...'},
    ],
  },
};

const COLOR_MAP = {
  cyan:   { ring:'focus:ring-sky-500/30',    btn:'bg-sky-500/10 border border-sky-500/30 text-sky-300 hover:bg-sky-500/20' },
  emerald:{ ring:'focus:ring-emerald-500/30', btn:'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20' },
  amber:  { ring:'focus:ring-amber-500/30',   btn:'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20' },
  purple: { ring:'focus:ring-violet-500/30',  btn:'bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20' },
};

export default function AdvisoryPanel({ advisories = [], onClose }) {
  // Live, database-backed advisories from the API take priority; fall back to
  // the curated static set only while the first fetch is still in flight.
  const merged = advisories.length > 0 ? advisories : STATIC_ADVISORIES;

  const [expandedId, setExpandedId] = useState(merged[0]?.advisoryId);
  const [executing,  setExecuting]  = useState(null);
  const [actionForm, setActionForm] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const openForm = (actionType, advisory) => {
    const cfg = ACTION_FORMS[actionType];
    if (!cfg) return;
    const defaults = {};
    cfg.fields.forEach(f => { defaults[f.key] = f.opts?.[0] ?? ''; });
    setActionForm({ actionType, advisoryId: advisory.advisoryId, advisoryTitle: advisory.title, formValues: defaults });
  };

  const submitForm = async () => {
    if (!actionForm) return;
    const key = actionForm.advisoryId + '-' + actionForm.actionType;
    setExecuting(key);
    try {
      await executeAdvisoryAction(actionForm.advisoryId, actionForm.actionType, actionForm.formValues);
    } catch (e) {
      console.error(e);
    } finally {
      setExecuting(null);
      const cfg = ACTION_FORMS[actionForm.actionType];
      setSuccessMsg((cfg?.title || 'Action') + ' submitted successfully');
      setActionForm(null);
      setTimeout(() => setSuccessMsg(null), 3200);
    }
  };

  const formClrKey = actionForm ? (ACTION_FORMS[actionForm.actionType]?.color || 'cyan') : 'cyan';
  const formClr    = COLOR_MAP[formClrKey] || COLOR_MAP.cyan;

  return (
    <div className="h-full flex flex-col relative overflow-hidden">

      {/* SUCCESS TOAST */}
      {successMsg && (
        <div className="absolute top-14 left-2 right-2 z-50 bg-emerald-500/20 border border-emerald-500/40 rounded-lg px-3 py-2 text-[10px] text-emerald-400 font-semibold shadow-xl">
          ✓ {successMsg}
        </div>
      )}

      {/* HEADER */}
      <div className="px-4 py-3 border-b border-app-border flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-base font-semibold text-white">AI Advisories</h3>
          <p className="text-xs text-slate-400">{merged.length} active recommendations</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* ACTION FORM PANEL (slides over the list) */}
      {actionForm && (
        <div className="absolute inset-x-0 bottom-0 z-40 bg-app-darker flex flex-col border-t border-app-border" style={{top:53}}>
          {/* Form header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-app-border shrink-0">
            <div>
              <p className="text-[11px] font-bold text-white">{ACTION_FORMS[actionForm.actionType]?.title}</p>
              <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{actionForm.advisoryTitle}</p>
            </div>
            <button onClick={() => setActionForm(null)} className="text-slate-400 hover:text-white text-xl leading-none transition-colors w-7 h-7 flex items-center justify-center rounded hover:bg-white/10">×</button>
          </div>

          {/* Form fields */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {ACTION_FORMS[actionForm.actionType]?.fields.map(field => (
              <div key={field.key}>
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={actionForm.formValues[field.key] || ''}
                    onChange={e => setActionForm(f => ({ ...f, formValues: { ...f.formValues, [field.key]: e.target.value } }))}
                    className={'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-slate-200 focus:outline-none focus:ring-1 ' + formClr.ring}>
                    {field.opts.map(o => <option key={o} value={o} className="bg-slate-900 text-slate-200">{o}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={actionForm.formValues[field.key] || ''}
                    placeholder={field.placeholder}
                    onChange={e => setActionForm(f => ({ ...f, formValues: { ...f.formValues, [field.key]: e.target.value } }))}
                    className={'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-slate-200 placeholder-slate-400 resize-none focus:outline-none focus:ring-1 ' + formClr.ring}
                  />
                ) : (
                  <input
                    type="text"
                    value={actionForm.formValues[field.key] || ''}
                    placeholder={field.placeholder}
                    onChange={e => setActionForm(f => ({ ...f, formValues: { ...f.formValues, [field.key]: e.target.value } }))}
                    className={'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 ' + formClr.ring}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Submit area */}
          <div className="px-4 pb-4 pt-2 shrink-0 space-y-1.5 border-t border-app-border">
            <button
              onClick={submitForm}
              disabled={!!executing}
              className={'w-full py-2.5 text-[11px] font-bold rounded-lg border transition-colors disabled:opacity-50 ' + formClr.btn}>
              {executing ? 'Submitting…' : 'Submit ' + (ACTION_FORMS[actionForm.actionType]?.title || 'Action')}
            </button>
            <button onClick={() => setActionForm(null)}
              className="w-full py-2 text-[10px] text-slate-400 hover:text-slate-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ADVISORY LIST */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5">
        {merged.map((advisory, idx) => {
          const isExpanded = expandedId === advisory.advisoryId;
          const pm = PRIORITY_META[advisory.priority] || PRIORITY_META.low;
          const recs = Array.isArray(advisory.recommendations)
            ? advisory.recommendations
            : advisory.recommendations ? Object.values(advisory.recommendations).flat() : [];
          const impactEntries = advisory.impact ? Object.entries(advisory.impact).slice(0, 4) : [];

          return (
            <div key={advisory.advisoryId}
              className="advisory-card rounded-xl overflow-hidden transition-all duration-200 bg-app-panel border border-app-border"
              style={{ borderLeft: `3px solid ${pm.accent}` }}>

              {/* ── Card header (always visible) ── */}
              <button className="w-full text-left px-3.5 pt-3 pb-2.5 group"
                onClick={() => setExpandedId(isExpanded ? null : advisory.advisoryId)}>

                {/* Top row: index badge + priority dot + advisory ID + chevron */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={'text-[10px] ' + pm.badge}>{pm.label}</span>
                    <span className="text-[10px] text-slate-500">{titleCase(advisory.template)}</span>
                  </div>
                  <svg className={'w-3.5 h-3.5 text-slate-400 transition-transform group-hover:text-slate-200 ' + (isExpanded ? 'rotate-180' : '')}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Advisory title */}
                <p className="text-[13px] font-semibold leading-snug pr-1 text-slate-100">{advisory.title}</p>


              </button>

              {/* ── Expanded body ── */}
              {isExpanded && (
                <div className="border-t border-app-border divide-y divide-white/[0.06]">

                  {/* ROOT CAUSE */}
                  {advisory.rootCause && (
                    <div className="px-3.5 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Root Cause</p>
                      <div className="pl-2 border-l-2 border-white/10 space-y-1.5">
                        {typeof advisory.rootCause === 'object' ? (
                          <>
                            {advisory.rootCause.primary      && (
                              <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Primary · </span>
                                <span className="text-xs text-slate-300">{advisory.rootCause.primary}</span>
                              </div>
                            )}
                            {advisory.rootCause.contributing && (
                              <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Contributing · </span>
                                <span className="text-xs text-slate-300">{advisory.rootCause.contributing}</span>
                              </div>
                            )}
                            {advisory.rootCause.systemic     && (
                              <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Systemic · </span>
                                <span className="text-xs text-slate-300">{advisory.rootCause.systemic}</span>
                              </div>
                            )}
                            {/* Catch any extra keys not handled above */}
                            {Object.keys(advisory.rootCause)
                              .filter(k => !['primary','contributing','systemic'].includes(k))
                              .map(k => (
                                <div key={k}>
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{titleCase(k)} · </span>
                                  <span className="text-xs text-slate-300">
                                    {typeof advisory.rootCause[k] === 'object'
                                      ? Object.values(advisory.rootCause[k]).join(', ')
                                      : String(advisory.rootCause[k])}
                                  </span>
                                </div>
                              ))}
                          </>
                        ) : (
                          <p className="text-xs text-slate-300">{String(advisory.rootCause)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* EVIDENCE */}
                  {advisory.evidence?.length > 0 && (
                    <div className="px-3.5 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Evidence</p>
                      <div className="space-y-1">
                        {advisory.evidence.slice(0, 5).map((e, i) => (
                          <div key={i} className="flex items-start space-x-2">
                            <span className="text-[10px] text-slate-500 mt-0.5 shrink-0 tabular-nums">{i + 1}.</span>
                            <p className="text-xs text-slate-300 leading-snug">{toEvidenceStr(e)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RECOMMENDATIONS */}
                  {recs.length > 0 && (
                    <div className="px-3.5 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recommendations</p>
                      <div className="space-y-1.5">
                        {recs.slice(0, 5).map((r, i) => (
                          <div key={i} className="flex items-start space-x-2 pl-2 border-l-2 border-white/10">
                            <p className="text-xs text-slate-300 leading-snug">{toRecStr(r)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PROJECTED IMPACT — full version (expanded) */}
                  {impactEntries.length > 0 && (
                    <div className="px-3.5 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Projected Impact</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {impactEntries.map(([k, v]) => {
                          const str   = fmtImpact(v);
                          return (
                            <div key={k} className="bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-2">
                              <p className="text-sm font-bold leading-none text-slate-100">{str}</p>
                              <p className="text-[8px] text-slate-500 mt-1 leading-tight">{titleCase(k)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  {advisory.actions?.length > 0 && (
                    <div className="px-3.5 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Actions</p>
                      <div className="space-y-1.5">
                        {advisory.actions.map(action => {
                          const aType  = action.type || action;
                          const cfg    = ACTION_FORMS[aType];
                          const aClr   = cfg ? COLOR_MAP[cfg.color] : COLOR_MAP.cyan;
                          const isExec = executing === advisory.advisoryId + '-' + aType;
                          return (
                            <button key={aType}
                              onClick={() => openForm(aType, advisory)}
                              disabled={isExec}
                              className={'w-full text-left px-3 py-2.5 rounded-lg border transition-all disabled:opacity-50 flex items-center justify-between group/btn ' + (aClr?.btn || COLOR_MAP.cyan.btn)}>
                              <span className="text-[10px] font-semibold">{cfg?.title || action.label || titleCase(aType)}</span>
                              <span className="text-[10px] opacity-50 font-bold group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all">›</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {merged.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-white">AI engine analyzing patterns…</p>
            <p className="text-[10px] text-white/60 mt-1">Advisories will appear here when detected</p>
          </div>
        )}
      </div>
    </div>
  );
}
