'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star, CloudSun } from 'lucide-react';
import { useStore } from '@/lib/store';
import { FLAVOR_BY_ID } from '@/lib/flavors';
import { openStatus, STORE } from '@/lib/config';
import { useReviews } from '@/lib/reviews';
import { CUTOUTS, TRUFFLES, BRAND } from '@/content/photos';
import Cutout from './Cutout';

export function Swatch({ flavorId, size = 18 }) {
  const f = FLAVOR_BY_ID[flavorId];
  if (!f) return null;
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full ring-1 ring-black/10"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 30%, ${f.look.colorB}, ${f.look.colorA} 62%, ${f.look.swirlAmt ? f.look.swirl : f.look.colorA})`,
      }}
    />
  );
}

/** Open status + weather + rating, as a row of small chips under the buttons. */
function StoreChips() {
  const weather = useStore((s) => s.weather);
  const reviews = useReviews();
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const tick = () => setStatus(openStatus());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  const rating = reviews?.rating ?? Number(STORE.rating);
  const chip = 'inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-paper/80 px-3.5 text-[0.8125rem] font-medium text-ink backdrop-blur';
  return (
    <ul className="flex flex-wrap gap-2">
      <li className={chip}>
        <span className="relative flex h-2 w-2" aria-hidden="true">
          {status?.open ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-50 motion-reduce:hidden" /> : null}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${status?.open ? 'bg-green' : 'bg-ink-faint'}`} />
        </span>
        <span className="t-tele">{status ? status.label : 'Open daily from 11 AM'}</span>
      </li>
      <li>
        <a href="#reviews" className={`${chip} hover:border-ink/40`}>
          <Star size={14} aria-hidden="true" className="fill-[#E9A23B] text-[#E9A23B]" />
          <span className="t-tele">{rating.toFixed(1)}</span>
          <span>on Google</span>
        </a>
      </li>
      {weather ? (
        <li className={`${chip} hidden sm:inline-flex`}>
          <CloudSun size={15} aria-hidden="true" className="text-green-ink" />
          <span className="t-tele">{weather.tempF}°F</span>
          <span>in Walnut Creek</span>
        </li>
      ) : null}
    </ul>
  );
}

/* ------------------------------------------------------------------------ */
/* Intro: the Tifa sticker drops onto teal while the page loads, the screen  */
/* slides away, then the cups fall onto the ledge one by one and land with   */
/* a little squash. Skippable with any input; off with reduced motion.       */
/* ------------------------------------------------------------------------ */
function useIntro(root) {
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains('tf-intro')) return undefined;
    const quick = html.classList.contains('tf-intro-quick');
    const pre = document.getElementById('tf-preloader');
    const mark = pre?.querySelector('[data-mark]');
    let tl = null;
    let done = false;
    let cancelled = false;
    const opts = { passive: true };

    const finish = () => {
      if (done) return;
      done = true;
      if (pre) pre.style.display = 'none';
      html.classList.remove('tf-intro', 'tf-intro-quick');
      gsap.set(root.current?.querySelectorAll('[data-intro], [data-drop]') ?? [], { clearProps: 'opacity,transform,visibility' });
      gsap.set('header[data-intro]', { clearProps: 'opacity,transform' });
      useStore.getState().setIntroDone(true);
      window.__lenis?.start();
      try {
        sessionStorage.setItem('tf-intro-seen', '1');
      } catch {
        /* private mode */
      }
      removeSkip();
    };
    function skip() {
      if (tl) tl.progress(1);
      else finish();
    }
    function removeSkip() {
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => window.removeEventListener(ev, skip, opts));
    }
    const armSkip = setTimeout(() => {
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => window.addEventListener(ev, skip, opts));
    }, 400);

    const run = async () => {
      if (mark && !quick) {
        gsap
          .timeline()
          .fromTo(mark, { yPercent: -420, rotate: -30 }, { yPercent: 0, rotate: -8, duration: 0.75, ease: 'power3.in' })
          .fromTo(mark, { scaleY: 0.84, scaleX: 1.1 }, { scaleY: 1, scaleX: 1, duration: 0.9, ease: 'elastic.out(1, 0.45)', transformOrigin: '50% 100%' });
      }
      try {
        await document.fonts?.ready;
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, quick ? 0 : 1300));
      if (cancelled) return;
      const el = root.current;
      if (!el) return finish();
      const S = quick ? 0.6 : 1;
      tl = gsap.timeline({ onComplete: finish });
      if (pre && !quick) {
        tl.to(pre, { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }).set(pre, { display: 'none' });
      } else if (pre) {
        tl.set(pre, { display: 'none' });
      }
      const t0 = quick ? 0 : 0.45;
      const drops = el.querySelectorAll('[data-drop]');
      drops.forEach((d, i) => {
        const at = t0 + 0.25 * S + i * 0.16 * S;
        tl.fromTo(d, { y: () => -window.innerHeight * 1.15, opacity: 1 }, { y: 0, duration: 0.75 * S, ease: 'power2.in' }, at).fromTo(
          d,
          { scaleY: 0.86, scaleX: 1.08 },
          { scaleY: 1, scaleX: 1, duration: 0.9, ease: 'elastic.out(1, 0.4)', transformOrigin: '50% 100%' },
          at + 0.75 * S,
        );
      });
      tl.fromTo(el.querySelectorAll('[data-intro="line"]'), { yPercent: 105, opacity: 1 }, { yPercent: 0, duration: 1.2 * S, ease: 'expo.out', stagger: 0.1 }, t0 + 0.1)
        .fromTo(el.querySelectorAll('[data-intro="ui"]'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8 * S, ease: 'power3.out', stagger: 0.07 }, t0 + 0.55 * S)
        .fromTo(el.querySelectorAll('[data-intro="pop"]'), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(2)', stagger: 0.08 }, t0 + 0.9 * S)
        .fromTo('header[data-intro]', { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, t0 + 0.8 * S)
        .call(() => window.__lenis?.start(), null, t0 + 1.2 * S);
    };
    run();
    return () => {
      cancelled = true;
      clearTimeout(armSkip);
      removeSkip();
      tl?.kill();
    };
  }, [root]);
}

