'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { EffectComposer, ChromaticAberration, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useStore, useMode } from '@/lib/store';
import { TIER } from '@/lib/quality';
import { introState } from '@/lib/intro';
import { scrollState, pointerState } from '@/lib/scrollState';
import { playPop, audioUnlocked } from '@/lib/audio';
import { optimized } from '@/content/media';
import { RainEffect } from './shaders/RainEffect';
import { TransitionEffect } from './shaders/TransitionEffect';

/**
 * Photographic hero. Everything is real photography; WebGL only adds motion:
 *
 *   PhotoPlane  the hero photo, cover-fit to the viewport, with an arrival
 *               zoom-out, pointer parallax, a liquid ripple that follows the
 *               cursor, and a subtle weather grade (day / night / rain).
 *   Cutouts     up to three gelato photos with transparent backgrounds that
 *               drop in, bounce and squash on landing (pop sound once the
 *               visitor has interacted), bob gently, and pop again on click.
 *   LaMa        optional llama cutout peeking from the bottom edge; click it
 *               for the hidden perk.
 *   Post        rain on the glass, film grain, scroll-speed chromatic
 *               aberration, and the obsidian melt as the hero scrolls away.
 *
 * Orthographic camera: 1 world unit = 1 CSS pixel.
 */

const GRADE = {
  day: { tint: [1, 1, 1], lift: 1 },
  night: { tint: [0.9, 0.92, 1.0], lift: 0.9 },
  rain: { tint: [0.86, 0.9, 1.0], lift: 0.88 },
};

/* ------------------------------------------------------------------------ */
const photoVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const photoFragment = /* glsl */ `
uniform sampler2D uTex;
uniform float uHasTex;
uniform vec2 uView;
uniform vec2 uImg;
uniform vec2 uFocal;
uniform float uZoom;
uniform vec2 uOffset;
uniform vec2 uPointer;
uniform float uRipple;
uniform float uTime;
uniform vec3 uTint;
uniform float uLift;
uniform float uDim;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  // liquid ripple around the cursor
  vec2 d = vUv - uPointer;
  d.x *= uView.x / uView.y;
  float r = length(d);
  float wave = sin(r * 70.0 - uTime * 7.0) * exp(-r * 10.0) * uRipple;
  uv += (d / max(r, 1e-4)) * wave * 0.0035;

  vec3 col;
  if (uHasTex > 0.5) {
    // cover-fit, then zoom about the focal point
    float va = uView.x / uView.y;
    float ia = uImg.x / uImg.y;
    vec2 scale = va > ia ? vec2(1.0, ia / va) : vec2(va / ia, 1.0);
    vec2 tuv = (uv - 0.5) * scale + 0.5;
    tuv = (tuv - uFocal) / uZoom + uFocal + uOffset;
    col = texture2D(uTex, clamp(tuv, 0.001, 0.999)).rgb;
  } else {
    // no photo yet: quiet studio gradient
    float g = smoothstep(1.1, 0.0, length((uv - vec2(0.62, 0.45)) * vec2(1.6, 1.0)));
    col = mix(vec3(0.004), vec3(0.03, 0.03, 0.035), g);
  }
  col *= uTint * uLift * uDim;
  // gentle darkening toward the copy (left and bottom) so type stays legible
  float shade = smoothstep(0.75, 0.0, vUv.x) * 0.35 + smoothstep(0.45, 0.0, vUv.y) * 0.35;
  col *= 1.0 - shade * uHasTex;
  gl_FragColor = vec4(col, 1.0);
}`;

function LoadedPhoto({ url, ...props }) {
  const tex = useLoader(THREE.TextureLoader, url);
  return <PhotoPlane tex={tex} {...props} />;
}

