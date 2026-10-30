'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollState } from '@/lib/scrollState';

/**
 * Lenis momentum scrolling driven by GSAP's ticker (one rAF for both), with
 * ScrollTrigger kept in sync. Also runs the scroll-velocity text warp:
 *   [data-warp] elements get an SVG displacement filter + skew proportional to
 *   scroll speed. The filter is removed entirely when settled, so idle frames
 *   cost nothing.
 * Reduced-motion users get native scrolling and no warp.
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

    // ---- signature motion: section headings stretch from condensed to expanded
    // (Archivo's width axis) as they enter. Only headings below the fold are armed,
    // so nothing already on screen ever blinks.
    const stretchTriggers = [];
    document.querySelectorAll('section:not(#top) h2.t-h2').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      gsap.set(el, { fontStretch: '62%', opacity: 0, letterSpacing: '0.01em' });
      stretchTriggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () =>
            gsap.to(el, {
              fontStretch: '125%',
              opacity: 1,
              letterSpacing: '-0.04em',
              duration: 1.4,
              ease: 'expo.out',
              clearProps: 'fontStretch,letterSpacing,opacity',
            }),
        }),
      );
    });

    lenis.on('scroll', (e) => {
      scrollState.velocity = e.velocity;
      scrollState.progress = e.progress;
      scrollState.scroll = e.scroll;
      ScrollTrigger.update();
    });

    // ---- scroll-velocity warp ------------------------------------------------
    const map = document.getElementById('tf-warp-map');
    let warp = 0;
    let filtered = false;
    let els = Array.from(document.querySelectorAll('[data-warp]'));
    const refresh = () => {
      els = Array.from(document.querySelectorAll('[data-warp]'));
    };
    const mo = new MutationObserver(refresh);
    mo.observe(document.body, { childList: true, subtree: true });

    const tick = (time) => {
      lenis.raf(time * 1000);
      const v = scrollState.velocity;
      warp += (Math.min(Math.abs(v) / 60, 1) - warp) * 0.18;
      const on = warp > 0.04;
      if (map) map.setAttribute('scale', (warp * 26).toFixed(2));
      const skew = gsap.utils.clamp(-5, 5, v * 0.12);
      for (const el of els) {
        if (on !== filtered) el.style.filter = on ? 'url(#tf-warp)' : '';
        el.style.transform = on ? `skewY(${skew.toFixed(2)}deg)` : '';
      }
      filtered = on;
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      stretchTriggers.forEach((t) => t.kill());
      gsap.ticker.remove(tick);
      mo.disconnect();
      lenis.destroy();
      delete window.__lenis;
      document.documentElement.classList.remove('lenis', 'lenis-smooth');
    };
  }, []);

  return children;
}
