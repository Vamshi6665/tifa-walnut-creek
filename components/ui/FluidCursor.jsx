'use client';

import { useEffect, useRef } from 'react';

/**
 * Fluid cursor: a precise dot (zero lag, so pointing accuracy is unchanged)
 * plus a spring-driven ring that stretches along its velocity like a droplet.
 * Elements with [data-magnetic] pull the ring onto themselves and lean toward
 * the pointer. Fine pointers + motion-OK only; everything else keeps the
 * native cursor. All updates are direct style writes in one rAF — no React renders.
 */
export default function FluidCursor() {
  const dot = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return undefined;
    document.documentElement.classList.add('has-fluid-cursor');

    const p = { x: -100, y: -100 };
    const r = { x: -100, y: -100, vx: 0, vy: 0, w: 36, h: 36 };
    let magnet = null;
    let visible = false;
    let raf = 0;

    const move = (e) => {
      p.x = e.clientX;
      p.y = e.clientY;
      if (!visible) {
        visible = true;
        r.x = p.x;
        r.y = p.y;
        dot.current.style.opacity = '1';
        ring.current.style.opacity = '1';
      }
      const m = e.target.closest?.('[data-magnetic]');
      if (m !== magnet) {
        if (magnet) magnet.style.transform = '';
        magnet = m;
      }
    };
    const leave = () => {
      visible = false;
      dot.current.style.opacity = '0';
      ring.current.style.opacity = '0';
    };
    const down = () => ring.current.classList.add('is-down');
    const up = () => ring.current.classList.remove('is-down');

    const loop = () => {
      let tx = p.x;
      let ty = p.y;
      let tw = 36;
      let th = 36;
      let radius = 999;
      if (magnet) {
        const b = magnet.getBoundingClientRect();
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        tx = cx + (p.x - cx) * 0.18;
        ty = cy + (p.y - cy) * 0.18;
        tw = b.width + 14;
        th = b.height + 14;
        radius = Math.min(b.height / 2 + 7, 999);
        magnet.style.transform = `translate(${((p.x - cx) * 0.22).toFixed(1)}px, ${((p.y - cy) * 0.3).toFixed(1)}px)`;
      }
      // critically-damped-ish spring
      const k = 0.2;
      const d = 0.62;
      r.vx = (r.vx + (tx - r.x) * k) * d;
      r.vy = (r.vy + (ty - r.y) * k) * d;
      r.x += r.vx;
      r.y += r.vy;
      r.w += (tw - r.w) * 0.25;
      r.h += (th - r.h) * 0.25;

      const speed = Math.hypot(r.vx, r.vy);
      const stretch = magnet ? 1 : 1 + Math.min(speed / 38, 0.55);
      const angle = Math.atan2(r.vy, r.vx);
      const mode = document.body.dataset.cursor || '';

      dot.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      ring.current.style.width = `${r.w}px`;
      ring.current.style.height = `${r.h}px`;
      ring.current.style.borderRadius = `${radius}px`;
      ring.current.style.transform = `translate3d(${r.x - r.w / 2}px, ${r.y - r.h / 2}px, 0) rotate(${magnet ? 0 : angle}rad) scale(${stretch}, ${1 / stretch})`;
      ring.current.dataset.mode = mode;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      document.documentElement.classList.remove('has-fluid-cursor');
      if (magnet) magnet.style.transform = '';
    };
  }, []);

  return (
    <>
      <div
        ref={dot}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[100] -ml-[3px] -mt-[3px] h-[6px] w-[6px] rounded-full bg-white opacity-0 mix-blend-difference"
      />
      <div ref={ring} aria-hidden="true" className="fluid-ring pointer-events-none fixed left-0 top-0 z-[99] opacity-0" />
      <style>{`
        .fluid-ring {
          border: 1.5px solid rgb(255 255 255 / 0.75);
          transform-origin: center;
          transition: border-color .25s, background-color .25s, opacity .3s;
          mix-blend-mode: difference;
        }
        .fluid-ring.is-down { background: rgb(255 255 255 / .25); }
        .fluid-ring[data-mode='grab-scoop'], .fluid-ring[data-mode='llama'], .fluid-ring[data-mode='node'] { mix-blend-mode: normal; }
        .fluid-ring[data-mode='grab-scoop'] { border-color: #1F9A62; background: rgb(31 154 98 / .14); }
        .fluid-ring[data-mode='llama'] { border-color: #7FE0AE; background: rgb(127 224 174 / .2); }
        .fluid-ring[data-mode='node'] { border-color: #FFFFFF; }
      `}</style>
    </>
  );
}
