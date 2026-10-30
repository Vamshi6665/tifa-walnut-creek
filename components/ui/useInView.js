'use client';

import { useEffect, useState } from 'react';

/**
 * Two-stage visibility for WebGL sections:
 *   near    — within `margin` of the viewport → mount the canvas (lazy JS + GPU)
 *   visible — actually on screen → run the frameloop; otherwise frameloop='never'
 * Once mounted we keep the canvas alive (remounting costs shader compiles).
 */
export function useInView(ref, { margin = '100% 0px' } = {}) {
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      setVisible(true);
      return undefined;
    }
    const nearObs = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: margin });
    const visObs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    nearObs.observe(el);
    visObs.observe(el);
    return () => {
      nearObs.disconnect();
      visObs.disconnect();
    };
  }, [ref, margin]);

  return { near, visible };
}

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}
