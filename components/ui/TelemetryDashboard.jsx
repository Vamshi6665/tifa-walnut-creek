'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Table2, BarChart3 } from 'lucide-react';
import { FLAVOR_BY_ID, FLAVORS, DIETARY } from '@/lib/flavors';
import { useStore } from '@/lib/store';
import { useInView, usePrefersReducedMotion } from './useInView';
import { HourColumns, DailyLine, BarList, useAnimatedNumber } from './charts';
import { Swatch } from './Hero';
import InertiaCard from './InertiaCard';

const HoloTerrain = dynamic(() => import('@/components/canvas/HoloTerrain'), { ssr: false });

const hourLabel = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`;

/** Deterministic, clearly-labelled sample data for when Upstash isn't connected. */
function sampleData() {
  let s = 42;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const curve = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 6, 9, 11, 10, 9, 11, 15, 19, 22, 20, 14, 7, 2];
  const hours = curve.map((c) => Math.round(c * (0.8 + rnd() * 0.4)));
  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    const weekend = [5, 6].includes(d.getDay());
    return { day: d.toISOString().slice(0, 10), count: Math.round((weekend ? 34 : 18) * (0.75 + rnd() * 0.5)) };
  });
  const picks = ['pistachio', 'salted-caramel', 'mango', 'dark-chocolate', 'stracciatella', 'raspberry', 'matcha', 'hazelnut'];
  const flavors = picks.map((id, i) => ({ id, count: Math.round(60 / (i + 1.4) + rnd() * 6) }));
  const total = daily.reduce((a, d) => a + d.count, 0) + 211;
  return {
    configured: false,
    sample: true,
    generatedAt: new Date().toISOString(),
    total,
    today: daily[13].count,
    hours,
    flavors,
    dietary: { vegan: 31, dairyFree: 44, glutenFree: 27, nutFree: 19 },
    dietaryUsed: 78,
    daily,
    recent: picks.slice(0, 6).map((id, i) => ({ id, t: Date.now() - (i * 7 + 2) * 60000 })),
  };
}

function ago(t) {
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

function Stat({ label, value, suffix = '', hero = false, sub }) {
  const n = useAnimatedNumber(typeof value === 'number' ? value : null);
  return (
    <InertiaCard className="hud rounded-md p-5" max={6}>
      <p className="text-sm font-medium text-chrome-dim">{label}</p>
      <p className={`t-tele mt-2 font-medium tracking-tight text-chrome ${hero ? 'text-[clamp(2.75rem,5vw,4rem)] leading-none' : 'text-[clamp(1.75rem,3vw,2.5rem)] leading-none'}`}>
        {typeof value === 'number' ? n.toLocaleString('en-US') : value}
        {suffix}
      </p>
      {sub ? <p className="mt-2 text-sm text-chrome-faint">{sub}</p> : null}
    </InertiaCard>
  );
}

function Panel({ title, sub, children, className = '' }) {
  return (
    <div className={`hud rounded-md p-5 md:p-6 ${className}`}>
      <h3 className="font-display text-lg font-medium text-chrome">{title}</h3>
      {sub ? <p className="mt-0.5 text-sm text-chrome-dim">{sub}</p> : null}
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default function TelemetryDashboard() {
  const section = useRef(null);
  const globe = useRef(null);
  const { near } = useInView(section);
  const { visible: globeVisible, near: globeNear } = useInView(globe);
  const reduce = usePrefersReducedMotion();
  const tier = useStore((s) => s.tier);
  const ping = useStore((s) => s.ping);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [table, setTable] = useState(false);
  const lastTotal = useRef(null);
  const storeLabel = useRef(null);
  const diabloLabel = useRef(null);
  const mapLabels = useMemo(() => ({ store: storeLabel, diablo: diabloLabel }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/insights', { cache: 'no-store' });
      const json = await r.json();
      if (!json.configured) {
        setData((d) => d ?? sampleData());
        setError(null);
      } else if (json.error) {
        setError('Live numbers are unavailable right now. Showing the last update.');
      } else {
        if (lastTotal.current != null && json.total > lastTotal.current) ping();
        lastTotal.current = json.total;
        setData(json);
        setError(null);
      }
    } catch {
      setData((d) => d ?? sampleData());
      setError('Could not reach the insights service. Showing sample data.');
    } finally {
      setLoading(false);
    }
  }, [ping]);

  useEffect(() => {
    if (!near) return undefined;
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 20_000);
    return () => clearInterval(id);
  }, [near, load]);

  const d = data;
  const peakHour = d ? d.hours.indexOf(Math.max(...d.hours)) : null;
  const dietPct = d && d.total ? Math.round((d.dietaryUsed / d.total) * 100) : 0;

  const flavorRows = useMemo(() => {
    if (!d) return [];
    const top = d.flavors.slice(0, 6);
    const other = d.flavors.slice(6).reduce((a, f) => a + f.count, 0);
    const rows = top.map((f) => ({ key: f.id, label: FLAVOR_BY_ID[f.id]?.name ?? f.id, value: f.count, id: f.id }));
    if (other) rows.push({ key: 'other', label: `${d.flavors.length - 6} other flavors`, value: other });
    return rows;
  }, [d]);

  const dietRows = useMemo(
    () => (d ? DIETARY.map((x) => ({ key: x.id, label: x.label, value: d.total ? Math.round(((d.dietary[x.key] || 0) / d.total) * 100) : 0 })) : []),
    [d],
  );

  return (
    <section id="dashboard" ref={section} className="relative scroll-mt-16 bg-obsidian pb-24 pt-8 md:pb-32" aria-labelledby="dash-title">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <h2 id="dash-title" className="t-h2 md:col-span-7" data-warp>
            Mission control.
          </h2>
          <p className="t-body text-chrome-dim md:col-span-5">
            Live numbers from every flavor quiz taken on this site. No names, no locations, just what Walnut Creek is craving.
          </p>
        </div>

        {/* one control row, above everything it scopes */}
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {d?.sample ? (
            <p className="rounded-[3px] border border-vanilla/40 bg-vanilla/10 px-4 py-2 text-sm font-medium text-vanilla">
              Sample data. Connect Upstash Redis to show live numbers.
            </p>
          ) : (
            <p className="flex items-center gap-2 rounded-[3px] border border-mint/30 px-4 py-2 text-sm font-medium text-chrome">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
              </span>
              Live
            </p>
          )}
          {d ? (
            <p className="t-tele text-sm text-chrome-dim">
              Updated {new Date(d.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
            </p>
          ) : null}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => setTable((t) => !t)} aria-pressed={table} className="btn btn-ghost !min-h-10 !px-4 text-sm">
              {table ? <BarChart3 size={16} aria-hidden="true" /> : <Table2 size={16} aria-hidden="true" />}
              {table ? 'View as charts' : 'View as table'}
            </button>
            <button type="button" onClick={load} disabled={loading} className="btn btn-ghost !min-h-10 !px-4 text-sm">
              <RefreshCw size={16} aria-hidden="true" className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
              Refresh
            </button>
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-rose" role="alert">
            {error}
          </p>
        ) : null}

        <div className={`mt-6 grid gap-4 transition-opacity lg:grid-cols-12 ${loading && d ? 'opacity-70' : 'opacity-100'}`}>
          {/* holo map */}
          <div ref={globe} className="hud relative min-h-[340px] overflow-hidden rounded-md lg:col-span-5 lg:row-span-2">
            {globeNear && tier !== 'none' ? <HoloTerrain active={globeVisible} reducedMotion={reduce} labels={mapLabels} /> : null}
            <div ref={storeLabel} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 opacity-0">
              <span className="t-tele block -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-rose/40 bg-obsidian/80 px-2 py-1 text-[0.7rem] text-chrome">
                1545 Locust St
              </span>
            </div>
            <div ref={diabloLabel} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 opacity-0">
              <span className="t-tele block -translate-x-1/2 -translate-y-full whitespace-nowrap text-[0.7rem] text-vanilla/80">Mt. Diablo</span>
            </div>
            <div className="pointer-events-none absolute inset-x-5 bottom-4 flex items-end justify-between gap-4">
              <p className="text-sm text-chrome-dim">Downtown Walnut Creek. The beacon pulses each time a quiz is recorded.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:col-span-7">
            <Stat label="Quizzes taken" value={d?.total} hero />
            <Stat label="Today" value={d?.today} sub="Since midnight, Walnut Creek time" />
            <Stat label="Busiest hour" value={peakHour != null && d?.hours[peakHour] ? hourLabel(peakHour) : '—'} sub="Across all quizzes" />
            <Stat label="Used a dietary filter" value={d ? dietPct : null} suffix="%" />
          </div>

          {table && d ? (
            <div className="hud overflow-x-auto rounded-md p-5 lg:col-span-7">
              <table className="w-full min-w-[480px] text-left text-sm">
                <caption className="mb-3 text-left font-display text-lg font-medium text-chrome">All dashboard numbers</caption>
                <thead className="text-chrome-dim">
                  <tr>
                    <th scope="col" className="py-2 font-semibold">Metric</th>
                    <th scope="col" className="py-2 text-right font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody className="t-tele text-chrome">
                  {d.hours.map((v, h) => (
                    <tr key={`h${h}`} className="border-t border-line">
                      <td className="py-1.5 font-sans">Quizzes, {hourLabel(h)} hour</td>
                      <td className="py-1.5 text-right">{v}</td>
                    </tr>
                  ))}
                  {d.daily.map((x) => (
                    <tr key={x.day} className="border-t border-line">
                      <td className="py-1.5 font-sans">Quizzes on {x.day}</td>
                      <td className="py-1.5 text-right">{x.count}</td>
                    </tr>
                  ))}
                  {d.flavors.map((f) => (
                    <tr key={f.id} className="border-t border-line">
                      <td className="py-1.5 font-sans">Matched {FLAVOR_BY_ID[f.id]?.name}</td>
                      <td className="py-1.5 text-right">{f.count}</td>
                    </tr>
                  ))}
                  {dietRows.map((r) => (
                    <tr key={r.key} className="border-t border-line">
                      <td className="py-1.5 font-sans">Asked for {r.label.toLowerCase()}</td>
                      <td className="py-1.5 text-right">{r.value}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Panel title="Quiz activity by hour" sub="All time, Walnut Creek time" className="lg:col-span-7">
              {d ? <HourColumns values={d.hours} label="Quizzes by hour of day" /> : <div className="h-[200px]" />}
            </Panel>
          )}

          {!table ? (
            <>
              <Panel title="Quizzes per day" sub="Last 14 days" className="lg:col-span-7">
                {d ? <DailyLine data={d.daily} label="Quizzes per day, last 14 days" /> : <div className="h-[200px]" />}
              </Panel>
              <Panel title="Top flavor matches" sub={`Out of ${FLAVORS.length} flavors`} className="lg:col-span-5">
                {d ? (
                  <BarList
                    rows={flavorRows}
                    renderLabel={(r) => (
                      <>
                        {r.id ? <Swatch flavorId={r.id} size={12} /> : <span className="inline-block h-3 w-3 rounded-full bg-white/15" aria-hidden="true" />}
                        <span className="truncate">{r.label}</span>
                      </>
                    )}
                  />
                ) : null}
              </Panel>
              <Panel title="Dietary needs" sub="Share of quizzes asking for each" className="lg:col-span-4">
                {d ? <BarList rows={dietRows} color="#50E3C2" max={100} format={(v) => `${v}%`} /> : null}
              </Panel>
              <Panel title="Latest matches" sub="Most recent first" className="lg:col-span-3">
                {d?.recent?.length ? (
                  <ul className="space-y-2.5" aria-live="polite">
                    {d.recent.slice(0, 6).map((r) => (
                      <li key={`${r.id}-${r.t}`} className="flex items-center gap-2 text-sm">
                        <Swatch flavorId={r.id} size={12} />
                        <span className="min-w-0 flex-1 truncate font-medium text-chrome">{FLAVOR_BY_ID[r.id]?.name}</span>
                        <span className="t-tele shrink-0 text-xs text-chrome-faint">{ago(r.t)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-chrome-dim">No quizzes yet. Take one above and you&apos;ll show up here.</p>
                )}
              </Panel>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
