'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, ShockWave, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { TIER } from '@/lib/quality';
import { STREAM_COLORS } from '@/lib/matcher';
import { MEDIA, optimized } from '@/content/media';

/**
 * Particle collider. Every particle's position is evaluated on the GPU from
 * (seed, time, a handful of uniforms) — the CPU only updates ~10 floats/frame.
 *
 *   core      swirling funnel; spin + tightness rise with each answer (uCharge)
 *   streams   one per question: on answer, its particles fly in from a compass
 *             direction, spiral inward and join the vortex in that colour
 *   collapse  everything implodes to the centre (uCollapse 0→1)
 *   burst     radial explosion (uBurst = seconds since detonation) + shockwave
 */

const vertex = /* glsl */ `
attribute vec4 aSeed;
attribute float aKind;
uniform float uTime;
uniform float uCharge;
uniform float uCollapse;
uniform float uBurst;
uniform float uPixel;
uniform vec4 uStream;      // start time per question stream, -1 = not yet
uniform vec3 uColors[5];
varying vec3 vColor;
varying float vAlpha;

void main() {
  float r0 = mix(0.55, 2.7, aSeed.x);
  float spin = (0.25 + aSeed.w * 0.5) * (0.35 + uCharge * 2.4);
  float ang = aSeed.y * 6.2831853 + uTime * spin / (0.35 + r0 * 0.45);
  float funnel = mix(1.7, 0.55, uCharge);
  float y = aSeed.z * (0.3 + 0.7 * aSeed.x) * funnel;
  float r = r0 * mix(1.0, 0.72, uCharge);
  vec3 color = uColors[0];
  float alpha = 0.7;
  float size = 1.0;

  if (aKind > 0.5) {
    int si = int(aKind + 0.5) - 1;
    float start = si == 0 ? uStream.x : si == 1 ? uStream.y : si == 2 ? uStream.z : uStream.w;
    if (start < 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }
    float t = uTime - start;
    float delay = aSeed.w * 0.75;
    float s = clamp((t - delay) / 1.0, 0.0, 1.0);
    s = s * s * (3.0 - 2.0 * s);
    float baseA = float(si) * 1.5707963 + 0.7853982;
    float rIn = mix(0.8, 2.2, aSeed.x);
    r = mix(7.5 + aSeed.x * 2.5, rIn, s) * mix(1.0, 0.72, uCharge);
    ang = mix(baseA + (aSeed.y - 0.5) * 0.3, baseA + 6.2831853 * 1.25, s) + uTime * spin * s / (0.35 + rIn * 0.45);
    y = mix(aSeed.z * 1.6 + sin(t * 3.0 + aSeed.y * 6.0) * 0.2, aSeed.z * 0.6 * funnel, s);
    color = uColors[si + 1];
    alpha = smoothstep(0.0, 0.08, t - delay);
    size = 1.35;
  }

  r *= 1.0 - uCollapse * 0.97;
  y *= 1.0 - uCollapse;
  vec3 p = vec3(cos(ang) * r, y, sin(ang) * r);

  if (uBurst >= 0.0) {
    vec3 dir = normalize(vec3(cos(ang), aSeed.z * 1.4, sin(ang)) + (aSeed.wxy - 0.5) * 0.5);
    float sp = 3.0 + aSeed.x * 10.0;
    p = dir * sp * uBurst * (1.0 - 0.22 * uBurst);
    alpha *= 1.0 - smoothstep(0.5, 2.0, uBurst);
    color = mix(vec3(1.4), color, smoothstep(0.0, 0.35, uBurst));
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float grow = uBurst >= 0.0 ? 1.0 : 1.0 + uCollapse * 1.4;
  gl_PointSize = min(size * (0.05 + 0.06 * aSeed.w) * uPixel * grow / max(0.1, -mv.z), 40.0);
  vColor = color * (0.9 + uCharge * 0.9 + uCollapse * 2.0);
  vAlpha = alpha;
}
`;

const fragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float core = 1.0 - smoothstep(0.0, 0.18, d);
  float glow = pow(1.0 - smoothstep(0.0, 0.5, d), 2.5);
  float a = (core * 0.9 + glow * 0.5) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

