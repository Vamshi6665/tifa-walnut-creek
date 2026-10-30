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
import { LOGO, LOGO_WHITE } from '@/content/media';
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
      <MercuryProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-[3px] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
          Skip to content
        </a>
        {/* first-visit preloader: the Tifa logo drops in while the page loads, then the
            whole screen slides down to reveal the store (see useIntro in Hero.jsx) */}
        {/* Tifa green with the white logo; white with the color logo if that's the only file */}
        <div
          id="tf-preloader"
          aria-hidden="true"
          className={`fixed inset-0 z-[95] place-items-center ${LOGO && !LOGO_WHITE ? 'on-paper bg-white' : 'on-green bg-[#1F9A62]'}`}
        >
          <span data-edge className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#FFFFFF,transparent)] opacity-0 shadow-[0_0_18px_rgba(255,255,255,0.7)]" />
          <div className="text-center">
            <div data-mark className="inline-block will-change-transform">
              <Logo
                on={LOGO && !LOGO_WHITE ? 'light' : 'dark'}
                alt=""
                className="mx-auto h-[clamp(84px,15vw,170px)] w-auto"
                fallbackClassName="block text-[clamp(2rem,5.5vw,4.25rem)] font-semibold leading-none text-white"
              />
            </div>
            <p className="t-tele mt-6 text-xs text-ink-dim">Walnut Creek, California</p>
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
