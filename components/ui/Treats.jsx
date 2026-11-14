'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PHOTOS, CUTOUTS, TRUFFLES } from '@/content/photos';
import Cutout from './Cutout';

/**
 * The other half of the menu: chocolate and coffee. Truffles circle the box as
 * you scroll; the drinks drift up and down past each other.
 */
export default function Treats() {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const orbit = el.querySelector('[data-orbit]');
      const st = (trigger) => ({ trigger, start: 'top bottom', end: 'bottom top', scrub: 0.6 });
      gsap.fromTo(orbit, { rotate: -50 }, { rotate: 70, ease: 'none', scrollTrigger: st(orbit) });
      orbit.querySelectorAll('[data-spin]').forEach((n) => {
        gsap.fromTo(n, { rotate: 50 }, { rotate: -160, ease: 'none', scrollTrigger: st(orbit) });
      });
      el.querySelectorAll('[data-sway]').forEach((n) => {
        const k = Number(n.dataset.sway);
        gsap.fromTo(n, { y: 120 * k, rotate: -6 * k }, { y: -120 * k, rotate: 6 * k, ease: 'none', scrollTrigger: st(n.parentElement) });
      });
    }, el);
    return () => ctx.revert();
  }, []);

  const orbitAt = [0, 72, 144, 216, 288];

  return (
    <section ref={root} id="treats" className="relative overflow-hidden bg-paper py-24 md:py-36" aria-labelledby="treats-title">
      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        {/* chocolate */}
        <div className="grid items-center gap-16 md:grid-cols-12 md:gap-8">
          <div className="relative mx-auto w-full max-w-[520px] md:col-span-6 lg:col-span-5">
            <div data-orbit className="pointer-events-none absolute left-1/2 top-1/2 z-20 aspect-square w-[128%] -translate-x-1/2 -translate-y-1/2">
              {orbitAt.map((deg, i) => (
                <div key={deg} className="absolute inset-0" style={{ transform: `rotate(${deg}deg)` }}>
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                    <div data-spin>
                      <Cutout img={TRUFFLES[i]} h="clamp(52px, 6vw, 86px)" sizes="90px" alt="" className="rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <figure className="print relative z-10 rotate-[-3deg]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[8px]">
                <Image src={PHOTOS.truffles.src} alt={PHOTOS.truffles.alt} fill sizes="(min-width: 768px) 40vw, 90vw" className="object-cover" />
              </div>
            </figure>
          </div>
          <div className="md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-8">
            <p className="t-eyebrow">The chocolate half</p>
            <h2 id="treats-title" className="t-h2 mt-4">
              Truffles too pretty <span className="t-accent">to eat.</span> Almost.
            </h2>
            <p className="t-body mt-6 text-ink-dim">
              Tifa is Chocolate &amp; Gelato. Next to the gelato case you&apos;ll find artisan truffles in every color, plus cookies and
              macarons. Pick one for the walk home, or a whole box for someone you like.
            </p>
            <a href="#catering" className="btn btn-ghost mt-8">
              Chocolates for an event
            </a>
          </div>
        </div>

        {/* coffee */}
        <div className="mt-28 grid items-center gap-12 md:mt-40 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <p className="t-eyebrow">Groundwork coffee &amp; more</p>
            <h3 className="t-h2 mt-4">
              A latte with <span className="t-accent">your scoop?</span>
            </h3>
            <p className="t-body mt-6 text-ink-dim">
              Award-winning, certified organic Groundwork coffee: espresso drinks, iced lattes, iced tea and rich hot chocolate to go with your
              gelato.
            </p>
          </div>
          <div className="relative h-[540px] md:col-span-7 md:h-[640px]">
            <figure className="print absolute left-[0%] top-[0%] w-[47%] rotate-[-4deg] md:left-[6%]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[8px]">
                <Image src={PHOTOS.latteTrio.src} alt={PHOTOS.latteTrio.alt} fill sizes="(min-width: 768px) 26vw, 45vw" className="object-cover" />
              </div>
            </figure>
            <figure className="print absolute bottom-[0%] right-[0%] w-[45%] rotate-[3deg] md:right-[4%]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[8px]">
                <Image src={PHOTOS.hotChocolate.src} alt={PHOTOS.hotChocolate.alt} fill sizes="(min-width: 768px) 25vw, 44vw" className="object-cover" />
              </div>
            </figure>
            <div className="absolute bottom-[2%] left-[8%] z-10 md:left-[14%]">
              <div data-sway="0.45">
                <Cutout img={CUTOUTS.icedTea} h="clamp(190px, 22vw, 300px)" sizes="(min-width: 768px) 12vw, 30vw" />
              </div>
            </div>
            <div className="absolute right-[6%] top-[6%] z-10 md:right-[12%]">
              <div data-sway="-0.4">
                <Cutout img={CUTOUTS.mocha} h="clamp(150px, 16vw, 230px)" sizes="(min-width: 768px) 10vw, 26vw" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
