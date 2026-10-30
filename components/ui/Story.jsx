'use client';

import { useStore } from '@/lib/store';
import Photo from './Photo';

export default function Story() {
  const llamaFound = useStore((s) => s.llamaFound);
  return (
    <section id="story" className="relative scroll-mt-16 bg-paper-2 py-24 md:py-32" aria-labelledby="story-title">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 md:px-8 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h2 id="story-title" className="t-h2" data-warp>
            A Walnut Creek original.
          </h2>
          <blockquote className="mt-10 border-l-2 border-green pl-6">
            <p className="font-display text-[clamp(1.35rem,2.4vw,2rem)] font-light leading-snug tracking-[-0.02em] text-ink [font-stretch:112%]">
              &ldquo;Tifa&apos;s not just about dessert. It&apos;s about connection, sharing laughs, playing games, and creating moments.&rdquo;
            </p>
            <footer className="mt-4 text-ink-dim">Naina Balupari, owner and founder</footer>
          </blockquote>
          <div className="t-body mt-10 space-y-5 text-ink-dim">
            <p>
              Originally from India, <strong className="text-ink">Naina Balupari</strong> and her family have called California home for
              more than 20 years. A software engineer turned gelato entrepreneur, Naina opened the first Tifa Chocolate &amp; Gelato in
              Walnut Creek with one goal: build a place that brings people together.
            </p>
            <p>
              Every batch is made in-house, every morning, on Locust Street. Not a franchise delivery from a freezer truck. Something made
              today, by people who live here.
            </p>
          </div>
          <Photo slot="team" className="mt-10 aspect-[4/3] rounded-lg" sizes="(min-width: 1024px) 45vw, 100vw" />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-6 lg:pt-28">
          <Photo slot="interior" className="col-span-2 aspect-[16/10] rounded-lg" sizes="(min-width: 1024px) 45vw, 100vw" />
          <figure className="col-span-2 grid gap-4 sm:col-span-1">
            <Photo slot="llama-wall" className="aspect-[4/5] rounded-lg" sizes="(min-width: 640px) 22vw, 100vw" />
            <figcaption>
              <h3 className="t-h3">Find the LaMa</h3>
              <p className="mt-2 text-ink-dim">
                The llama is a Balupari family tradition, named for daughters <strong className="text-ink">La</strong>asya and{' '}
                <strong className="text-ink">Ma</strong>anya. Llamas are hidden all around the store.
              </p>
              <p className="mt-3 text-sm font-medium text-green-ink">
                {llamaFound ? 'You found the one on this site.' : 'One is hiding on this page too.'}
              </p>
            </figcaption>
          </figure>
          <figure className="col-span-2 grid gap-4 sm:col-span-1">
            <Photo slot="kitchen-window" className="aspect-[4/5] rounded-lg" sizes="(min-width: 640px) 22vw, 100vw" />
            <figcaption>
              <h3 className="t-h3">Made where you can see it</h3>
              <p className="mt-2 text-ink-dim">
                Look through the window at the back of the store and you can watch the gelato being made. Kids are welcome to doodle on the
                glass.
              </p>
            </figcaption>
          </figure>
          <figure className="col-span-2 grid gap-4 sm:grid-cols-2 sm:items-center">
            <Photo slot="drinks" className="aspect-[4/3] rounded-lg" sizes="(min-width: 640px) 22vw, 100vw" />
            <figcaption>
              <h3 className="t-h3">Groundwork coffee</h3>
              <p className="mt-2 text-ink-dim">
                Award-winning certified organic coffee, espresso drinks, iced lattes and rich hot chocolate to go with your gelato.
              </p>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