/* Scroll: as the hero leaves, the cups lift off the ledge on curved paths:
   the left cup floats up and away, the right one sinks down toward the next
   section, the middle one rises and tips. Truffles drift at their own speeds. */
function useHeroScroll(root) {
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const st = { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.6 };
      const path = (sel, pts, extra = {}) => {
        const node = el.querySelector(sel);
        if (!node) return;
        // a gentle arc: x moves linearly, y follows an ease so the motion curves
        gsap.to(node, { keyframes: pts, ease: 'none', scrollTrigger: st, ...extra });
      };
      path('[data-float="left"]', [
        { x: -30, y: -90, rotate: -6, duration: 1 },
        { x: -120, y: -340, rotate: -16, duration: 1 },
      ]);
      path('[data-float="center"]', [
        { x: 30, y: -40, rotate: 4, duration: 1 },
        { x: 40, y: -200, rotate: 10, duration: 1 },
      ]);
      path('[data-float="right"]', [
        { x: 50, y: 60, rotate: 8, duration: 1 },
        { x: 10, y: 300, rotate: 18, duration: 1 },
      ]);
      el.querySelectorAll('[data-drift]').forEach((n) => {
        const k = Number(n.dataset.drift);
        gsap.to(n, { y: -260 * k, rotate: 90 * k, ease: 'none', scrollTrigger: st });
      });
      gsap.to(el.querySelector('[data-sticker]'), { rotate: 140, y: -120, ease: 'none', scrollTrigger: st });
      gsap.to(el.querySelector('[data-copy]'), { y: -80, opacity: 0.2, ease: 'none', scrollTrigger: { ...st, start: 'top top', end: '70% top' } });
    }, el);
    return () => ctx.revert();
  }, [root]);
}

function Wainscot({ className = '' }) {
  return (
    <div aria-hidden="true" className={`wainscot absolute inset-x-0 bottom-0 -z-10 ${className}`}>
      <div className="absolute inset-x-0 -top-[14px] h-[14px] bg-[linear-gradient(180deg,#f4f1ea,#dde3d8)] shadow-[0_8px_14px_-8px_rgb(42_31_27/0.4)]" />
    </div>
  );
}

