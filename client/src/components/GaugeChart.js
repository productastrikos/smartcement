import React from 'react';

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

/**
 * Semi-circle gauge: value vs. target within a [min, max] range.
 */
export default function GaugeChart({ value, min, max, target, unit = '', label }) {
  const cx = 100;
  const cy = 100;
  const r = 80;
  const strokeWidth = 16;
  const arcLength = Math.PI * r;

  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const targetFraction = Math.max(0, Math.min(1, (target - min) / (max - min)));

  const deviation = Math.abs(value - target) / (max - min);
  const color = deviation < 0.08 ? '#10b981' : deviation < 0.18 ? '#f59e0b' : '#ef4444';

  const dashOffset = arcLength * (1 - fraction);
  const targetAngle = 180 - targetFraction * 180;
  const tickInner = polarToCartesian(cx, cy, r - 12, targetAngle);
  const tickOuter = polarToCartesian(cx, cy, r + 8, targetAngle);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 118" style={{ width: '100%', maxWidth: 220 }}>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.6s ease' }}
        />
        <line
          x1={tickInner.x} y1={tickInner.y} x2={tickOuter.x} y2={tickOuter.y}
          stroke="#cbd5e1" strokeWidth={2}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="700" fill="#f8fafc">
          {value.toFixed(1)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#94a3b8">
          {unit} · target {target}{unit}
        </text>
      </svg>
      {label && <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold -mt-1">{label}</p>}
    </div>
  );
}
