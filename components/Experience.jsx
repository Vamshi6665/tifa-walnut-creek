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

  return (
    <SmoothScrollProvider>
      <MercuryProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-[3px] focus:bg-chrome focus:px-4 focus:py-2 focus:text-obsidian">
          Skip to content
        </a>
        {/* first-visit preloader: the wordmark widens from condensed to expanded as the scene loads */}
        <div id="tf-preloader" aria-hidden="true" className="fixed inset-0 z-[95] place-items-center bg-obsidian">
          <div className="text-center">
            <p
              data-mark
              className="font-display text-[clamp(3.5rem,10vw,8rem)] font-[250] leading-none tracking-[-0.04em] text-chrome"
              style={{ fontStretch: '62%' }}
            >
              tifa<span className="text-rose">.</span>
            </p>
            <p className="t-tele mt-6 text-xs text-chrome-faint">Walnut Creek, California</p>
          </div>
        </div>
        <FluidCursor />
        <Nav />
        <main id="main">
          <Hero />
          <FlavorsSection />
          <MercuryDivider />
          <FlavorColliderQuiz />
          <MercuryDivider />
          <Story />
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
