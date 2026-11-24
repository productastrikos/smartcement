import React from 'react';
import {
  BarChart3, AlertTriangle, Route, Trash2, Recycle, BarChart2, Clock, CheckCircle2, Smile,
  ShieldCheck, MapPin, Calendar, Truck, Users, Wrench, Lock, Scale, Leaf, Phone, Package,
  IndianRupee, TrendingUp, Hourglass, Zap, ClipboardList, Thermometer, Wind, TrendingDown,
  Flame, Fuel, Link2, Gauge, Globe, CalendarCheck2, LayoutGrid,
} from 'lucide-react';

/* ─── Icon library — lucide-react, line-style, consistent 20px/1.75 weight ─── */
const ICON_SIZE = 20;
const ICON_STROKE = 1.75;
const wrap = (Icon) => () => <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />;

export const IcoCoverage    = wrap(BarChart3);
export const IcoAlert       = wrap(AlertTriangle);
export const IcoRoute       = wrap(Route);
export const IcoTrash       = wrap(Trash2);
export const IcoRecycle     = wrap(Recycle);
export const IcoBarChart    = wrap(BarChart2);
export const IcoClock       = wrap(Clock);
export const IcoCheck       = wrap(CheckCircle2);
export const IcoSmile       = wrap(Smile);
export const IcoShield      = wrap(ShieldCheck);
export const IcoPin         = wrap(MapPin);
export const IcoCalendar    = wrap(Calendar);
export const IcoTruck       = wrap(Truck);
export const IcoPeople      = wrap(Users);
export const IcoWrench      = wrap(Wrench);
export const IcoLock        = wrap(Lock);
export const IcoScale       = wrap(Scale);
export const IcoLeaf        = wrap(Leaf);
export const IcoPhone       = wrap(Phone);
export const IcoBox         = wrap(Package);
export const IcoDollar      = wrap(IndianRupee);
export const IcoTrendUp     = wrap(TrendingUp);
export const IcoHourglass   = wrap(Hourglass);
export const IcoBolt        = wrap(Zap);
export const IcoClipboard   = wrap(ClipboardList);
export const IcoThermometer = wrap(Thermometer);
export const IcoWind        = wrap(Wind);
export const IcoTrendDown   = wrap(TrendingDown);
export const IcoFire        = wrap(Flame);
export const IcoFuel        = wrap(Fuel);
export const IcoLink        = wrap(Link2);
export const IcoSignal      = wrap(Gauge);
export const IcoGlobe       = wrap(Globe);
export const IcoAttendance  = wrap(CalendarCheck2);

export function deriveRag(color) {
  if (!color) return 'normal';
  if (color.includes('red'))                                                        return 'critical';
  if (color.includes('amber') || color.includes('yellow') || color.includes('orange')) return 'warning';
  return 'normal';
}

/**
 * KPICard — enterprise-grade stat tile (3-column layout)
 *
 * Props:
 *   label      — card title text (shown top-left alongside icon)
 *   value      — main displayed value
 *   unit       — optional unit string appended to value
 *   icon       — emoji or JSX node shown in icon box
 *   color      — Tailwind text-* class (used to derive rag if rag prop not given)
 *   rag        — explicit rag key ('normal' | 'warning' | 'critical')
 *   trend      — percent change number (positive = up, negative = down)
 *   subValues  — array of { label, value } for secondary metrics row
 *   onClick    — makes card clickable
 */