export default function Hero() {
  const root = useRef(null);
  const openPerk = useStore((s) => s.openPerk);
  useIntro(root);
  useHeroScroll(root);

  return (
    <section
      id="top"
      ref={root}
      className="relative isolate overflow-hidden bg-paper md:h-[max(100svh,720px)]"
      aria-label="Tifa Chocolate & Gelato, Walnut Creek"
    >
      {/* the wall: warm white, lit from the pendant lamps */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(55%_50%_at_74%_16%,#fff6e6,transparent_70%),linear-gradient(180deg,#fffdf9,#f8f3ec)]" />
      {/* the sage wainscot + ledge, like the lower wall in the shop */}
      <Wainscot className="hidden h-[26%] md:block" />

      {/* pendant lamps over the counter */}
      <div aria-hidden="true" className="pointer-events-none absolute right-[4%] top-0 hidden h-full w-[46%] md:block">
        {[
          ['18%', '13vh'],
          ['54%', '6vh'],
          ['88%', '16vh'],
        ].map(([left, len]) => (
          <div key={left} className="absolute top-0" style={{ left }}>
            <div className="mx-auto w-px bg-ink/25" style={{ height: len }} />
            <div className="relative h-[24px] w-[15px] -translate-x-[7px] rounded-b-full rounded-t-[4px] bg-[linear-gradient(180deg,#c9973f,#f9dc9a)] shadow-[0_0_46px_18px_rgb(249_220_154/0.38)]" />
          </div>
        ))}
      </div>

      {/* copy */}
      <div className="relative z-10 mx-auto max-w-[1440px] px-5 pt-28 md:absolute md:inset-x-0 md:bottom-[26%] md:top-0 md:flex md:items-center md:px-8 md:pt-16">
        <div data-copy className="md:w-[50%] lg:w-[47%]">
          <p className="t-eyebrow" data-intro="ui">
            Walnut Creek · 1545 Locust St
          </p>
          <h1 className="t-display mt-5 text-ink">
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="block" data-intro="line">
                Made this morning
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.14em]">
              <span className="block" data-intro="line">
                on <span className="t-accent">Locust Street.</span>
              </span>
            </span>
          </h1>
          <p className="t-lede mt-5 text-ink-dim" data-intro="ui">
            {STORE.flavorCount} flavors of gelato and sorbetto made in-house every day, artisan chocolates and Groundwork coffee. Next to the
            Lesher Center.
          </p>
          <div className="mt-8 flex flex-wrap gap-3" data-intro="ui">
            <a href="#game" className="btn btn-primary">
              Find my flavor
            </a>
            <a href="#flavors" className="btn btn-ghost">
              Today&apos;s flavors
            </a>
          </div>
          <div className="mt-6" data-intro="ui">
            <StoreChips />
          </div>
          {/* keyboard / screen-reader route to the LaMa perk */}
          <button type="button" className="sr-only focus:not-sr-only focus:mt-3 focus:text-ink" onClick={openPerk}>
            Find the hidden LaMa
          </button>
        </div>
      </div>

      {/* the counter: three real cups on the ledge */}
      <div className="relative mt-2 h-[44svh] min-h-[320px] md:absolute md:bottom-[26%] md:right-[max(2vw,calc((100vw-1440px)/2))] md:top-[8%] md:mt-0 md:h-auto md:min-h-0 md:w-[50%]">
        <Wainscot className="h-[34%] md:hidden" />
        {/* soft halo behind the cups */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-[34%] top-0 flex items-end justify-center overflow-hidden md:bottom-0 md:top-[-20%]">
          <div
            data-intro="pop"
            className="aspect-square w-[min(92vw,440px)] shrink-0 translate-y-1/2 rounded-full bg-[radial-gradient(circle,#fbdcd2_0,#fbe4de_50%,rgb(251_228_222/0)_70%)] md:w-[min(50vw,700px)]"
          />
        </div>
        {/* sticker, slapped on the wall */}
        <div data-sticker className="absolute right-[6%] top-[0%] z-0 md:right-[4%] md:top-[2%]">
          <div data-intro="pop">
            <Image
              src={BRAND.roundel}
              alt=""
              width={1024}
              height={1024}
              priority
              sizes="140px"
              className="h-[clamp(72px,9vw,136px)] w-auto rotate-[-12deg] drop-shadow-[0_14px_18px_rgb(31_43_42/0.25)]"
            />
          </div>
        </div>
        {/* truffles drifting in the air */}
        {[
          { t: TRUFFLES[0], cls: 'left-[7%] top-[22%] md:left-[6%] md:top-[30%]', s: 'clamp(44px,5.4vw,80px)', k: 1.1, r: '-14deg' },
          { t: TRUFFLES[2], cls: 'left-[34%] top-[10%] md:left-[44%] md:top-[4%]', s: 'clamp(36px,4vw,62px)', k: 0.7, r: '18deg' },
          { t: TRUFFLES[4], cls: 'right-[4%] top-[36%] md:right-[-1%] md:top-[40%]', s: 'clamp(40px,4.4vw,66px)', k: 1.4, r: '8deg' },
        ].map(({ t, cls, s, k, r }) => (
          <div key={t.src} data-drift={k} className={`absolute z-30 ${cls}`}>
            <div data-intro="pop">
              <div className="bob" style={{ '--r': r, animationDelay: `${k * -2}s` }}>
                <Cutout img={t} h={s} sizes="80px" alt="" className="rounded-full" />
              </div>
            </div>
          </div>
        ))}

        {/* the cups: bottoms sit on the ledge line */}
        <div className="absolute inset-x-0 bottom-[calc(34%-10px)] flex items-end justify-center md:bottom-[-12px]">
          <div data-float="left" className="relative z-10 -mr-[6%]">
            <div data-drop>
              <Cutout img={CUTOUTS.chocolate} h="clamp(118px, 19svh, 380px)" priority sizes="(min-width: 768px) 20vw, 30vw" className="md:!h-[clamp(190px,30svh,350px)]" />
            </div>
          </div>
          <div data-float="center" className="relative z-20">
            <div data-drop>
              <Cutout img={CUTOUTS.pomegranate} h="clamp(140px, 23svh, 460px)" priority sizes="(min-width: 768px) 30vw, 46vw" className="md:!h-[clamp(220px,37svh,420px)]" />
            </div>
          </div>
          <div data-float="right" className="relative z-10 -ml-[5%]">
            <div data-drop>
              <Cutout img={CUTOUTS.pinkGuava} h="clamp(120px, 19.5svh, 390px)" priority sizes="(min-width: 768px) 20vw, 30vw" className="md:!h-[clamp(195px,31svh,360px)]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
