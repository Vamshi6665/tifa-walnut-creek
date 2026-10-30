'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { FLAVORS, FLAVOR_BY_ID, MOODS, moodPicks, tasteTwins, topTraits, TRAIT_WORDS } from '@/lib/flavors';
import { flavorPhoto } from '@/content/media';
import Photo from './Photo';
import { useTwinNotes } from '@/lib/aiNotes';
import { useStore } from '@/lib/store';
import { storeNow } from '@/lib/config';
import SafeBoundary from './SafeBoundary';
import { useInView, usePrefersReducedMotion } from './useInView';
import { Swatch } from './Hero';

const FlavorConstellation = dynamic(() => import('@/components/canvas/FlavorConstellation'), { ssr: false });



function FridayDrop() {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const { dayIndex, hour, minute } = storeNow(now);
      const sec = now.getSeconds();
      let days = (5 - dayIndex + 7) % 7;
      const nowSec = hour * 3600 + minute * 60 + sec;
      if (days === 0 && nowSec >= 11 * 3600) days = 7;
      setLeft(days * 86400 + 11 * 3600 - nowSec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (left == null) return null;
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pad = (x) => String(x).padStart(2, '0');
  return (
    <p className="inline-flex flex-wrap items-center gap-3 rounded-[3px] border border-line px-4 py-2 text-sm">
      <span className="font-semibold text-ink">New flavor drops Friday at 11 AM</span>
      <span className="t-tele text-green-ink" aria-label={`${d} days ${h} hours ${m} minutes left`}>
        {d}d {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </p>
  );
}

function Tags({ flavor, className = '' }) {
  const badges = [];
  if (flavor.signature) badges.push(['Signature', 'Tifa signature flavor', 'border-ink/40 text-ink']);
  if (flavor.tags.vegan) badges.push(['V', 'Vegan', 'border-green/30 text-green-ink']);
  if (flavor.tags.dairyFree) badges.push(['DF', 'Dairy-free', 'border-green/30 text-green-ink']);
  if (flavor.noSugar) badges.push(['No sugar', 'No sugar added', 'border-green/30 text-green-ink']);
  const contains = Object.entries(flavor.contains).filter(([, v]) => v).map(([k]) => k);
  if (!badges.length && !contains.length) return null;
  return (
    <span className={`flex flex-wrap items-center gap-1 ${className}`}>
      {badges.map(([short, title, cls]) => (
        <abbr key={short} title={title} className={`rounded-[3px] border px-1.5 py-0.5 text-[0.7rem] font-medium no-underline ${cls}`}>
          {short}
        </abbr>
      ))}
      {contains.length ? <span className="text-[0.72rem] text-ink-faint">Contains {contains.join(', ')}</span> : null}
    </span>
  );
}

export default function FlavorsSection() {
  const stage = useRef(null);
  const { near, visible } = useInView(stage);
  const reduce = usePrefersReducedMotion();
  const tier = useStore((s) => s.tier);
  const focus = useStore((s) => s.twinFocus);
  const setFocus = useStore((s) => s.setTwinFocus);
  const moodHighlight = useStore((s) => s.moodHighlight);
  const hover = useStore((s) => s.twinHover);
  const focusLabel = useRef(null);
  const hoverLabel = useRef(null);
  const labels = useMemo(() => ({ focus: focusLabel, hover: hoverLabel }), []);
  const setMoodHighlight = useStore((s) => s.setMoodHighlight);
  const [mood, setMood] = useState(null);

  const flavor = FLAVOR_BY_ID[focus];
  const twins = useMemo(() => tasteTwins(focus, 4), [focus]);
  const notes = useTwinNotes(
    focus,
    twins.map((t) => t.flavor.id),
  );

  const gelato = FLAVORS.filter((f) => f.kind === 'gelato');
  const sorbetto = FLAVORS.filter((f) => f.kind === 'sorbetto');

  const pickMood = (id) => {
    if (mood === id) {
      setMood(null);
      setMoodHighlight([]);
      return;
    }
    setMood(id);
    setMoodHighlight(moodPicks(id, 3));
  };

  return (
    <section id="flavors" className="relative scroll-mt-16 bg-paper pt-24 md:pt-32" aria-labelledby="flavors-title">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <h2 id="flavors-title" className="t-h2 md:col-span-7" data-warp>
            Every flavor has a twin.
          </h2>
          <div className="md:col-span-5">
            <p className="t-body text-ink-dim">
              Each point is one of today&apos;s {FLAVORS.length} flavors, placed by taste. Close together means they taste alike.
              Pick one to light up its four nearest neighbors.
            </p>
            <div className="mt-5">
              <FridayDrop />
            </div>
          </div>
        </div>
      </div>

      <div id="twins" className="mx-auto mt-10 grid max-w-[1440px] gap-6 px-4 md:px-8 lg:grid-cols-12">
        {/* constellation */}
        <div ref={stage} className="relative h-[62vh] min-h-[420px] overflow-hidden on-green rounded-lg border border-line bg-[radial-gradient(80%_70%_at_50%_45%,#17583d,#0B3322)] lg:col-span-8 lg:h-[680px]">
          {near && tier !== 'none' ? <SafeBoundary><FlavorConstellation active={visible} reducedMotion={reduce} labels={labels} /></SafeBoundary> : null}
          {/* labels pinned to 3D points by <Anchor> inside the canvas */}
          <div ref={focusLabel} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-10 opacity-0 transition-opacity duration-300">
            <span className="block -translate-x-1/2 -translate-y-[calc(100%+20px)] whitespace-nowrap rounded-[3px] bg-ink px-2.5 py-1 text-xs font-medium text-paper shadow-[0_0_24px_rgba(127,224,174,0.45)]">
              {flavor.name}
            </span>
          </div>
          <div ref={hoverLabel} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-20 opacity-0 transition-opacity duration-200">
            {hover && hover !== focus ? (
              <div className="holo -translate-x-1/2 -translate-y-[calc(100%+22px)] whitespace-nowrap rounded-md px-3 py-2 text-sm">
                <p className="font-medium text-ink">{FLAVOR_BY_ID[hover].name}</p>
                <p className="text-xs text-ink-dim">
                  {twins.some((t) => t.flavor.id === hover) ? (
                    <>
                      <span className="t-tele text-green-ink">{Math.round(twins.find((t) => t.flavor.id === hover).score * 100)}%</span> twin of {flavor.name}
                    </>
                  ) : (
                    'Click to see its twins'
                  )}
                </p>
              </div>
            ) : null}
          </div>
          <p className="pointer-events-none absolute bottom-4 left-5 text-sm text-ink-faint">
            Drag sideways to turn the map. Click any point.
          </p>
        </div>

        {/* panel */}
        <div className="flex flex-col gap-5 lg:col-span-4">
          <div className="rounded-lg border border-line p-5 md:p-6">
            <label htmlFor="twin-select" className="text-sm font-medium text-ink-dim">
              Pick a flavor you love
            </label>
            <select
              id="twin-select"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-line bg-paper-2 px-4 text-base font-medium text-ink"
            >
              {FLAVORS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {flavorPhoto(focus) ? (
              <Photo src={flavorPhoto(focus)} alt={flavor.name} className="mt-4 aspect-[4/3] rounded-md" sizes="(min-width: 1024px) 28vw, 100vw" />
            ) : null}
            <div className="mt-4 flex items-center gap-3">
              <Swatch flavorId={focus} size={36} />
              <div>
                <p className="t-h3 text-ink">{flavor.name}</p>
                <p className="text-sm text-ink-dim">
                  {topTraits(focus, 3).map((t) => TRAIT_WORDS[t]).join(', ')}
                </p>
              </div>
              <Tags flavor={flavor} className="ml-auto" />
            </div>

            <h3 className="mt-6 text-sm font-medium text-ink-dim">Its closest taste twins</h3>
            <ol className="mt-3 space-y-3" aria-live="polite">
              {twins.map(({ flavor: f, score }) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setFocus(f.id)}
                    className="group flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-ink/[0.04]"
                  >
                    <Swatch flavorId={f.id} size={22} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-ink group-hover:text-ink">{f.name}</span>
                        <span className="t-tele text-sm text-green-ink">{Math.round(score * 100)}%</span>
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-ink-dim">
                        {notes[f.id]?.source === 'ai' ? <Sparkles size={12} className="mr-1 inline text-green-ink" aria-label="AI note" /> : null}
                        {notes[f.id]?.text}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg border border-line p-5 md:p-6">
            <h3 className="text-sm font-medium text-ink-dim">Or start from a craving</h3>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Cravings">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={mood === m.id}
                  onClick={() => pickMood(m.id)}
                  className={`h-10 rounded-[3px] border px-4 text-sm font-medium transition-colors ${
                    mood === m.id ? 'border-green bg-green text-paper' : 'border-line text-ink hover:border-ink'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {mood ? (
              <ul className="mt-4 flex flex-wrap gap-2" aria-live="polite">
                {moodHighlight.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setFocus(id)}
                      className="flex h-10 items-center gap-2 rounded-[3px] bg-ink/[0.06] px-3 pr-4 text-sm font-medium text-ink hover:bg-ink/10"
                    >
                      <Swatch flavorId={id} /> {FLAVOR_BY_ID[id].name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {/* full menu: the accessible, scannable version of the constellation */}
      <div className="mx-auto mt-16 max-w-[1440px] px-4 pb-8 md:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-4">
          <h3 className="t-h3">Today&apos;s menu</h3>
          <p className="text-sm text-ink-dim">
            V vegan, DF dairy-free. Allergen notes are from our menu; please confirm with our team in store.
          </p>
        </div>
        <div className="mt-6 grid gap-10 md:grid-cols-3">
          {[
            ['Gelato', gelato],
            ['Sorbetto', sorbetto],
          ].map(([title, list]) => (
            <div key={title} className={title === 'Gelato' ? 'md:col-span-2' : ''}>
              <h4 className="mb-3 text-sm font-medium text-ink-dim">
                {title} <span className="t-tele text-ink-faint">{list.length}</span>
              </h4>
              <ul className={`grid gap-x-8 ${title === 'Gelato' ? 'sm:grid-cols-2' : ''}`}>
                {list.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFocus(f.id);
                        document.getElementById('twins')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
                      }}
                      className={`flex w-full items-center gap-3 border-b border-line/60 py-3 text-left transition-colors hover:text-ink ${
                        f.id === focus ? 'text-ink' : 'text-ink'
                      }`}
                    >
                      <Swatch flavorId={f.id} />
                      <span className="font-medium">{f.name}</span>
                      <Tags flavor={f} className="ml-auto" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