export default function KPICard({ label, value, unit, icon, color, rag: ragProp, trend, onClick, subValues, description, size = 'default' }) {
  const hasTrend = trend !== null && trend !== undefined;
  const isPos    = (trend || 0) >= 0;
  const rag      = ragProp || deriveRag(color);
  const compact  = size === 'compact';

  const ragStyles = {
    normal:   { color: '#22c55e', dot: '#16a34a', label: 'NORMAL'   },
    warning:  { color: '#f59e0b', dot: '#d97706', label: 'WARNING'  },
    critical: { color: '#ef4444', dot: '#dc2626', label: 'CRITICAL' },
  }[rag] || { color: '#22c55e', dot: '#16a34a', label: 'NORMAL' };

  return (
    <div
      className="kpi-card"
      style={{
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: compact ? '12px 14px 11px' : '18px 20px 16px',
        overflow: 'hidden',
        minHeight: 0,
        position: 'relative',
      }}
    >
      {/* ── Row 1: icon + label + trend badge ───────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '7px' : '10px', flexShrink: 0 }}>
        <div
          className="rounded-xl flex items-center justify-center leading-none cwm-kpi-icon"
          style={{ width: compact ? '24px' : '32px', height: compact ? '24px' : '32px', fontSize: compact ? '0.9rem' : '1.15rem', flexShrink: 0, color: '#38bdf8' }}
        >
          {icon || <LayoutGrid size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
        </div>
        <p
          className="font-semibold leading-tight flex-1"
          style={{ color: 'var(--app-text-muted)', fontSize: compact ? '10.5px' : '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {label}
        </p>
        {hasTrend && (
          <span
            className="kpi-trend-badge font-semibold flex items-center leading-tight gap-0.5"
            style={{
              fontSize: '10px',
              color:      isPos ? '#22c55e' : '#ef4444',
              background: isPos ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              padding: '2px 6px',
              borderRadius: '5px',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '8px' }}>{isPos ? '▲' : '▼'}</span>
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </span>
        )}
      </div>

      {/* ── Row 2: large value ──────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, marginTop: compact ? '8px' : '14px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span
          className="font-bold leading-none tracking-tight"
          style={{ color: 'var(--app-text)', fontSize: compact ? 'clamp(1.3rem, 2.2vw, 1.7rem)' : 'clamp(2rem, 3.5vw, 2.8rem)' }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ color: 'var(--app-text-faint)', fontSize: compact ? '0.7rem' : '0.85rem', fontWeight: 500 }}>{unit}</span>
        )}
      </div>

      {/* ── Row 2b: short description ───────────────────────────────────── */}
      {description && (
        <p
          className="leading-snug"
          style={{
            color: 'var(--app-text-faint)',
            fontSize: compact ? '10px' : '11px',
            marginTop: compact ? '5px' : '8px',
            flexShrink: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </p>
      )}

      {/* ── Row 3: sub-values ───────────────────────────────────────────── */}
      {subValues && subValues.length > 0 && (
        <div style={{ display: 'flex', gap: compact ? '12px' : '20px', marginTop: compact ? '7px' : '12px', flexShrink: 0, flexWrap: 'wrap' }}>
          {subValues.map((sv, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: compact ? '8px' : '9px', color: 'var(--app-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sv.label}</span>
              <span style={{ fontSize: compact ? '11px' : '13px', color: 'var(--app-text-muted)', fontWeight: 600 }}>{sv.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="kpi-card-divider" style={{ height: '1px', background: 'var(--app-border)', marginTop: 'auto', marginBottom: compact ? '7px' : '10px', flexShrink: 0 }} />

      {/* ── Row 4: RAG badge left, detail action right ──────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: compact ? '9px' : '10px', fontWeight: 700, letterSpacing: '0.07em', color: ragStyles.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ragStyles.dot, display: 'inline-block', flexShrink: 0 }} />
          {ragStyles.label}
        </span>
        {onClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onClick())}
            aria-label={`Details for ${label}`}
            title={`Details for ${label}`}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: compact ? '9px' : '10px', fontWeight: 700, color: '#22d3ee',
              textDecoration: 'underline', textUnderlineOffset: '2px',
              cursor: 'pointer', letterSpacing: '0.05em', lineHeight: 1,
            }}
          >
            VIEW DETAILS
          </button>
        )}
      </div>
    </div>
  );
}

