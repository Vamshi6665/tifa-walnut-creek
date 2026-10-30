'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Star } from 'lucide-react';
import { useStore, useMode } from '@/lib/store';
import { FLAVOR_BY_ID } from '@/lib/flavors';
import { openStatus, STORE } from '@/lib/config';
import { introState, whenSceneReady } from '@/lib/intro';
import { useReviews } from '@/lib/reviews';
import { MEDIA, photo, cutouts, llamaCutout } from '@/content/media';
import { useInView, usePrefersReducedMotion } from './useInView';
import Decode from './Decode';
import SafeBoundary from './SafeBoundary';

const HeroStage = dynamic(() => import('@/components/canvas/HeroStage'), { ssr: false });

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
    ['Address', STORE.address],
    ['Outside', weather ? `${weather.tempF}°F, ${weather.label}` : 'Walnut Creek, CA'],
    ['Local time', now ? clockFmt.format(now) : '--:--'],
    ['Today', status ? status.label : 'Checking hours'],
  ];
  return (
    <dl className="w-[17.5rem] text-[0.8125rem]">
      {rows.map(([label, value], i) => (
        <div key={label} className="flex items-baseline justify-between gap-6 border-b border-[var(--hero-line)] py-2">
          <dt className="text-[var(--hero-ink-dim)]">{label}</dt>
          <dd className="t-tele flex items-center gap-2 text-right text-[var(--hero-ink)]">
            {label === 'Today' && status ? (
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.open ? 'bg-green' : 'bg-green'}`} />
            ) : null}
            <Decode text={value} delay={i * 0.09} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Bottom-right: what's in the photo, the live Google rating, and catering. */
function Aside({ caseFlavors }) {
  const reviews = useReviews();
  const rating = reviews?.rating ?? Number(STORE.rating);
  const count = reviews?.count;
  return (
    <div className="w-full text-[0.875rem] md:w-[17.5rem]">
      {caseFlavors.length ? (
        <>
          <p className="text-[0.8125rem] text-[var(--hero-ink-dim)]">In the case today</p>
          <ul className="mt-2 border-t border-[var(--hero-line)]">
            {caseFlavors.map((f) => (
              <li key={f.id} className="flex items-center gap-3 border-b border-[var(--hero-line)] py-2 text-[var(--hero-ink)]">
                <Swatch flavorId={f.id} size={12} />
                {f.name}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="mt-3 flex flex-col gap-2 text-[var(--hero-ink)]">
        <a href="#reviews" className="flex items-center gap-2 underline-offset-4 hover:underline">
          <Star size={14} aria-hidden="true" className="fill-current" />
          {rating.toFixed(1)} on Google{count ? `, ${count.toLocaleString('en-US')} reviews` : ''}
        </a>
        <a href="#catering" className="underline-offset-4 hover:underline">
          Plan catering with Naina
        </a>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Intro: the Tifa logo drops in and lands while the page loads → the screen */
/* slides down to reveal the store → the gelato pops in → type stretches in. */
/* ------------------------------------------------------------------------ */
function useIntro() {
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains('tf-intro')) return undefined;
    const quick = html.classList.contains('tf-intro-quick');
    const st = useStore.getState();
    introState.scan = 1;
    introState.dolly = 0;
    st.setScoopsDropped(false);
    st.setIntroDone(false);

    let tl = null;
    let done = false;
    let cancelled = false; // StrictMode runs effects twice in dev
    let skipRequested = false;
    const pre = document.getElementById('tf-preloader');
    const mark = pre?.querySelector('[data-mark]');
    const edge = pre?.querySelector('[data-edge]');

    const opts = { passive: true };
    const removeSkip = () => {
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => window.removeEventListener(ev, skip, opts));
    };
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
    function skip() {
      skipRequested = true;
      if (tl) tl.progress(1);
      else finish();
    }
    const armSkip = setTimeout(() => {
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => window.addEventListener(ev, skip, opts));
    }, 400);

    const run = async () => {
      // the logo falls in and lands with a little weight while the page loads
      if (mark && !quick) {
        gsap
          .timeline()
          .fromTo(mark, { yPercent: -420, opacity: 1 }, { yPercent: 0, duration: 0.7, ease: 'power3.in' })
          .fromTo(mark, { scaleY: 0.86, scaleX: 1.08 }, { scaleY: 1, scaleX: 1, duration: 0.9, ease: 'elastic.out(1, 0.45)', transformOrigin: '50% 100%' });
      }
      try {
        await document.fonts?.ready;
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 0)); // let the quality tier settle
      const tier = useStore.getState().tier;
      await Promise.all([whenSceneReady(tier === 'none' ? 0 : quick ? 4000 : 8000), new Promise((r) => setTimeout(r, quick ? 0 : 1500))]);
      if (cancelled) return;
      if (skipRequested || done) {
        finish();
        return;
      }
      const S = quick ? 0.6 : 1;
      tl = gsap.timeline({ onComplete: finish });
      if (pre && !quick) {
        // the screen slides down and off, revealing the store behind it
        tl.set(edge, { opacity: 1 })
          .to(pre, { yPercent: 100, duration: 1.25, ease: 'expo.inOut' })
          .set(pre, { display: 'none' });
      } else if (pre) {
        tl.set(pre, { display: 'none' });
      }
      const t0 = quick ? 0 : 0.35;
      tl.to(introState, { dolly: 1, duration: 3 * S, ease: 'expo.out' }, t0)
        .call(() => useStore.getState().setScoopsDropped(true), null, t0 + 0.85 * S)
        .fromTo(
          '[data-intro="line"]',
          { yPercent: 110, fontStretch: '62%', opacity: 1 },
          { yPercent: 0, fontStretch: '125%', duration: 1.5 * S, ease: 'expo.out', stagger: 0.12 },
          t0 + 0.7 * S,
        )
        .fromTo('[data-intro="ui"]', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9 * S, ease: 'power3.out', stagger: 0.07 }, t0 + 1.15 * S)
        .call(() => useStore.getState().triggerDecode(), null, t0 + 1.25 * S)
        .fromTo('header[data-intro]', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.8 * S, ease: 'power3.out' }, t0 + 1.35 * S)
        .call(() => window.__lenis?.start(), null, t0 + 1.5 * S);

      // design review aid: ?introAt=1.2 freezes the intro at that moment
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

  const hero = photo('hero');
  const items = cutouts().slice(0, 3);
  const caseFlavors = items.map((c) => FLAVOR_BY_ID[c.id]).filter(Boolean);
  const llama = llamaCutout();

  // Sticky hero: scroll progress through it drives the copy fade, the photo
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

  return (
    <section id="top" ref={wrap} data-mode="night" className="relative h-[175svh]" aria-label="Tifa Chocolate & Gelato, Walnut Creek">
      <div className="sticky top-0 h-[100svh] min-h-[600px] w-full overflow-hidden bg-paper">
        <div className="absolute inset-0">
          {near && tier !== 'none' ? (
            <SafeBoundary
              onError={() => {
                introState.ready = true; // don't hold the intro for a scene that can't render
              }}
              fallback={
                // eslint-disable-next-line @next/next/no-img-element
                hero ? <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /> : null
              }
            >
              <HeroStage hero={hero} cutouts={items} llama={llama} active={visible} reducedMotion={reduce} />
            </SafeBoundary>
          ) : null}
          {tier === 'none' && hero ? (
            // no WebGL: the same photo as a plain image
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          ) : null}
          {MEDIA.showPlaceholders && (!hero || !items.length) ? (
            <div className="t-tele pointer-events-none absolute right-6 top-1/2 max-w-[18rem] -translate-y-1/2 text-[0.72rem] leading-relaxed text-ink-faint md:right-[24%]">
              {!hero ? <p>Add hero photo: public/photos/hero.jpg</p> : null}
              {!items.length ? <p className="mt-2">Add 1 to 3 gelato cutouts (transparent PNG): public/photos/cutouts/</p> : null}
            </div>
          ) : null}
        </div>

        <div
          ref={overlay}
          className="pointer-events-none relative z-10 mx-auto flex h-full max-w-[1440px] flex-col px-4 pb-6 pt-20 will-change-transform md:px-8 md:pb-8 md:pt-24"
        >
          {/* top row: headline (left) · live store facts (right) */}
          <div className="flex items-start justify-between gap-10">
            <h1 className="t-display text-ink" data-warp>
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

          {/* bottom row: copy + actions (left) · case, rating, catering (right) */}
          <div className="mt-auto flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
            <div className="md:max-w-[26rem]">
              <p className="t-lede hidden text-ink-dim md:block" data-intro="ui">
                {STORE.flavorCount} flavors of gelato and sorbetto made in-house every day, artisan chocolates, and Groundwork coffee. Next to the
                Lesher Center.
              </p>
              <div className="pointer-events-auto mt-6 flex flex-wrap gap-3" data-intro="ui">
                <a href="#game" className="btn btn-primary" data-magnetic>
                  Find my flavor
                </a>
                <a href="#flavors" className="btn btn-ghost" data-magnetic>
                  Today&apos;s flavors
                </a>
              </div>
            </div>
            <div className="pointer-events-auto hidden md:block" data-intro="ui">
              <Aside caseFlavors={caseFlavors} />
            </div>
          </div>

          {/* keyboard / screen-reader route to the hidden LaMa */}
          <button type="button" className="sr-only pointer-events-auto focus:not-sr-only focus:mt-2 focus:text-ink" onClick={openPerk}>
            Find the hidden LaMa
          </button>
        </div>
      </div>
    </section>
  );
}
