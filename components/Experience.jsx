'use client';

import { useEffect } from 'react';
import SmoothScrollProvider from './ui/SmoothScrollProvider';
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
import Marquee from './ui/Marquee';
import Journey from './ui/Journey';
import SeasonalCase from './ui/SeasonalCase';
import Treats from './ui/Treats';
import Logo from './ui/Logo';
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
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      {/* first-visit preloader: the Tifa sticker drops onto Tifa teal while the page
          loads, then the screen slides away to reveal the shop (see useIntro in Hero.jsx) */}
      <div id="tf-preloader" aria-hidden="true" className="on-teal fixed inset-0 z-[95] place-items-center bg-paper">
        <div className="text-center">
          <div data-mark className="inline-block will-change-transform">
            <Logo on="dark" alt="" className="mx-auto h-[clamp(150px,22vw,250px)] w-auto" fallbackClassName="block font-display text-[clamp(2rem,5.5vw,4.25rem)] text-white" />
          </div>
          <p className="t-eyebrow mt-6 !text-white/85">Walnut Creek, California</p>
        </div>
      </div>
      <Nav />
      <main id="main">
        <Hero />
        <Marquee />
        <Journey />
        <SeasonalCase />
        <FlavorsSection />
        <FlavorColliderQuiz />
        <Showcase />
        <Treats />
        <Reviews />
        <Story />
        <Catering />
        <TelemetryDashboard />
        <Visit />
      </main>
      <Footer />
      <PerkOverlay />
    </SmoothScrollProvider>
  );
}
