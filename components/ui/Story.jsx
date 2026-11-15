'use client';

import Image from 'next/image';
import { useStore } from '@/lib/store';
import { PHOTOS, BRAND } from '@/content/photos';

export default function Story() {
  const llamaFound = useStore((s) => s.llamaFound);
  const openPerk = useStore((s) => s.openPerk);
  return (
    <section id="story" className="relative scroll-mt-16 overflow-hidden bg-paper-2 py-24 md:py-36" aria-labelledby="story-title">
      <div className="mx-auto grid max-w-[1440px] gap-16 px-5 md:px-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6">
          <p className="t-eyebrow">Our story</p>
          <h2 id="story-title" className="t-h2 mt-4">
            A Walnut Creek <span className="t-accent">original.</span>
          </h2>
          <blockquote className="relative mt-12 pl-8">
            <span aria-hidden="true" className="absolute -left-1 -top-6 font-display text-[6rem] leading-none text-pink">
              &ldquo;
            </span>
            <p className="font-display text-[clamp(1.45rem,2.5vw,2.15rem)] font-[360] italic leading-snug tracking-[-0.01em] text-ink [font-variation-settings:'SOFT'_100,'WONK'_1]">
              Tifa&apos;s not just about dessert. It&apos;s about connection, sharing laughs, playing games, and creating moments.
            </p>
            <footer className="mt-5 text-ink-dim">
              <span className="font-semibold text-ink">Naina Balupari</span>, owner and founder
            </footer>
          </blockquote>
          <div className="t-body mt-12 space-y-5 text-ink-dim">
            <p>
              Originally from India, Naina Balupari and her family have called California home for more than 20 years. A software engineer
              turned gelato entrepreneur, Naina opened the first Tifa Chocolate &amp; Gelato in Walnut Creek with one goal: build a place that
              brings people together.
            </p>
            <p>
              Everything is made in house, in small batches, right here on Locust Street. Not a franchise delivery from a freezer truck:
              made by a local family, for the neighborhood.
            </p>
          </div>
        </div>

        <div className="relative lg:col-span-6">
          <div className="relative mx-auto max-w-[620px] pb-24 lg:mt-10">
            <figure className="print rotate-[2deg]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[8px]">
                <Image src={PHOTOS.pinkGuavaCup.src} alt={PHOTOS.pinkGuavaCup.alt} fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
              </div>
            </figure>
            <figure className="print absolute -left-2 bottom-0 w-[48%] rotate-[-5deg] sm:-left-8">
              <div className="relative aspect-square overflow-hidden rounded-[8px]">
                <Image src={PHOTOS.celebrationCup.src} alt={PHOTOS.celebrationCup.alt} fill sizes="(min-width: 1024px) 20vw, 45vw" className="object-cover" />
              </div>
            </figure>
            <Image
              src={BRAND.roundel}
              alt=""
              width={1024}
              height={1024}
              sizes="120px"
              className="absolute -right-3 -top-8 h-24 w-24 rotate-[14deg] drop-shadow-[0_12px_16px_rgb(31_43_42/0.25)] sm:h-28 sm:w-28"
            />
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="on-teal relative overflow-hidden rounded-[24px] bg-paper p-6">
              <Image src={BRAND.white} alt="" width={1024} height={1024} sizes="200px" className="absolute -bottom-10 -right-10 h-44 w-44 opacity-15" />
              <h3 className="t-h3">Find the LaMa</h3>
              <p className="mt-2 text-ink-dim">
                The llama is a Balupari family tradition, named for daughters <strong className="text-ink">La</strong>asya and{' '}
                <strong className="text-ink">Ma</strong>anya. Llamas are hidden all around the store.
              </p>
              <button type="button" onClick={openPerk} className="relative mt-4 text-sm font-semibold text-ink underline decoration-white/50 underline-offset-4 hover:decoration-white">
                {llamaFound ? 'You found the one on this site.' : 'One is hiding here too. Tap to find it.'}
              </button>
            </div>
            <div className="rounded-[24px] border border-line bg-paper p-6">
              <h3 className="t-h3">Made where you can see it</h3>
              <p className="mt-2 text-ink-dim">
                Look through the window at the back of the store and you can watch the gelato being made. Kids are welcome to doodle on the
                glass.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