function PhotoPlane({ tex = null, focal = [0.5, 0.5], dim = 1 }) {
  const { size } = useThree();
  const mode = useMode();
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: photoVertex,
        fragmentShader: photoFragment,
        uniforms: {
          uTex: { value: null },
          uHasTex: { value: 0 },
          uView: { value: new THREE.Vector2(1, 1) },
          uImg: { value: new THREE.Vector2(1, 1) },
          uFocal: { value: new THREE.Vector2(...focal) },
          uZoom: { value: 1 },
          uOffset: { value: new THREE.Vector2() },
          uPointer: { value: new THREE.Vector2(0.5, 0.5) },
          uRipple: { value: 0 },
          uTime: { value: 0 },
          uTint: { value: new THREE.Vector3(1, 1, 1) },
          uLift: { value: 1 },
          uDim: { value: dim },
        },
        depthWrite: false,
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!tex?.image) return;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    material.uniforms.uTex.value = tex;
    material.uniforms.uHasTex.value = 1;
    material.uniforms.uImg.value.set(tex.image.width, tex.image.height);
  }, [tex, material]);

  const ptr = useRef(new THREE.Vector2(0.5, 0.5));
  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uView.value.set(size.width, size.height);
    // arrival: start close and settle out
    const a = introState.dolly;
    const exit = introState.exit;
    u.uZoom.value = 1.06 + (1 - a) * 0.32 + exit * 0.12;
    // parallax (photo drifts opposite the pointer)
    u.uOffset.value.lerp(new THREE.Vector2(-state.pointer.x * 0.008, -state.pointer.y * 0.006), 1 - Math.exp(-dt * 3));
    // ripple follows the cursor, strength from cursor speed
    ptr.current.set(state.pointer.x * 0.5 + 0.5, state.pointer.y * 0.5 + 0.5);
    u.uPointer.value.lerp(ptr.current, 1 - Math.exp(-dt * 8));
    const target = Math.min(1, pointerState.speed / 30);
    u.uRipple.value += (target - u.uRipple.value) * (1 - Math.exp(-dt * 4));
    // weather grade
    const g = GRADE[mode];
    const k = 1 - Math.exp(-dt * 2);
    u.uTint.value.lerp(new THREE.Vector3(...g.tint), k);
    u.uLift.value += (g.lift - u.uLift.value) * k;
    u.uDim.value += (dim - u.uDim.value) * k;
  });

  return (
    <mesh material={material} renderOrder={0}>
      <planeGeometry args={[size.width, size.height]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------------ */
const shadowMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: photoVertex,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float d = length((vUv - 0.5) * vec2(2.0, 2.0));
        gl_FragColor = vec4(0.0, 0.0, 0.0, smoothstep(1.0, 0.0, d) * uOpacity);
      }`,
  });

function layoutFor(count, w, h) {
  const wide = w / h >= 1.05;
  if (wide) {
    // centred between the copy (left) and the case list (right)
    const cx = w * 0.04;
    const base = -h * 0.5 + h * 0.15;
    const big = h * 0.44;
    const small = h * 0.33;
    const slots = [
      { x: cx, y: base, h: big, z: 3 },
      { x: cx - w * 0.115, y: base + h * 0.05, h: small, z: 2 },
      { x: cx + w * 0.115, y: base + h * 0.05, h: small, z: 1 },
    ];
    return slots.slice(0, count);
  }
  const base = -h * 0.5 + h * 0.24;
  const slots = [
    { x: 0, y: base, h: h * 0.27, z: 3 },
    { x: -w * 0.27, y: base + h * 0.03, h: h * 0.2, z: 2 },
    { x: w * 0.27, y: base + h * 0.03, h: h * 0.2, z: 1 },
  ];
  return slots.slice(0, count);
}

function Cutout({ url, slot, index, reducedMotion }) {
  const tex = useLoader(THREE.TextureLoader, url);
  const group = useRef(null);
  const body = useRef(null);
  const shadowMat = useMemo(shadowMaterial, []);
  const dropped = useStore((s) => s.scoopsDropped);
  const nonce = useStore((s) => s.restackNonce);
  const sound = useStore((s) => s.sound);
  const st = useRef({ y: 0, vy: 0, s: 0, vs: 0, phase: 'held', delay: 0, spin: 0, hover: 0 });

  const aspect = tex.image ? tex.image.width / tex.image.height : 1;
  const hgt = slot.h;
  const wid = hgt * aspect;
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(wid, hgt);
    g.translate(0, hgt / 2, 0); // pivot at the base so squash grows from the floor
    return g;
  }, [wid, hgt]);
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
  }, [tex]);

  // (re)drop: start above the frame, fall in with a stagger
  const startDrop = (delay) => {
    const s = st.current;
    s.phase = 'falling';
    s.delay = delay;
    s.y = window.innerHeight * 0.75 + hgt;
    s.vy = 0;
  };
  useEffect(() => {
    if (!dropped) {
      st.current.phase = 'held';
      return;
    }
    if (reducedMotion) {
      st.current.phase = 'rest';
      st.current.y = 0;
      return;
    }
    startDrop(index * 0.14);
  }, [dropped, nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30);
    const s = st.current;
    if (s.phase === 'falling') {
      if (s.delay > 0) s.delay -= dt;
      else {
        s.vy -= 5200 * dt;
        s.y += s.vy * dt;
        if (s.y <= 0) {
          s.y = 0;
          const impact = Math.min(1, Math.abs(s.vy) / 2600);
          s.vs += impact * 9;
          if (Math.abs(s.vy) > 380) {
            s.vy = -s.vy * 0.26;
          } else {
            s.vy = 0;
            s.phase = 'rest';
          }
          if (impact > 0.3 && sound && audioUnlocked()) playPop(index, true);
        }
      }
    }
    // squash spring
    s.vs += (-280 * s.s - 15 * s.vs) * dt;
    s.s += s.vs * dt;
    s.spin *= Math.exp(-dt * 3);
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const bob = s.phase === 'rest' && !reducedMotion ? Math.sin(t * 1.3 + index * 1.7) * 4 : 0;
    s.hover += ((body.current?.userData.hovered ? 1 : 0) - s.hover) * (1 - Math.exp(-dt * 10));
    const px = state.pointer.x * (10 + slot.z * 6);
    const py = state.pointer.y * (6 + slot.z * 3);
    const held = s.phase === 'held';
    g.visible = !held;
    g.position.set(slot.x + px, slot.y + s.y + bob + s.hover * 12 + py, slot.z);
    const sq = THREE.MathUtils.clamp(s.s, -0.5, 0.8);
    g.scale.set(1 + 0.12 * sq + s.hover * 0.03, 1 - 0.16 * sq + s.hover * 0.03, 1);
    g.rotation.z = Math.sin(s.spin * 10) * 0.08 * s.spin + state.pointer.x * 0.02 * slot.z;
    // contact shadow tightens and darkens as the scoop nears the floor
    const near = Math.exp(-Math.max(0, s.y) / 160);
    shadowMat.uniforms.uOpacity.value = held ? 0 : 0.42 * near;
  });

  return (
    <group>
      <mesh position={[slot.x, slot.y - 2, slot.z - 0.5]} material={shadowMat} scale={[wid * 0.85, hgt * 0.09, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <group ref={group}>
        <mesh
          ref={body}
          geometry={geometry}
          renderOrder={2 + slot.z}
          onPointerOver={(e) => {
            e.stopPropagation();
            body.current.userData.hovered = true;
            document.body.dataset.cursor = 'grab-scoop';
          }}
          onPointerOut={() => {
            body.current.userData.hovered = false;
            delete document.body.dataset.cursor;
          }}
          onClick={(e) => {
            e.stopPropagation();
            const s = st.current;
            if (s.phase === 'held') return;
            s.phase = 'falling';
            s.delay = 0;
            s.vy = 1500;
            s.spin = 1;
            s.vs -= 3;
            playPop(index, sound);
          }}
        >
          <meshBasicMaterial map={tex} transparent alphaTest={0.02} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Llama({ url }) {
  const tex = useLoader(THREE.TextureLoader, url);
  const { size } = useThree();
  const openPerk = useStore((s) => s.openPerk);
  const ref = useRef(null);
  const st = useRef({ hover: 0, hop: -1 });
  const h = Math.min(size.height * 0.16, 160);
  const w = tex.image ? (h * tex.image.width) / tex.image.height : h;
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  }, [tex]);
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = st.current;
    s.hover += ((ref.current?.userData.hovered ? 1 : 0) - s.hover) * (1 - Math.exp(-dt * 8));
    const x = -size.width / 2 + w * 0.9;
    let y = -size.height / 2 + h * 0.15 + s.hover * h * 0.35; // peeks from the bottom edge
    let rot = 0;
    if (s.hop >= 0) {
      s.hop += dt / 0.9;
      const t = Math.min(1, s.hop);
      y += 4 * h * 1.2 * t * (1 - t);
      rot = t * Math.PI * 2;
      if (t >= 1) s.hop = -1;
    }
    ref.current.position.set(x, y, 5);
    ref.current.rotation.z = rot;
  });
  return (
    <mesh
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        ref.current.userData.hovered = true;
        document.body.dataset.cursor = 'llama';
      }}
      onPointerOut={() => {
        ref.current.userData.hovered = false;
        delete document.body.dataset.cursor;
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (st.current.hop >= 0) return;
        st.current.hop = 0;
        setTimeout(openPerk, 650);
      }}
    >
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.02} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------------ */
const OBSIDIAN = new THREE.Color('#0A0A0C');

function Effects({ tier, mode }) {
  const ca = useRef(null);
  const rain = useRef(null);
  const transition = useRef(null);
  const rainLevel = useRef(mode === 'rain' ? 1 : 0);
  useFrame((_, d) => {
    const v = Math.abs(scrollState.velocity);
    const amt = 0.0003 + Math.min(v * 0.00005, 0.003);
    ca.current?.offset?.set(amt, amt * 0.6);
    const k = 1 - Math.exp(-Math.min(d, 0.05) * 1.5);
    rainLevel.current += ((mode === 'rain' ? 1 : 0) - rainLevel.current) * k;
    const u = rain.current?.uniforms?.get('uStrength');
    if (u) u.value = rainLevel.current;
    const tu = transition.current?.uniforms;
    if (tu) {
      tu.get('uScan').value = introState.scan;
      tu.get('uMelt').value = THREE.MathUtils.smoothstep(introState.exit, 0.3, 0.97);
      tu.get('uBg').value.copy(OBSIDIAN);
    }
  });
  const showRain = mode === 'rain' || rainLevel.current > 0.01;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {showRain ? <RainEffect ref={rain} strength={rainLevel.current} low={tier === 'low'} /> : null}
      <ChromaticAberration ref={ca} radialModulation modulationOffset={0.35} offset={[0.0003, 0.0002]} />
      <Vignette offset={0.3} darkness={mode === 'day' ? 0.25 : 0.5} />
      <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.12} />
      <TransitionEffect ref={transition} />
    </EffectComposer>
  );
}

function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    if (introState.ready) return;
    frames.current += 1;
    if (frames.current > 2) introState.ready = true;
  });
  return null;
}

function FrameThrottle({ fps }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = setInterval(() => invalidate(), 1000 / fps);
    return () => clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

function Scene({ hero, focal, items, llama, reducedMotion }) {
  const { size } = useThree();
  const slots = layoutFor(items.length, size.width, size.height);
  return (
    <>
      {hero ? (
        <LoadedPhoto url={optimized(hero, 2048)} focal={focal} dim={items.length ? 0.78 : 1} />
      ) : (
        <PhotoPlane focal={focal} dim={1} />
      )}
      {items.map((c, i) => (
        <Cutout key={c.src} url={optimized(c.src, 1080)} slot={slots[i]} index={i} reducedMotion={reducedMotion} />
      ))}
      {llama ? <Llama url={optimized(llama, 640)} /> : null}
      <ReadySignal />
    </>
  );
}

export default function HeroStage({ hero, focal = [0.5, 0.5], cutouts = [], llama = null, active = true, reducedMotion = false }) {
  const tier = useStore((s) => s.tier);
  const mode = useMode();
  const t = TIER[tier] ?? TIER.mid;
  const throttled = t.fps < 60;
  const frameloop = !active ? 'never' : throttled ? 'demand' : 'always';
  const items = cutouts.slice(0, 3);

  return (
    <Canvas
      orthographic
      dpr={[1, Math.min(2, t.maxDpr)]}
      frameloop={frameloop}
      camera={{ position: [0, 0, 500], zoom: 1, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      aria-hidden="true"
    >
      <color attach="background" args={['#0A0A0C']} />
      {throttled && active ? <FrameThrottle fps={t.fps} /> : null}
      <Suspense fallback={null}>
        <Scene hero={hero} focal={focal} items={items} llama={llama} reducedMotion={reducedMotion} />
      </Suspense>
      <Effects tier={tier} mode={mode} />
    </Canvas>
  );
}
