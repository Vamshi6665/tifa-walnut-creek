'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Camera } from 'lucide-react';
import { PHOTOS } from '@/content/photos';
import { STORE } from '@/lib/config';

/**
 * "Inside Tifa": real photos from the shop in three columns that slide past
 * each other as you scroll: the outer columns rise while the middle one comes
 * down. Two columns on phones. Static with reduced motion.
 */
const COLUMNS = [
  [PHOTOS.icedLattes, PHOTOS.chocolateCup, PHOTOS.truffles, PHOTOS.pumpkinCup],
  [PHOTOS.celebrationCup, PHOTOS.latteTrio, PHOTOS.pinkGuavaCup, PHOTOS.hotChocolate],
  [PHOTOS.mochaWindow, PHOTOS.icedTea, PHOTOS.gelatoCase, PHOTOS.caramelPan],
];

export default function Showcase() {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const st = { trigger: el.querySelector('[data-cols]'), start: 'top bottom', end: 'bottom top', scrub: 0.5 };
      el.querySelectorAll('[data-col]').forEach((c) => {
        const dir = Number(c.dataset.col);
        gsap.fromTo(c, { yPercent: dir > 0 ? -4 : 8 }, { yPercent: dir > 0 ? 6 : -8, ease: 'none', scrollTrigger: st });
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section id="shop" ref={root} className="relative overflow-hidden bg-paper-2 py-24 md:py-32" aria-labelledby="shop-title">
      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="t-eyebrow">Inside Tifa</p>
            <h2 id="shop-title" className="t-h2 mt-4">
              Come for the gelato. <span className="t-accent">Stay for everything else.</span>
            </h2>
          </div>
          <div className="md:col-span-5">
            <p className="t-body text-ink-dim">
              Iced lattes on the counter, truffles in the case, hot chocolate by the window. A few favorites from our feed.
            </p>
            <a href={STORE.instagram} target="_blank" rel="noreferrer" className="btn btn-ghost mt-6">
              <Camera size={17} aria-hidden="true" /> {STORE.instagramHandle}
            </a>
          </div>
        </div>
      </div>
      <div data-cols className="mx-auto mt-14 grid max-w-[1440px] grid-cols-2 gap-3 px-3 md:mt-20 md:grid-cols-3 md:gap-6 md:px-8">
        {COLUMNS.map((col, ci) => (
          <ul key={ci} data-col={ci === 1 ? 1 : -1} className={`flex flex-col gap-3 md:gap-6 ${ci === 2 ? 'hidden md:flex' : ''} ${ci === 1 ? 'pt-16 md:pt-0' : ''}`}>
            {(ci === 0 ? [...col, ...COLUMNS[2].slice(0, 2)] : ci === 1 ? [...col, ...COLUMNS[2].slice(2)] : col).map((ph, i) => (
              <li key={ph.src} className={`${i >= 4 ? 'md:hidden' : ''} group overflow-hidden rounded-[18px] bg-paper-3`}>
                <Image
                  src={ph.src}
                  alt={ph.alt}
                  width={ph.w}
                  height={ph.h}
                  sizes="(min-width: 768px) 32vw, 48vw"
                  className="h-auto w-full transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
