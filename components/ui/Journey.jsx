'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PHOTOS, CUTOUTS } from '@/content/photos';
import { STORE } from '@/lib/config';
import Cutout from './Cutout';
import { usePrefersReducedMotion } from './useInView';

/**
 * "From our kitchen to your cup": a Tifa cup rides down a dotted curve (the
 * dotted ring from the sticker, stretched into a path) as you scroll. The
 * section pins; a camera follows the cup down the wall; at each stop the cup
 * pauses and a real photo from the shop is pinned up next to it.
 */

const STOPS = [
  {
    kicker: 'Every morning',
    title: 'Churned in-house, in small batches.',
    body: 'Gelato and sorbetto are made right here on Locust Street, so the case changes with the seasons.',
    photo: PHOTOS.caramelPan,
    pos: '50% 40%',
    tilt: -3,
  },
  {
    kicker: 'Into the case',
    title: `${STORE.flavorCount} flavors to choose from.`,
    body: "Salted Caramel, Honey Lavender, Mango Chamoy Sorbetto and more. Can't choose just one? Get two.",
    photo: PHOTOS.gelatoCase,
    pos: '50% 72%',
    tilt: 2.5,
  },
  {
    kicker: 'Scooped for you',
    title: 'Seasonal flavors join the classics.',
    body: 'Like this Pomegranate Balsamic Chip, scooped into a Tifa cup at the counter.',
    photo: PHOTOS.pomegranateCup,
    tilt: -2,
  },
  {
    kicker: 'Stay a while',
    title: 'Coffee, cookies and a seat by the window.',
    body: 'Groundwork coffee, hot chocolate and room to linger, next to the Lesher Center.',
    photo: PHOTOS.latteCookie,
    tilt: 3,
  },
];

// Path through the wall, in fractions of [width, track height]. The 2nd to 5th
// points are the stops; the cup leans into each turn.
const PTS = {
  wide: [
    [0.62, 0.0],
    [0.8, 0.16],
    [0.24, 0.39],
    [0.78, 0.62],
    [0.26, 0.85],
    [0.56, 1.0],
  ],
  narrow: [
    [0.7, 0.0],
    [0.8, 0.13],
    [0.2, 0.37],
    [0.8, 0.61],
    [0.2, 0.85],
    [0.5, 1.0],
  ],
};

