'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Plus, RotateCcw } from 'lucide-react';
import { useStore, useMode, MAX_SCOOPS } from '@/lib/store';
import { FLAVOR_BY_ID, HERO_FLAVORS } from '@/lib/flavors';
import { openStatus, STORE } from '@/lib/config';
import { introState, whenSceneReady } from '@/lib/intro';
import { useInView, usePrefersReducedMotion } from './useInView';
import Decode from './Decode';

const GelatoCanvas = dynamic(() => import('@/components/canvas/GelatoCanvas'), { ssr: false });

export function Swatch({ flavorId, size = 18 }) {
  const f = FLAVOR_BY_ID[flavorId];
  if (!f) return null;
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full ring-1 ring-black/20"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 30%, ${f.look.colorB}, ${f.look.colorA} 62%, ${f.look.swirlAmt ? f.look.swirl : f.look.colorA})`,
      }}
    />
  );
}

const clockFmt = new Intl.DateTimeFormat('en-US', { timeZone: STORE.timeZone, hour: 'numeric', minute: '2-digit' });

/** Live store facts, set as a ruled spec list in the corner of the hero. */
function Telemetry() {
  const weather = useStore((s) => s.weather);
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);
  const status = now ? openStatus(now) : null;
  const rows = [
    ['Location', `${STORE.lat.toFixed(4)}° N, ${Math.abs(STORE.lon).toFixed(4)}° W`],
    ['Outside', weather ? `${weather.tempF}°F, ${weather.label}` : 'Walnut Creek, CA'],
    ['Local time', now ? clockFmt.format(now) : '--:--'],
    ['Counter', status ? status.label : 'Checking hours'],
  ];
  return (
    <dl className="w-[17.5rem] text-[0.8125rem]">
      {rows.map(([label, value], i) => (
        <div key={label} className="flex items-baseline justify-between gap-6 border-b border-[var(--hero-line)] py-2">
          <dt className="text-[var(--hero-ink-dim)]">{label}</dt>
          <dd className="t-tele flex items-center gap-2 text-right text-[var(--hero-ink)]">
            {label === 'Counter' && status ? (
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.open ? 'bg-mint' : 'bg-rose'}`} />
            ) : null}
            <Decode text={value} delay={i * 0.09} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Selector() {
  const scoops = useStore((s) => s.scoops);
  const selected = useStore((s) => s.selectedScoop);
  const setScoopFlavor = useStore((s) => s.setScoopFlavor);
  const addScoop = useStore((s) => s.addScoop);
  const restack = useStore((s) => s.restack);
  const activeId = selected ?? scoops[scoops.length - 1]?.id;
  const activeFlavor = scoops.find((s) => s.id === activeId)?.flavorId;
  const activeIndex = scoops.findIndex((s) => s.id === activeId);
  const full = scoops.length >= MAX_SCOOPS;

  return (
    <div className="w-full md:w-[17.5rem]">
      <p className="flex items-baseline justify-between text-[0.8125rem] text-[var(--hero-ink-dim)]">
        <span>
          Scoop {activeIndex + 1} of {scoops.length}
        </span>
        <span className="hidden md:inline">Tap a scoop to switch</span>
      </p>
      <ul
        className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 md:mx-0 md:block md:border-t md:border-[var(--hero-line)] md:px-0"
        role="group"
        aria-label="Flavor for the selected scoop"
      >
        {HERO_FLAVORS.map((id) => {
          const on = id === activeFlavor;
          return (
            <li key={id} className="shrink-0">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setScoopFlavor(id)}
                className={`flex h-10 w-full items-center gap-3 whitespace-nowrap rounded-[3px] border bg-[var(--hero-panel)] px-3 text-left text-[0.875rem] backdrop-blur-md transition-colors md:h-auto md:rounded-none md:border-0 md:border-b md:border-[var(--hero-line)] md:bg-transparent md:px-0 md:py-2 md:backdrop-blur-none ${
                  on
                    ? 'border-[var(--hero-ink)] text-[var(--hero-ink)]'
                    : 'border-[var(--hero-line)] text-[var(--hero-ink-dim)] hover:text-[var(--hero-ink)]'
                }`}
              >
                <Swatch flavorId={id} size={12} />
                <span>{FLAVOR_BY_ID[id].name.replace(' Sorbetto', '')}</span>
                <span aria-hidden="true" className={`t-tele ml-auto hidden text-xs md:inline ${on ? 'text-[var(--hero-ink)]' : 'text-transparent'}`}>
                  in scoop {activeIndex + 1}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex gap-5 text-[0.875rem] text-[var(--hero-ink)]">
        <button
          type="button"
          disabled={full}
          onClick={() => addScoop(activeFlavor ?? HERO_FLAVORS[0])}
          className="flex items-center gap-1.5 py-1 underline-offset-4 hover:underline disabled:opacity-40"
        >
          <Plus size={15} aria-hidden="true" />
          {full ? 'Coupe is full' : 'Add a scoop'}
        </button>
        <button type="button" onClick={restack} className="flex items-center gap-1.5 py-1 underline-offset-4 hover:underline">
          <RotateCcw size={14} aria-hidden="true" />
          Drop again
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Intro: wordmark widens while the scene loads → the coupe is "printed"     */
/* bottom-up by a scan beam → scoops fall in → type stretches into place.    */
/* ------------------------------------------------------------------------ */
function useIntro() {
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains('tf-intro')) return undefined;
    const quick = html.classList.contains('tf-intro-quick');
    const st = useStore.getState();
    introState.scan = 0;
    introState.dolly = 0;
    st.setScoopsDropped(false);
    st.setIntroDone(false);

    let tl = null;
    let done = false;
    let cancelled = false; // StrictMode runs effects twice in dev
    let skipRequested = false;
    const pre = document.getElementById('tf-preloader');
    const mark = pre?.querySelector('[data-mark]');

    const finish = () => {
      if (done) return;
      done = true;
      introState.scan = 1;
      introState.dolly = 1;
      if (pre) pre.style.display = 'none';
      html.classList.remove('tf-intro', 'tf-intro-quick');
      gsap.set('[data-intro]', { clearProps: 'opacity,transform,fontStretch,visibility' });
      const s = useStore.getState();
      s.setScoopsDropped(true);
      s.setIntroDone(true);
      window.__lenis?.start();
      try {
        sessionStorage.setItem('tf-intro-seen', '1');
      } catch {
        /* private mode */
      }
      removeSkip();
    };
    const skip = () => {
      skipRequested = true;
      if (tl) tl.progress(1);
      else finish();
    };
    const opts = { passive: true };
    const removeSkip = () => {
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => window.removeEventListener(ev, skip, opts));
    };
    // let the first frames settle before a stray scroll can skip it
    const armSkip = setTimeout(() => {
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => window.addEventListener(ev, skip, opts));
    }, 400);

    const run = async () => {
      if (mark && !quick) gsap.to(mark, { fontStretch: '86%', duration: 1.1, ease: 'power2.out' });
      try {
        await document.fonts?.ready;
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 0)); // let the quality tier settle
      const tier = useStore.getState().tier;
      await whenSceneReady(tier === 'none' ? 0 : quick ? 4000 : 8000);
      if (cancelled) return;
      if (skipRequested || done) {
        finish();
        return;
      }
      const S = quick ? 0.6 : 1;
      tl = gsap.timeline({ onComplete: finish });
      if (mark && !quick) {
        tl.to(mark, { fontStretch: '125%', duration: 0.75, ease: 'expo.inOut' })
          .to(pre, { opacity: 0, duration: 0.5, ease: 'power2.out' }, '+=0.12')
          .set(pre, { display: 'none' });
      } else if (pre) {
        tl.set(pre, { display: 'none' });
      }
      const t0 = Math.max(0, tl.duration() - 0.35);
      tl.to(introState, { scan: 1, duration: 1.9 * S, ease: 'power2.inOut' }, t0)
        .to(introState, { dolly: 1, duration: 3.4 * S, ease: 'expo.out' }, t0)
        .call(() => useStore.getState().setScoopsDropped(true), null, t0 + 1.3 * S)
        .fromTo(
          '[data-intro="line"]',
          { yPercent: 110, fontStretch: '62%', opacity: 1 },
          { yPercent: 0, fontStretch: '125%', duration: 1.6 * S, ease: 'expo.out', stagger: 0.12 },
          t0 + 0.95 * S,
        )
        .fromTo('[data-intro="ui"]', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9 * S, ease: 'power3.out', stagger: 0.07 }, t0 + 1.5 * S)
        .call(() => useStore.getState().triggerDecode(), null, t0 + 1.6 * S)
        .fromTo('header[data-intro]', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.8 * S, ease: 'power3.out' }, t0 + 1.8 * S)
        .call(() => window.__lenis?.start(), null, t0 + 2.0 * S);

      // design review aid: ?introAt=2.4 freezes the intro at that moment
      const at = Number(new URLSearchParams(window.location.search).get('introAt'));
      if (at > 0) {
        removeSkip();
        tl.seek(at, false).pause();
      }
    };
    run();

    return () => {
      cancelled = true;
      clearTimeout(armSkip);
      removeSkip();
      tl?.kill();
    };
  }, []);
}

export default function Hero() {
  const wrap = useRef(null);
  const overlay = useRef(null);
  const { near, visible } = useInView(wrap, { margin: '0px' });
  const reduce = usePrefersReducedMotion();
  const tier = useStore((s) => s.tier);
  const openPerk = useStore((s) => s.openPerk);
  const mode = useMode();
  useIntro();

  // Sticky hero: scroll progress through it drives the copy fade, the camera
  // push-in and the melt (read by the canvas from introState.exit).
  useEffect(() => {
    let raf = 0;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const update = () => {
      raf = 0;
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      // reduced motion: no melt or camera push, the copy simply fades
      introState.exit = calm ? 0 : p;
      const o = overlay.current;
      if (o) {
        const fade = 1 - Math.min(1, p / 0.32);
        o.style.opacity = fade.toFixed(3);
        o.style.transform = `translate3d(0, ${(-p * 90).toFixed(1)}px, 0)`;
        o.style.visibility = fade < 0.01 ? 'hidden' : '';
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const bg = mode === 'day' ? '#E4E8EE' : mode === 'rain' ? '#080B10' : '#0A0A0C';

  return (
    <section id="top" ref={wrap} data-mode={mode} className="relative h-[175svh]" aria-label="Build your scoop">
      <div className="sticky top-0 h-[100svh] min-h-[600px] w-full overflow-hidden" style={{ background: bg }}>
        <div className="absolute inset-0">
          {near && tier !== 'none' ? <GelatoCanvas active={visible} reducedMotion={reduce} /> : null}
          {tier === 'none' ? (
            <div className="absolute inset-0 bg-[radial-gradient(50%_55%_at_60%_55%,rgba(226,232,240,0.08),transparent_70%)]" />
          ) : null}
        </div>

        <div
          ref={overlay}
          className="pointer-events-none relative z-10 mx-auto flex h-full max-w-[1440px] flex-col px-4 pb-6 pt-20 will-change-transform md:px-8 md:pb-8 md:pt-24"
        >
          {/* top row: headline (left) · live store telemetry (right) */}
          <div className="flex items-start justify-between gap-10">
            <h1 className="t-display text-[var(--hero-ink)]" data-warp>
              <span className="block overflow-hidden pb-[0.08em]">
                <span className="block" data-intro="line">
                  Made this morning
                </span>
              </span>
              <span className="block overflow-hidden pb-[0.08em]">
                <span className="block" data-intro="line">
                  on Locust Street.
                </span>
              </span>
            </h1>
            <div className="hidden shrink-0 lg:block" data-intro="ui">
              <Telemetry />
            </div>
          </div>

          {/* bottom row: copy + actions (left) · scoop builder (right) */}
          <div className="mt-auto flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
            <div className="hidden md:block md:max-w-[24rem]">
              <p className="t-lede text-[var(--hero-ink-dim)]" data-intro="ui">
                {STORE.flavorCount} flavors churned in-house every day, with artisan chocolate and Groundwork coffee. Drag the coupe to turn it.
              </p>
              <div className="pointer-events-auto mt-6 flex flex-wrap gap-3" data-intro="ui">
                <a href="#game" className="btn btn-primary" data-magnetic>
                  Find my flavor
                </a>
                <a href="#flavors" className="btn btn-ghost" data-magnetic>
                  Today&apos;s menu
                </a>
              </div>
            </div>
            <div className="pointer-events-auto" data-intro="ui">
              <Selector />
            </div>
            <div className="pointer-events-auto flex gap-3 md:hidden" data-intro="ui">
              <a href="#game" className="btn btn-primary flex-1 justify-center">
                Find my flavor
              </a>
              <a href="#flavors" className="btn btn-ghost flex-1 justify-center">
                Today&apos;s menu
              </a>
            </div>
          </div>

          {/* keyboard / screen-reader route to the hidden LaMa */}
          <button type="button" className="sr-only pointer-events-auto focus:not-sr-only focus:mt-2 focus:text-[var(--hero-ink)]" onClick={openPerk}>
            Find the hidden LaMa
          </button>
        </div>
      </div>
    </section>
  );
}