function Vortex({ count }) {
  const answers = useStore((s) => s.quizAnswers);
  const step = useStore((s) => s.quizStep);
  const phase = useStore((s) => s.quizPhase);
  const { size, viewport } = useThree();
  const startTimes = useRef([-1, -1, -1, -1]);
  const burstAt = useRef(-1);
  const collapseAt = useRef(-1);
  const charge = useRef(0);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(count * 4);
    const kind = new Float32Array(count);
    const coreCount = Math.floor(count * 0.45);
    for (let i = 0; i < count; i++) {
      seed.set([Math.random(), Math.random(), Math.random() * 2 - 1, Math.random()], i * 4);
      kind[i] = i < coreCount ? 0 : 1 + ((i - coreCount) % 4);
    }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    g.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uCharge: { value: 0 },
          uCollapse: { value: 0 },
          uBurst: { value: -1 },
          uPixel: { value: 600 },
          uStream: { value: new THREE.Vector4(-1, -1, -1, -1) },
          uColors: { value: ['#FFFFFF', ...STREAM_COLORS].map((c) => new THREE.Color(c)) },
        },
      }),
    [],
  );

  // which questions have been answered → stream start times
  const answeredFlags = [
    step > 0,
    !!answers.sweetness,
    !!answers.mood,
    !!answers.intensity,
  ];
  const clockRef = useRef(null);
  useFrame((state) => {
    clockRef.current = state.clock;
  });
  useEffect(() => {
    const now = clockRef.current?.elapsedTime ?? 0;
    answeredFlags.forEach((on, i) => {
      if (on && startTimes.current[i] < 0) startTimes.current[i] = now;
      if (!on) startTimes.current[i] = -1;
    });
  }); // runs each render; cheap

  useEffect(() => {
    const now = clockRef.current?.elapsedTime ?? 0;
    if (phase === 'charging') {
      collapseAt.current = now;
      burstAt.current = -1;
    } else if (phase === 'exploding') {
      burstAt.current = now;
    } else if (phase === 'idle') {
      collapseAt.current = -1;
      burstAt.current = -1;
    }
  }, [phase]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const u = material.uniforms;
    u.uTime.value = t;
    const answered = startTimes.current.filter((x) => x >= 0).length;
    charge.current += (answered / 4 - charge.current) * (1 - Math.exp(-Math.min(dt, 0.05) * 2));
    u.uCharge.value = charge.current;
    u.uStream.value.set(...startTimes.current);
    u.uCollapse.value = collapseAt.current < 0 ? 0 : THREE.MathUtils.smoothstep(t - collapseAt.current, 0, 0.75);
    u.uBurst.value = burstAt.current < 0 ? -1 : t - burstAt.current;
    if (phase === 'revealed' && t - burstAt.current > 2.2) u.uCollapse.value = 0; // vortex quietly returns behind the scoop
    u.uPixel.value = size.height * viewport.dpr * 1.2;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

/** Frames the collider right of the question card on wide screens. */
function Framing() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.manual = true;
    if (aspect >= 1.1) camera.setViewOffset(size.width * 1.45, size.height, 0, size.height * 0.04, size.width, size.height);
    else camera.setViewOffset(size.width, size.height * 1.25, 0, size.height * 0.02, size.width, size.height);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/** Soft energy core: grows with every answer, flares on collapse. */
const coreVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy;
  gl_Position = projectionMatrix * mv;
}`;
const coreFragment = /* glsl */ `
uniform float uCharge;
uniform float uFlare;
uniform float uTime;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float pulse = 0.85 + 0.15 * sin(uTime * 3.0);
  float core = exp(-d * d * (14.0 - uCharge * 6.0)) * (0.35 + uCharge * 1.1) * pulse;
  float halo = exp(-d * 3.2) * 0.25 * (0.4 + uCharge);
  vec3 col = mix(vec3(0.5, 0.88, 0.68), vec3(0.97, 0.91, 0.76), 0.5 + 0.5 * sin(uTime * 0.7));
  col = mix(col, vec3(1.0, 0.97, 0.84), core);
  float a = (core + halo) * (1.0 + uFlare * 4.0) * (1.0 - smoothstep(0.65, 1.0, d));
  gl_FragColor = vec4(col * (1.0 + uFlare * 3.0), a);
}`;

function EnergyCore() {
  const answers = useStore((s) => s.quizAnswers);
  const step = useStore((s) => s.quizStep);
  const phase = useStore((s) => s.quizPhase);
  const count = [step > 0, !!answers.sweetness, !!answers.mood, !!answers.intensity].filter(Boolean).length;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coreVertex,
        fragmentShader: coreFragment,
        uniforms: { uCharge: { value: 0 }, uFlare: { value: 0 }, uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  useFrame((state, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 3);
    const u = mat.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uCharge.value += (count / 4 - u.uCharge.value) * k;
    const flare = phase === 'charging' ? 1 : 0;
    u.uFlare.value += (flare - u.uFlare.value) * (phase === 'charging' ? k : 1 - Math.exp(-Math.min(dt, 0.05) * 6));
  });
  if (phase === 'revealed') return null;
  return (
    <mesh material={mat} renderOrder={5}>
      <planeGeometry args={[3.2, 3.2]} />
    </mesh>
  );
}

/**
 * The match "pops" out of the collision as a real photo:
 *   - a cutout (transparent PNG named after the flavor) if one exists,
 *   - otherwise the flavor's photo in a soft-edged disc,
 *   - otherwise a quiet orb in the flavor's colors (never a fake gelato render).
 */
const discFragment = /* glsl */ `
uniform sampler2D uTex;
uniform float uHasTex;
uniform float uCutout;
uniform float uImgAspect;
uniform vec3 uA;
uniform vec3 uB;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  if (uHasTex > 0.5 && uCutout > 0.5) {
    vec2 uv = vUv;
    if (uImgAspect > 1.0) uv.y = (uv.y - 0.5) * uImgAspect + 0.5; else uv.x = (uv.x - 0.5) / uImgAspect + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
    vec4 c = texture2D(uTex, uv);
    if (c.a < 0.02) discard;
    gl_FragColor = c;
    return;
  }
  float edge = 1.0 - smoothstep(0.96, 1.0, r);
  if (edge <= 0.0) discard;
  vec3 col;
  if (uHasTex > 0.5) {
    vec2 uv = vUv;
    if (uImgAspect > 1.0) uv.x = (uv.x - 0.5) / uImgAspect + 0.5; else uv.y = (uv.y - 0.5) * uImgAspect + 0.5;
    col = texture2D(uTex, uv).rgb;
  } else {
    float n = sin(p.x * 9.0 + uTime) * sin(p.y * 7.0 - uTime * 0.7) * 0.5 + 0.5;
    col = mix(uA, uB, smoothstep(0.0, 1.0, n * (1.0 - r * 0.6)));
  }
  float rim = smoothstep(0.86, 0.98, r) * edge;
  col += vec3(1.0, 0.97, 0.88) * rim * 0.35;
  gl_FragColor = vec4(col, edge);
}`;

function RevealPhoto({ src, isCutout, look }) {
  const tex = useMemo(() => {
    if (!src) return null;
    const t = new THREE.TextureLoader().load(src, (tt) => {
      mat.uniforms.uImgAspect.value = tt.image.width / tt.image.height;
      mat.uniforms.uHasTex.value = 1;
    });
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: discFragment,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uTex: { value: null },
          uHasTex: { value: 0 },
          uCutout: { value: isCutout ? 1 : 0 },
          uImgAspect: { value: 1 },
          uA: { value: new THREE.Color(look.colorA) },
          uB: { value: new THREE.Color(look.colorB) },
          uTime: { value: 0 },
        },
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    mat.uniforms.uTex.value = tex;
    return () => tex?.dispose();
  }, [tex, mat]);
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh material={mat}>
      <planeGeometry args={[2.6, 2.6]} />
    </mesh>
  );
}

function RevealScoop({ photos }) {
  const phase = useStore((s) => s.quizPhase);
  const result = useStore((s) => s.quizResult);
  const group = useRef(null);
  const s = useRef({ x: 0, v: 0 });
  const shown = phase === 'revealed' && result;
  const id = result?.flavor.id;
  const cut = id ? photos.cutouts[id] : null;
  const src = cut ?? (id ? photos.flavors[id] : null);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const target = shown ? 1 : 0;
    // springy pop with a little overshoot
    s.current.v += ((target - s.current.x) * 160 - s.current.v * 11) * dt;
    s.current.x += s.current.v * dt;
    const k = Math.max(0, s.current.x);
    group.current.scale.set(k * (1 + (k - 1) * 0.6), k * (1 - (k - 1) * 0.4), 1);
    group.current.visible = k > 0.01;
    group.current.position.y = 0.15 + Math.sin(state.clock.elapsedTime * 1.2) * 0.06;
    group.current.quaternion.copy(state.camera.quaternion); // always faces the viewer
  });

  return (
    <group ref={group} visible={false}>
      {result ? <RevealPhoto key={id} src={src} isCutout={Boolean(cut)} look={result.flavor.look} /> : null}
    </group>
  );
}

function Shock() {
  const ref = useRef(null);
  const phase = useStore((s) => s.quizPhase);
  useEffect(() => {
    if (phase === 'exploding') ref.current?.explode?.();
  }, [phase]);
  return <ShockWave ref={ref} position={[0, 0, 0]} speed={1.4} maxRadius={0.9} waveSize={0.22} amplitude={0.06} />;
}

const REVEAL_PHOTOS = {
  cutouts: Object.fromEntries(MEDIA.cutouts.map((c) => [c.id, optimized(c.src, 1080)])),
  flavors: Object.fromEntries(Object.entries(MEDIA.flavors).map(([k, v]) => [k, optimized(v, 1080)])),
};

export default function ParticleCollider({ active = true }) {
  const tier = useStore((s) => s.tier);
  const t = TIER[tier] ?? TIER.mid;
  return (
    <Canvas
      dpr={[1, t.maxDpr]}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 38, position: [0, 2.2, 9.5] }}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      aria-hidden="true"
    >
      <color attach="background" args={['#0A2D1E']} />
      <ambientLight intensity={0.25} />
      <Framing />
      <EnergyCore />
      <Vortex count={t.vortex} />
      <RevealScoop photos={REVEAL_PHOTOS} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.25} luminanceThreshold={0.85} radius={0.75} />
        <Shock />
        <Vignette offset={0.25} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
