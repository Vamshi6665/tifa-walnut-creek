'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { pointerState, scrollState } from '@/lib/scrollState';

/**
 * Liquid-mercury section dividers.
 *
 * ONE fixed, transparent WebGL canvas draws every divider: each <MercuryDivider/>
 * registers an empty DOM strip, and per frame we scissor-render a full-screen
 * triangle into each strip that is on screen. One context, one program, no
 * draws when nothing is visible.
 *
 * Surface = height field of slow swell + up to 12 cursor ripples (spawned with
 * strength ∝ cursor speed) + a scroll-velocity chop. Normals come from the
 * analytic gradient; shading reflects into a procedural chrome studio with
 * rose/mint side lights, so it reads as polished liquid metal.
 */

const Ctx = createContext(null);
const MAX_RIPPLES = 12;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;       // strip size in device px
uniform vec2 uOrigin;    // strip bottom-left in canvas px
uniform float uTime;
uniform float uDpr;
uniform float uChop;
uniform vec4 uRipples[${MAX_RIPPLES}]; // x, y (css px, strip-local, y down), start time, strength

float swell(vec2 p) {
  return 0.55 * sin(p.x * 0.011 + uTime * 0.7) + 0.35 * sin(p.x * 0.023 - uTime * 1.1 + 1.3)
       + 0.2 * sin(p.x * 0.051 + p.y * 0.02 + uTime * 1.9) * (0.4 + uChop);
}

// returns height + gradient (xy)
vec3 field(vec2 p) {
  float h = swell(p);
  vec2 g = vec2(0.55 * 0.011 * cos(p.x * 0.011 + uTime * 0.7) + 0.35 * 0.023 * cos(p.x * 0.023 - uTime * 1.1 + 1.3), 0.0);
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRipples[i];
    if (r.w <= 0.0) continue;
    float age = uTime - r.z;
    if (age < 0.0 || age > 3.0) continue;
    vec2 d = p - r.xy;
    float dist = length(d) + 1e-3;
    float front = age * 320.0;
    float env = r.w * exp(-age * 1.5) * exp(-dist * 0.006) * smoothstep(front + 30.0, front - 60.0, dist);
    float ph = dist * 0.075 - age * 14.0;
    h += env * sin(ph) * 2.2;
    g += env * cos(ph) * 0.075 * 2.2 * (d / dist);
  }
  return vec3(h, g);
}

vec3 studio(vec3 r) {
  float y = r.y * 0.5 + 0.5;
  vec3 c = mix(vec3(0.015, 0.015, 0.02), vec3(0.38, 0.41, 0.46), smoothstep(0.3, 1.0, y));
  c += vec3(1.8) * smoothstep(0.88, 0.9, y) * (1.0 - smoothstep(0.92, 0.95, y)); // softbox band
  c += vec3(0.7) * smoothstep(0.66, 0.67, y) * (1.0 - smoothstep(0.68, 0.70, y));
  c += vec3(0.25, 0.27, 0.3) * smoothstep(0.2, 0.0, y); // floor bounce
  c += vec3(1.0, 0.62, 0.67) * pow(max(r.x, 0.0), 6.0) * 1.4;   // rose gold rim
  c += vec3(0.31, 0.89, 0.76) * pow(max(-r.x, 0.0), 6.0) * 1.2; // mint rim
  return c;
}

void main() {
  vec2 frag = gl_FragCoord.xy - uOrigin;           // device px, y up
  vec2 p = vec2(frag.x, uRes.y - frag.y) / uDpr;   // css px, y down (matches ripple coords)
  vec2 size = uRes / uDpr;
  vec3 f = field(p);
  float h = f.x;

  // ribbon with liquid edges
  float mid = size.y * 0.5 + h * 3.0;
  float halfW = size.y * 0.2 + h * 1.6;
  float dEdge = halfW - abs(p.y - mid);
  float alpha = smoothstep(-1.0, 1.5, dEdge);
  if (alpha < 0.01) { gl_FragColor = vec4(0.0); return; }

  // pseudo-3D normal: gradient + meniscus curvature toward the edges
  float across = clamp((p.y - mid) / max(halfW, 1.0), -1.0, 1.0);
  vec3 n = normalize(vec3(-f.y * 14.0, across * 1.15 - f.z * 14.0, 1.0));
  vec3 v = vec3(0.0, 0.0, 1.0);
  vec3 r = reflect(-v, n);
  vec3 col = studio(r);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  col = mix(col, vec3(0.9, 0.93, 0.97), fres * 0.35);
  col *= 0.9 + 0.1 * sin(p.x * 0.004 + uTime * 0.2);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[mercury]', gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export function MercuryProvider({ children }) {
  const canvasRef = useRef(null);
  const strips = useRef(new Map()); // el -> { ripples: [] }

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, depth: false });
    if (!gl) return undefined;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return undefined;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const u = { res: U('uRes'), origin: U('uOrigin'), time: U('uTime'), dpr: U('uDpr'), chop: U('uChop'), ripples: U('uRipples') };
    gl.enable(gl.SCISSOR_TEST);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener('resize', resize);

    const t0 = performance.now();
    let lastSpawn = 0;
    let chop = 0;
    let raf = 0;
    let drewLast = true;
    const flat = new Float32Array(MAX_RIPPLES * 4);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const time = (performance.now() - t0) / 1000;
      const vh = window.innerHeight;
      chop += (Math.min(Math.abs(scrollState.velocity) / 40, 1) - chop) * 0.08;
      const onScreen = [];
      strips.current.forEach((state, el) => {
        const b = el.getBoundingClientRect();
        if (b.bottom >= 0 && b.top <= vh && b.width > 0) onScreen.push([state, b]);
      });
      if (!onScreen.length && !drewLast) return; // nothing visible: zero GPU work
      drewLast = onScreen.length > 0;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.scissor(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      onScreen.forEach(([state, b]) => {

        // spawn ripples from cursor speed while hovering this strip
        const inside = pointerState.px >= b.left && pointerState.px <= b.right && pointerState.py >= b.top - 30 && pointerState.py <= b.bottom + 30;
        if (!reduce && inside && pointerState.speed > 2 && time - lastSpawn > 0.06) {
          lastSpawn = time;
          state.ripples.push([pointerState.px - b.left, pointerState.py - b.top, time, Math.min(pointerState.speed / 25, 1.6)]);
          if (state.ripples.length > MAX_RIPPLES) state.ripples.shift();
        }
        flat.fill(0);
        state.ripples.forEach((r, i) => flat.set(r, i * 4));

        const x = Math.round(b.left * dpr);
        const y = Math.round((vh - b.bottom) * dpr);
        const w = Math.round(b.width * dpr);
        const h = Math.round(b.height * dpr);
        gl.viewport(x, y, w, h);
        gl.scissor(Math.max(0, x), Math.max(0, y), w, h);
        gl.uniform2f(u.res, w, h);
        gl.uniform2f(u.origin, x, y);
        gl.uniform1f(u.time, reduce ? 0 : time);
        gl.uniform1f(u.dpr, dpr);
        gl.uniform1f(u.chop, chop);
        gl.uniform4fv(u.ripples, flat);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      });
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    <Ctx.Provider value={strips}>
      {children}
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5]" />
    </Ctx.Provider>
  );
}

export function MercuryDivider({ className = '' }) {
  const strips = useContext(Ctx);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!strips || !el) return undefined;
    strips.current.set(el, { ripples: [] });
    return () => strips.current.delete(el);
  }, [strips]);
  return <div ref={ref} aria-hidden="true" className={`relative h-24 w-full md:h-28 ${className}`} />;
}
