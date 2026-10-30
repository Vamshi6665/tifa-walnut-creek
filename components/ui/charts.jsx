'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Small hand-built SVG charts for the telemetry HUD.
 * Spec: thin marks (≤24px columns, 4px rounded data-end, square baseline),
 * 2px lines with a 10% area wash, ≥8px end dot with a 2px surface ring,
 * solid hairline grid, selective direct labels, text in text tokens (never the
 * series colour), a per-mark/crosshair tooltip that also works from the keyboard
 * (focus the chart, then ←/→).
 */

const SURFACE = '#124A33';
const GRID = 'rgb(255 255 255 / 0.1)';
const AXIS_TEXT = 'rgb(255 255 255 / 0.66)';

function useWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function niceMax(v) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}
const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

function Tooltip({ x, y, children, width }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-line bg-paper/95 px-3 py-2 text-sm shadow-xl"
      style={{ left, top: y - 10 }}
    >
      {children}
    </div>
  );
}

function roundedTopBar(x, y, w, h, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

/* ------------------------------------------------------------------ */
/* Column chart — quiz activity by hour (single series, no legend)     */
/* ------------------------------------------------------------------ */
export function HourColumns({ values, color = '#7FE0AE', height = 200, label }) {
  const ref = useRef(null);
  const width = useWidth(ref);
  const [active, setActive] = useState(null);
  const pad = { l: 34, r: 8, t: 22, b: 26 };
  const max = niceMax(Math.max(1, ...values));
  const peak = values.indexOf(Math.max(...values));
  const iw = Math.max(0, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const slot = iw / values.length;
  const bw = Math.min(24, Math.max(3, slot - 3));
  const y = (v) => pad.t + ih - (v / max) * ih;
  const hourLabel = (h) => `${((h + 11) % 12) + 1}${h < 12 ? 'a' : 'p'}`;

  const onKey = (e) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(values.length - 1, (a ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? values.length) - 1));
    else return;
    e.preventDefault();
  };

  return (
    <div ref={ref} className="relative" tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)} aria-label={`${label}. Use arrow keys to read each hour.`}>
      {width ? (
        <svg width={width} height={height} role="img" aria-label={label}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={pad.l} x2={width - pad.r} y1={y(max * f)} y2={y(max * f)} stroke={GRID} strokeWidth="1" />
              <text x={pad.l - 8} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill={AXIS_TEXT} className="t-tele">
                {compact(max * f)}
              </text>
            </g>
          ))}
          {values.map((v, i) => {
            const x = pad.l + i * slot + (slot - bw) / 2;
            const on = active === i;
            return (
              <g key={i} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}>
                <rect x={pad.l + i * slot} y={pad.t} width={slot} height={ih} fill="transparent" />
                <path d={roundedTopBar(x, y(v), bw, pad.t + ih - y(v))} fill={color} opacity={active == null || on ? 1 : 0.45} />
                {i % 3 === 0 ? (
                  <text x={pad.l + i * slot + slot / 2} y={height - 8} textAnchor="middle" fontSize="11" fill={AXIS_TEXT} className="t-tele">
                    {hourLabel(i)}
                  </text>
                ) : null}
              </g>
            );
          })}
          {values[peak] > 0 ? (
            <text x={pad.l + peak * slot + slot / 2} y={y(values[peak]) - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#FFFFFF" className="t-tele">
              {values[peak]}
            </text>
          ) : null}
          <line x1={pad.l} x2={width - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="rgb(255 255 255 / 0.22)" strokeWidth="1" />
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      {active != null && width ? (
        <Tooltip x={pad.l + active * slot + slot / 2} y={y(values[active])} width={width}>
          <strong className="t-tele text-base text-ink">{values[active]}</strong>{' '}
          <span className="text-ink-dim">
            quizzes, {hourLabel(active)}m to {hourLabel((active + 1) % 24)}m
          </span>
        </Tooltip>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Line + area — quizzes per day                                        */
/* ------------------------------------------------------------------ */
export function DailyLine({ data, color = '#F7E7C1', height = 200, label }) {
  const ref = useRef(null);
  const width = useWidth(ref);
  const [active, setActive] = useState(null);
  const pad = { l: 34, r: 40, t: 18, b: 26 };
  const max = niceMax(Math.max(1, ...data.map((d) => d.count)));
  const iw = Math.max(1, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const x = (i) => pad.l + (i / Math.max(1, data.length - 1)) * iw;
  const y = (v) => pad.t + ih - (v / max) * ih;
  const pts = data.map((d, i) => [x(i), y(d.count)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1)},${pad.t + ih} L${x(0)},${pad.t + ih} Z`;
  const fmt = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const last = data.length - 1;

  const onMove = (e) => {
    const b = ref.current.getBoundingClientRect();
    const rel = (e.clientX - b.left - pad.l) / iw;
    setActive(Math.max(0, Math.min(last, Math.round(rel * last))));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(last, (a ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? data.length) - 1));
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={ref}
      className="relative"
      tabIndex={0}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
      onPointerMove={onMove}
      onPointerLeave={() => setActive(null)}
      aria-label={`${label}. Use arrow keys to read each day.`}
    >
      {width ? (
        <svg width={width} height={height} role="img" aria-label={label}>
          <defs>
            <linearGradient id="tf-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.14" />
              <stop offset="1" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={pad.l} x2={width - pad.r} y1={y(max * f)} y2={y(max * f)} stroke={GRID} strokeWidth="1" />
              <text x={pad.l - 8} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill={AXIS_TEXT} className="t-tele">
                {compact(max * f)}
              </text>
            </g>
          ))}
          <path d={area} fill="url(#tf-area)" />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {[0, Math.floor(last / 2), last].map((i) => (
            <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'} fontSize="11" fill={AXIS_TEXT} className="t-tele">
              {i === last ? 'Today' : fmt(data[i].day)}
            </text>
          ))}
          {/* end marker + direct label */}
          <circle cx={pts[last]?.[0]} cy={pts[last]?.[1]} r="5" fill={color} stroke={SURFACE} strokeWidth="2" />
          <text x={(pts[last]?.[0] ?? 0) + 9} y={(pts[last]?.[1] ?? 0) + 4} fontSize="12" fontWeight="700" fill="#FFFFFF" className="t-tele">
            {data[last]?.count}
          </text>
          {active != null ? (
            <g>
              <line x1={x(active)} x2={x(active)} y1={pad.t} y2={pad.t + ih} stroke="rgb(255 255 255 / 0.4)" strokeWidth="1" />
              <circle cx={pts[active][0]} cy={pts[active][1]} r="5" fill={color} stroke={SURFACE} strokeWidth="2" />
            </g>
          ) : null}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      {active != null && width ? (
        <Tooltip x={x(active)} y={pts[active][1]} width={width}>
          <strong className="t-tele text-base text-ink">{data[active].count}</strong>{' '}
          <span className="text-ink-dim">quizzes on {active === last ? 'today' : fmt(data[active].day)}</span>
        </Tooltip>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bar list — top flavors / dietary share                    */
/* ------------------------------------------------------------------ */
export function BarList({ rows, color = '#F7E7C1', format = (v) => v, max: maxIn, renderLabel }) {
  const max = maxIn ?? Math.max(1, ...rows.map((r) => r.value));
  const [hover, setHover] = useState(null);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} onPointerEnter={() => setHover(r.key)} onPointerLeave={() => setHover(null)}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-medium text-ink">{renderLabel ? renderLabel(r) : r.label}</span>
            <span className="t-tele text-ink">{format(r.value)}</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full rounded-full bg-ink/[0.04]">
            <div
              className="h-full rounded-full transition-[width,opacity] duration-700"
              style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%`, background: color, opacity: hover == null || hover === r.key ? 1 : 0.5 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function useAnimatedNumber(value, duration = 900) {
  const [shown, setShown] = useState(value ?? 0);
  const from = useRef(value ?? 0);
  useEffect(() => {
    if (value == null) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now) => {
      const k = reduce ? 1 : Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (value - a) * e));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}

export const useMemoRows = (fn, deps) => useMemo(fn, deps); // eslint-disable-line react-hooks/exhaustive-deps
