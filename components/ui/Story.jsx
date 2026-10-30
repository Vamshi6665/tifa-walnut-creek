'use client';

import { Coffee } from 'lucide-react';
import InertiaCard from './InertiaCard';
import { useStore } from '@/lib/store';

export default function Story() {
  const llamaFound = useStore((s) => s.llamaFound);
  return (
    <section id="story" className="relative scroll-mt-16 bg-obsidian py-24 md:py-32" aria-labelledby="story-title">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 md:px-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 id="story-title" className="t-h2" data-warp>
            A Walnut Creek original.
          </h2>
          <blockquote className="mt-10 border-l-2 border-rose pl-6">
            <p className="font-display text-[clamp(1.35rem,2.4vw,2rem)] font-light leading-snug tracking-[-0.02em] text-vanilla [font-stretch:112%]">
              &ldquo;Tifa&apos;s not just about dessert. It&apos;s about connection, sharing laughs, playing games, and creating moments.&rdquo;
            </p>
            <footer className="mt-4 text-chrome-dim">Naina Balupari, owner and founder</footer>
          </blockquote>
          <div className="t-body mt-10 space-y-5 text-chrome-dim">
            <p>
              Originally from India, <strong className="text-chrome">Naina Balupari</strong> and her family have called California home for
              more than 20 years. A software engineer turned gelato entrepreneur, Naina opened the first Tifa Chocolate &amp; Gelato in
              Walnut Creek with one goal: build a place that brings people together.
            </p>
            <p>
              Every batch is made in-house, every morning, on Locust Street. Not a franchise delivery from a freezer truck. Something made
              today, by people who live here.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-5 lg:pt-28">
          <InertiaCard className="overflow-hidden rounded-lg border border-line bg-obsidian-2 p-7">
            <h3 className="t-h3">Find the LaMa</h3>
            <p className="mt-2 text-chrome-dim">
              The llama is a Balupari family tradition, named for daughters <strong className="text-chrome">La</strong>asya and{' '}
              <strong className="text-chrome">Ma</strong>anya. Llama figurines are hidden all around the store.
            </p>
            <p className="mt-4 text-sm font-medium text-mint">
              {llamaFound ? 'You found the one on this site.' : 'One is hiding on this page too, in the shadows behind the coupe at the top.'}
            </p>
          </InertiaCard>
          <InertiaCard className="overflow-hidden rounded-lg border border-line bg-obsidian-2 p-7">
            <Coffee size={22} strokeWidth={1.5} className="text-chrome-dim" aria-hidden="true" />
            <h3 className="t-h3 mt-4">Groundwork coffee</h3>
            <p className="mt-2 text-chrome-dim">
              Award-winning certified organic coffee, espresso drinks, iced lattes and rich hot chocolate to go with your gelato.
            </p>
          </InertiaCard>
        </div>
      </div>
    </section>
  );
}
