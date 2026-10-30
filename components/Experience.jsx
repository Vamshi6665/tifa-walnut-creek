'use client';

import { useEffect } from 'react';
import SmoothScrollProvider from './ui/SmoothScrollProvider';
import FluidCursor from './ui/FluidCursor';
import { MercuryProvider, MercuryDivider } from './ui/MercuryDividers';
import Nav from './ui/Nav';
import Hero from './ui/Hero';
import PerkOverlay from './ui/PerkOverlay';
import FlavorsSection from './ui/FlavorsSection';
import FlavorColliderQuiz from './ui/FlavorColliderQuiz';
import Story from './ui/Story';
import Visit from './ui/Visit';
import TelemetryDashboard from './ui/TelemetryDashboard';
import Footer from './ui/Footer';
import Showcase from './ui/Showcase';
import Reviews from './ui/Reviews';
import Catering from './ui/Catering';
import { LOGO_WHITE } from '@/content/media';
import { primeAudioOnFirstGesture } from '@/lib/audio';
import { useStore } from '@/lib/store';
import { useWalnutCreekWeather } from '@/lib/weather';
import { detectTier, TIER } from '@/lib/quality';

function useQualityBootstrap() {
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get('quality');
    const tier = ['high', 'mid', 'low', 'none'].includes(forced) ? forced : detectTier();
    useStore.setState({ tier, dpr: tier === 'none' ? 1 : TIER[tier].maxDpr });
  }, []);
}

export default function Experience() {
  useQualityBootstrap();
  useWalnutCreekWeather();
  useEffect(() => primeAudioOnFirstGesture(), []);

  return (
    <SmoothScrollProvider>
      <MercuryProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-[3px] focus:bg-chrome focus:px-4 focus:py-2 focus:text-obsidian">
          Skip to content
        </a>
        {/* first-visit preloader: the Tifa logo drops in while the page loads, then the
            whole screen slides down to reveal the store (see useIntro in Hero.jsx) */}
        <div id="tf-preloader" aria-hidden="true" className="fixed inset-0 z-[95] place-items-center bg-obsidian">
          <span data-edge className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#FFF7D6,transparent)] opacity-0 shadow-[0_0_18px_rgba(255,247,214,0.6)]" />
          <div className="text-center">
            <div data-mark className="inline-block will-change-transform">
              {LOGO_WHITE ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={LOGO_WHITE} alt="" className="mx-auto h-[clamp(72px,13vw,150px)] w-auto" />
              ) : (
                <p className="font-display text-[clamp(3.5rem,10vw,8rem)] font-[300] leading-none tracking-[-0.04em] text-chrome [font-stretch:125%]">
                  tifa<span className="text-rose">.</span>
                </p>
              )}
            </div>
            <p className="t-tele mt-6 text-xs text-chrome-faint">Walnut Creek, California</p>
          </div>
        </div>
        <FluidCursor />
        <Nav />
        <main id="main">
          <Hero />
          <Showcase />
          <FlavorsSection />
          <MercuryDivider />
          <FlavorColliderQuiz />
          <MercuryDivider />
          <Reviews />
          <Story />
          <MercuryDivider />
          <Catering />
          <Visit />
          <MercuryDivider />
          <TelemetryDashboard />
        </main>
        <Footer />
        <PerkOverlay />
      </MercuryProvider>
    </SmoothScrollProvider>
  );
}
