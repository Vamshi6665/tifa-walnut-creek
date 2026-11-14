'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollState } from '@/lib/scrollState';

/**
 * Lenis momentum scrolling driven by GSAP's ticker (one rAF for both), with
 * ScrollTrigger kept in sync. Section headings rise in as they enter.
 * Reduced-motion users get native scrolling and no motion.
 */
export default function SmoothScrollProvider({ children }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      const onScroll = () => {
        scrollState.scroll = window.scrollY;
        scrollState.velocity = 0;
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    const lenis = new Lenis({
      lerp: 0.095,
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
      anchors: { offset: -64 },
      autoRaf: false,
    });
    window.__lenis = lenis;
    document.documentElement.classList.add('lenis', 'lenis-smooth');
    // the hero intro holds the page still until the scene has arrived
    if (document.documentElement.classList.contains('tf-intro')) lenis.stop();

    // ---- section headings rise gently into place as they enter (below the fold only,
    // so nothing already on screen ever blinks)
    const revealTriggers = [];
    document.querySelectorAll('section:not(#top) h2.t-h2').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      gsap.set(el, { opacity: 0, y: 34 });
      revealTriggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', clearProps: 'opacity,transform' }),
        }),
      );
    });
    lenis.on('scroll', (e) => {
      scrollState.velocity = e.velocity;
      scrollState.progress = e.progress;
      scrollState.scroll = e.scroll;
      ScrollTrigger.update();
    });

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      revealTriggers.forEach((t) => t.kill());
      gsap.ticker.remove(tick);
      lenis.destroy();
      delete window.__lenis;
      document.documentElement.classList.remove('lenis', 'lenis-smooth');
    };
  }, []);

  return children;
}
