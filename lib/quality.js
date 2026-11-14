/**
 * First-guess GPU tier, refined at runtime by drei's <PerformanceMonitor>.
 * No network calls (unlike detect-gpu), so it is safe to run before first paint.
 *
 *   high  full post stack, DoF, planar reflections, transmission glass, 60 fps
 *   mid   bloom + CA, contact shadows, physical glass, 60 fps
 *   low   bloom only, no shadows/reflections, lower particle counts, 30 fps cap
 */
const WEAK_GPU = /(swiftshader|llvmpipe|software|mali-4|mali-t|adreno \(tm\) [2-5]|powervr|intel\(r\) hd graphics [2-5]|intel hd graphics)/i;

export function detectTier() {
  if (typeof window === 'undefined') return 'mid';
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'low';
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;

    let renderer = '';
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return 'none';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    if (WEAK_GPU.test(renderer) || cores <= 2 || mem <= 2) return 'low';
    if (coarse || cores <= 4 || mem <= 4) return 'mid';
    return 'high';
  } catch {
    return 'mid';
  }
}

export const TIER = {
  high: { maxDpr: 2, steam: 700, vortex: 5200, globe: 2600, burst: 520, fps: 60, scoopDetail: 72 },
  mid: { maxDpr: 1.5, steam: 380, vortex: 3000, globe: 1600, burst: 360, fps: 60, scoopDetail: 48 },
  low: { maxDpr: 1, steam: 160, vortex: 1400, globe: 900, burst: 200, fps: 30, scoopDetail: 36 },
};
