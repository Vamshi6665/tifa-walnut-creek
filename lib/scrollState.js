// Mutable, render-free scroll telemetry. Written by SmoothScrollProvider on every
// Lenis tick and read inside rAF/useFrame loops, so it never triggers React renders.
export const scrollState = {
  velocity: 0, // px per frame, signed
  progress: 0, // 0..1 page progress
  scroll: 0,
};

export const pointerState = {
  x: 0, // NDC -1..1
  y: 0,
  px: 0, // CSS px
  py: 0,
  speed: 0, // px per frame, smoothed
};

if (typeof window !== 'undefined') {
  let lx = 0;
  let ly = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      pointerState.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerState.y = -(e.clientY / window.innerHeight) * 2 + 1;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      pointerState.speed = pointerState.speed * 0.8 + Math.hypot(dx, dy) * 0.2;
      lx = pointerState.px = e.clientX;
      ly = pointerState.py = e.clientY;
    },
    { passive: true },
  );
}