/** Catmull-Rom through the points, as cubic Béziers. */
function smoothPath(pts) {
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${p[1][0].toFixed(1)},${p[1][1].toFixed(1)}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function measure(width, vh) {
  const wide = width >= 900;
  const trackH = Math.round(vh * (wide ? 4.0 : 3.7));
  const top = vh * (wide ? 0.5 : 0.52);
  const bottom = trackH - vh * 0.34;
  const pts = (wide ? PTS.wide : PTS.narrow).map(([x, y]) => [x * width, top + y * (bottom - top)]);
  const cardW = wide ? Math.min(width * 0.31, 430) : Math.min(width * 0.58, 330);
  const margin = wide ? Math.max(width * 0.07, (width - 1440) / 2 + 48) : width * 0.045;
  const cards = pts.slice(1, 5).map(([x, y]) => {
    const onRight = x > width / 2;
    return { left: onRight ? margin : width - margin - cardW, top: y, onRight };
  });
  return { wide, width, vh, trackH, pts, d: smoothPath(pts), cardW, cards, cup: wide ? Math.min(vh * 0.34, 310) : Math.min(vh * 0.17, width * 0.36, 150) };
}

export default function Journey() {
  const section = useRef(null);
  const sticky = useRef(null);
  const track = useRef(null);
  const cup = useRef(null);
  const basePath = useRef(null);
  const maskPath = useRef(null);
  const cardEls = useRef([]);
  const geo = useRef({ L: 1, stopLens: [], plan: [] });
  const [lay, setLay] = useState(null);
  const reduce = usePrefersReducedMotion();

  // layout from the viewport
  useLayoutEffect(() => {
    if (reduce) return undefined;
    const on = () => {
      const el = sticky.current;
      if (!el) return;
      setLay(measure(el.clientWidth, el.clientHeight));
    };
    on();
    let t = 0;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(on, 120);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, [reduce]);

  // path lengths at each stop, and the scroll plan: travel, hold, travel, hold…
  useLayoutEffect(() => {
    const path = basePath.current;
    if (!lay || !path) return;
    const L = path.getTotalLength();
    const stopLens = lay.pts.slice(1, 5).map(([sx, sy]) => {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i <= 600; i++) {
        const l = (i / 600) * L;
        const q = path.getPointAtLength(l);
        const dd = (q.x - sx) ** 2 + (q.y - sy) ** 2;
        if (dd < bestD) {
          bestD = dd;
          best = l;
        }
      }
      return best;
    });
    const hold = 0.075;
    const travel = (1 - hold * stopLens.length) / (stopLens.length + 1);
    const plan = [];
    let s = 0;
    let from = 0;
    stopLens.forEach((to) => {
      plan.push({ s0: s, s1: s + travel, l0: from, l1: to });
      s += travel;
      plan.push({ s0: s, s1: s + hold, l0: to, l1: to });
      s += hold;
      from = to;
    });
    plan.push({ s0: s, s1: 1, l0: from, l1: L });
    geo.current = { L, stopLens, plan, tilt: 0 };
    if (maskPath.current) {
      maskPath.current.style.strokeDasharray = `${L} ${L}`;
    }
    // the section just changed height: re-measure every other scroll animation
    requestAnimationFrame(() => {
      window.__lenis?.resize();
      ScrollTrigger.refresh();
    });
  }, [lay]);

  const frame = useCallback(() => {
    const el = section.current;
    const path = basePath.current;
    if (!el || !path || !lay) return;
    const { L, plan, stopLens } = geo.current;
    if (!plan.length) return;
    const r = el.getBoundingClientRect();
    const span = r.height - lay.vh;
    const p = clamp(-r.top / span, 0, 1);
    const seg = plan.find((x) => p <= x.s1) ?? plan[plan.length - 1];
    const t = seg.s1 > seg.s0 ? ease(clamp((p - seg.s0) / (seg.s1 - seg.s0), 0, 1)) : 1;
    const len = seg.l0 + (seg.l1 - seg.l0) * t;
    const pt = path.getPointAtLength(len);
    const ahead = path.getPointAtLength(Math.min(L, len + 6));
    const behind = path.getPointAtLength(Math.max(0, len - 6));
    const dx = ahead.x - behind.x;
    const moving = seg.l1 !== seg.l0 ? 1 : 0;
    const g = geo.current;
    g.tilt += (clamp(dx * 1.6 * moving, -14, 14) - g.tilt) * 0.2;

    // camera: keep the cup a little above the middle of the screen
    const cam = clamp(lay.vh * 0.52 - pt.y, -(lay.trackH - lay.vh), 0);
    if (track.current) track.current.style.transform = `translate3d(0, ${cam.toFixed(1)}px, 0)`;
    if (cup.current) cup.current.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-38%, -90%) rotate(${g.tilt.toFixed(2)}deg)`;
    if (maskPath.current) maskPath.current.style.strokeDashoffset = `${(L - len).toFixed(1)}`;
    // pin each photo once the cup gets close
    stopLens.forEach((sl, i) => {
      const card = cardEls.current[i];
      if (!card) return;
      const on = len >= sl - L * 0.07;
      if (card.dataset.on !== String(on)) card.dataset.on = String(on);
    });
    return Math.abs(g.tilt - clamp(dx * 1.6 * moving, -14, 14)) > 0.05;
  }, [lay]);

  useEffect(() => {
    if (reduce || !lay) return undefined;
    let raf = 0;
    const loop = () => {
      raf = 0;
      if (frame()) raf = requestAnimationFrame(loop); // let the lean settle
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(id);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [frame, reduce, lay]);

  const heading = (
    <div className="max-w-[34rem]">
      <p className="t-eyebrow">The Tifa way</p>
      <h2 id="journey-title" className="t-h2 mt-4">
        From our kitchen <span className="t-accent">to your cup.</span>
      </h2>
      <p className="t-lede mt-5 text-ink-dim">Scroll down and follow a scoop from the morning batch to the table by the window.</p>
    </div>
  );

  if (reduce) {
    return (
      <section id="journey" className="relative bg-paper py-24 md:py-32" aria-labelledby="journey-title">
        <div className="mx-auto max-w-[1440px] px-5 md:px-8">
          {heading}
          <ol className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {STOPS.map((s) => (
              <li key={s.kicker}>
                <StopCard stop={s} />
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section
      id="journey"
      ref={section}
      className="relative bg-paper"
      style={{ height: lay ? lay.vh + lay.trackH * 0.95 : '100svh' }}
      aria-labelledby="journey-title"
    >
      <div ref={sticky} className="sticky top-0 h-[100svh] overflow-hidden">
        {/* soft wall light */}
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_40%,#fffaf2,#f8f3ec)]" />
        <div ref={track} className="absolute inset-x-0 top-0 will-change-transform" style={{ height: lay?.trackH ?? '100%' }}>
          <div className="mx-auto max-w-[1440px] px-5 pt-24 md:px-8 md:pt-28">{heading}</div>
          {lay ? (
            <>
              <svg className="pointer-events-none absolute inset-0" width={lay.width} height={lay.trackH} aria-hidden="true">
                <defs>
                  <mask id="tf-journey-mask" maskUnits="userSpaceOnUse">
                    <path ref={maskPath} d={lay.d} fill="none" stroke="#fff" strokeWidth="26" strokeLinecap="round" />
                  </mask>
                </defs>
                <path ref={basePath} d={lay.d} fill="none" stroke="rgb(31 43 42 / 0.16)" strokeWidth="7" strokeLinecap="round" strokeDasharray="0 17" />
                <path d={lay.d} fill="none" stroke="#2C7F7A" strokeWidth="8" strokeLinecap="round" strokeDasharray="0 17" mask="url(#tf-journey-mask)" />
              </svg>
              {/* stop markers: small teal stickers on the path */}
              {lay.pts.slice(1, 5).map(([x, y], i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-tifa font-display text-[0.95rem] italic text-white shadow-[0_6px_14px_-4px_rgb(27_79_75/0.6)] ring-4 ring-paper"
                  style={{ left: x, top: y }}
                >
                  {i + 1}
                </span>
              ))}
              <ol>
                {STOPS.map((s, i) => (
                  <li
                    key={s.kicker}
                    ref={(n) => {
                      cardEls.current[i] = n;
                    }}
                    data-on="false"
                    className="absolute -translate-y-1/2 transition-[opacity,translate,scale] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] data-[on=false]:translate-y-[calc(-50%+48px)] data-[on=false]:scale-[0.94] data-[on=false]:opacity-0"
                    style={{ left: lay.cards[i].left, top: lay.cards[i].top, width: lay.cardW }}
                  >
                    <StopCard stop={s} n={i + 1} />
                  </li>
                ))}
              </ol>
              {/* the traveling cup */}
              <div ref={cup} className="pointer-events-none absolute left-0 top-0 z-20 will-change-transform">
                <Cutout img={CUTOUTS.celebration} h={lay.cup} sizes="280px" />
              </div>
              {/* landing: a call to come in */}
              <div className="absolute inset-x-0 flex justify-center px-5" style={{ top: lay.trackH - lay.vh * 0.2 }}>
                <a href="#visit" className="btn btn-primary">
                  Come taste today&apos;s case
                </a>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StopCard({ stop, n }) {
  return (
    <figure className="print" style={{ rotate: `${stop.tilt}deg` }}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[8px]">
        <Image
          src={stop.photo.src}
          alt={stop.photo.alt}
          fill
          sizes="(min-width: 900px) 430px, 340px"
          className="object-cover"
          style={{ objectPosition: stop.pos ?? '50% 50%' }}
        />
      </div>
      <figcaption className="px-2 pb-1 pt-4">
        <p className="t-eyebrow">
          {n ? <span className="mr-2 text-ink-faint">0{n}</span> : null}
          {stop.kicker}
        </p>
        <p className="t-h3 mt-1.5 text-ink">{stop.title}</p>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-dim">{stop.body}</p>
      </figcaption>
    </figure>
  );
}
