'use client';

import { useEffect, useRef, useState } from 'react';
import { MEDIA } from '@/content/media';
import Photo from './Photo';

/**
 * Big real photos of the shop. On wide screens the section pins and vertical
 * scrolling glides the photos sideways (each photo also drifts inside its
 * frame for depth). On phones and with reduced motion it's a plain swipeable
 * row. Extra photos dropped in /public/photos/gallery are appended.
 */
const PANELS = [
  {
    slot: 'gelato-case',
    title: 'Twenty-seven flavors, every morning.',
    body: 'Gelato and sorbetto made in-house on Locust Street, so the case changes with the season.',
  },
  { slot: 'truffle-case', title: 'Truffles by the door.', body: 'A case of chocolate truffles greets you on the way in.' },
  { slot: 'chocolates', title: 'The chocolate half of Tifa.', body: 'Artisan chocolates, cookies and macarons alongside the gelato.' },
  {
    slot: 'interior',
    title: 'Room to stay a while.',
    body: 'Tables, games and space to linger, next to the Lesher Center with parking next door.',
  },
];

export default function Showcase() {
  const wrap = useRef(null);
  const track = useRef(null);
  const [pinned, setPinned] = useState(false);
  const panels = [...PANELS, ...MEDIA.gallery.map((src) => ({ src }))];

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)');
    const on = () => setPinned(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (!pinned) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = wrap.current;
      const t = track.current;
      if (!el || !t) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      const travel = t.scrollWidth - window.innerWidth;
      t.style.transform = `translate3d(${(-p * travel).toFixed(1)}px, 0, 0)`;
      // inner drift: each photo slides a little against the track
      t.querySelectorAll('[data-drift] img').forEach((img) => {
        const b = img.parentElement.getBoundingClientRect();
        const c = (b.left + b.width / 2) / window.innerWidth - 0.5;
        img.style.transform = `translate3d(${(c * -6).toFixed(2)}%, 0, 0) scale(1.14)`;
      });
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
  }, [pinned, panels.length]);

  const items = panels.map((p, i) => (
    <figure key={p.slot ?? p.src} className="relative w-[82vw] shrink-0 snap-center md:w-[62vw] lg:w-[54vw]">
      <div data-drift className="overflow-hidden rounded-lg">
        <Photo
          slot={p.slot}
          src={p.src}
          alt={p.title ?? 'Tifa Walnut Creek'}
          className="aspect-[4/3] md:aspect-[16/10]"
          sizes="(min-width: 1024px) 54vw, (min-width: 768px) 62vw, 82vw"
          priority={i === 0}
        />
      </div>
      {p.title ? (
        <figcaption className="mt-5 grid gap-1 md:grid-cols-[1fr_1.2fr] md:gap-8">
          <span className="t-h3 text-ink">{p.title}</span>
          <span className="text-ink-dim">{p.body}</span>
        </figcaption>
      ) : null}
    </figure>
  ));

  if (!pinned) {
    return (
      <section id="shop" className="on-green relative bg-paper py-20" aria-label="Inside the shop">
        <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4">{items}</div>
      </section>
    );
  }
  return (
    <section id="shop" ref={wrap} className="on-green relative bg-paper" style={{ height: `${100 + (panels.length - 1) * 62}svh` }} aria-label="Inside the shop">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div ref={track} className="flex gap-[4vw] pl-[8vw] pr-[8vw] will-change-transform">
          {items}
        </div>
      </div>
    </section>
  );
}
