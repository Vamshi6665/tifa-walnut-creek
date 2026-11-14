'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SEASONAL } from '@/content/photos';
import Cutout from './Cutout';

/**
 * Seasonal flavors photographed in the case. As the section scrolls into view
 * each cup rises up out of its colored circle at its own pace, like it's being
 * lifted off the counter for you.
 */
export default function SeasonalCase() {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      el.querySelectorAll('[data-rise]').forEach((n, i) => {
        gsap.fromTo(
          n,
          { y: 190 + (i % 3) * 30, rotate: i % 2 ? 7 : -7 },
          {
            y: -14 - (i % 3) * 6,
            rotate: i % 2 ? -3 : 3,
            ease: 'none',
            scrollTrigger: { trigger: n.closest('li'), start: 'top bottom', end: 'center 55%', scrub: 0.7 },
          },
        );
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative overflow-hidden bg-paper pb-10 pt-28 md:pb-16 md:pt-40" aria-labelledby="seasonal-title">
      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="t-eyebrow">Spotted in the case</p>
            <h2 id="seasonal-title" className="t-h2 mt-4">
              Seasonal flavors, <span className="t-accent">while they last.</span>
            </h2>
          </div>
          <p className="t-body text-ink-dim md:col-span-5">
            Alongside the classics, new flavors rotate through the case. These were scooped recently. Ask what&apos;s new when you come in, or
            check our Instagram for this week&apos;s lineup.
          </p>
        </div>
        <ul className="mt-14 grid gap-14 sm:grid-cols-3 sm:gap-6 md:mt-20">
          {SEASONAL.map((s) => (
            <li key={s.name} className="group text-center">
              <div className="relative mx-auto flex aspect-square w-full max-w-[380px] items-end justify-center [clip-path:inset(-80%_-40%_0_-40%)]">
                <div
                  aria-hidden="true"
                  className="absolute inset-[6%] rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                  style={{ background: s.tint }}
                />
                {/* dotted ring, like the sticker */}
                <div aria-hidden="true" className="absolute inset-[1%] rounded-full border-[3px] border-dotted border-ink/15" />
                <div data-rise className="relative z-10 mb-[4%]">
                  <div className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-3 group-hover:rotate-[-4deg]">
                    <Cutout img={s.cutout} h="clamp(200px, 26vw, 330px)" sizes="(min-width: 640px) 30vw, 80vw" />
                  </div>
                </div>
              </div>
              <p className="mt-6 font-display text-[clamp(1.35rem,2vw,1.75rem)] font-[420] leading-tight tracking-[-0.01em] text-ink">{s.name}</p>
              <p className="mt-1 text-sm text-ink-faint">Seasonal</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
