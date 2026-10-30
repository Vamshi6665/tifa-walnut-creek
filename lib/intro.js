// Render-free state shared by the intro timeline (DOM, GSAP) and the hero
// canvas (read inside useFrame). Writing here never triggers a React render.
export const introState = {
  scan: 1, // 0..1 bottom-up "print" reveal of the hero scene (1 = fully shown)
  dolly: 1, // 0..1 camera arrival from a macro close-up (1 = at rest)
  exit: 0, // 0..1 hero scroll-out progress (drives the melt + camera push)
  ready: false, // hero canvas has rendered its first frames
};

/** Resolves when the hero canvas has drawn (or after `timeout` ms, whichever first). */
export function whenSceneReady(timeout = 6000) {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      if (introState.ready || performance.now() - start > timeout) resolve(introState.ready);
      else requestAnimationFrame(tick);
    };
    tick();
  });
}
