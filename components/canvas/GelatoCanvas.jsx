'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshReflectorMaterial, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, DepthOfField, Vignette, ToneMapping, Noise } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useStore, useMode } from '@/lib/store';
import { TIER } from '@/lib/quality';
import { scrollState } from '@/lib/scrollState';
import { sharedGelatoUniforms } from './shaders/gelatoMaterial';
import { RainEffect } from './shaders/RainEffect';
import { TransitionEffect } from './shaders/TransitionEffect';
import { introState } from '@/lib/intro';
import { VesselMesh } from './Vessel';
import ScoopStack from './ScoopStack';
import CoffeeSteam from './CoffeeSteam';
import LlamaMascot from './LlamaMascot';

/* ------------------------------------------------------------------------ */
/* Weather-driven look                                                       */
/* ------------------------------------------------------------------------ */

export const LOOKS = {
  day: {
    bg: '#E4E8EE', fogNear: 14, fogFar: 36, floor: '#E9ECF1', floorMetal: 0.15, floorRough: 0.35,
    hemi: 0.9, hemiSky: '#FFFFFF', hemiGround: '#CCD3DC',
    key: 2.4, keyColor: '#FFF6EC', pool: 0.6, rim: 1.2, rimColor: '#DCE8FF', rim2: 0.4,
    gelatoKey: 1.0, sss: 0.9, rain: 0,
  },
  night: {
    bg: '#0A0A0C', fogNear: 12, fogFar: 28, floor: '#0B0B0E', floorMetal: 0.6, floorRough: 0.42,
    hemi: 0.06, hemiSky: '#8A93A6', hemiGround: '#0A0A0C',
    key: 1.6, keyColor: '#FFF1E6', pool: 2.6, rim: 3.2, rimColor: '#E8EEFF', rim2: 1.1,
    gelatoKey: 0.85, sss: 1.0, rain: 0,
  },
  rain: {
    bg: '#080B10', fogNear: 10, fogFar: 24, floor: '#0A0D12', floorMetal: 0.7, floorRough: 0.3,
    hemi: 0.07, hemiSky: '#7D8DA8', hemiGround: '#05070B',
    key: 1.2, keyColor: '#DCE8FF', pool: 2.2, rim: 3, rimColor: '#CFE3FF', rim2: 0.9,
    gelatoKey: 0.8, sss: 1.0, rain: 1,
  },
};

const TARGET = new THREE.Vector3(0, 2.3, 0);
// Shared with SceneMood so fog distances follow the camera on tall screens.
const rigState = { radius: 10.5 };
// fog follows the camera radius (tall screens pull the camera back)

function SceneMood({ mode, tier }) {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const hemi = useRef(null);
  const key = useRef(null);
  const rim = useRef(null);
  const rim2 = useRef(null);
  const pool = useRef(null);
  const c = useMemo(() => new THREE.Color(), []);
  const v = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    const look = LOOKS[mode];
    scene.background = new THREE.Color(look.bg);
    scene.fog = new THREE.Fog(look.bg, look.fogNear, look.fogFar);
  }, [scene]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, rawDelta) => {
    const k = 1 - Math.exp(-Math.min(rawDelta, 0.05) * 3);
    const look = LOOKS[mode];
    scene.background.lerp(c.set(look.bg), k);
    scene.fog.color.copy(scene.background);
    const extra = rigState.radius - 10.5;
    scene.fog.near += (look.fogNear + extra - scene.fog.near) * k;
    scene.fog.far += (look.fogFar + extra - scene.fog.far) * k;

    hemi.current.intensity += (look.hemi - hemi.current.intensity) * k;
    hemi.current.color.lerp(c.set(look.hemiSky), k);
    hemi.current.groundColor.lerp(c.set(look.hemiGround), k);
    key.current.intensity += (look.key - key.current.intensity) * k;
    key.current.color.lerp(c.set(look.keyColor), k);
    rim.current.intensity += (look.rim - rim.current.intensity) * k;
    rim.current.color.lerp(c.set(look.rimColor), k);
    rim2.current.intensity += (look.rim2 - rim2.current.intensity) * k;
    pool.current.intensity += (look.pool - pool.current.intensity) * k;

    // feed the gelato SSS shader a view-space key direction
    v.copy(key.current.position).sub(TARGET).normalize().transformDirection(camera.matrixWorldInverse);
    sharedGelatoUniforms.uKeyDir.value.copy(v);
    sharedGelatoUniforms.uKeyIntensity.value += (look.gelatoKey - sharedGelatoUniforms.uKeyIntensity.value) * k;
    sharedGelatoUniforms.uSSSStrength.value += (look.sss - sharedGelatoUniforms.uSSSStrength.value) * k;
  });

  const shadows = tier !== 'low';
  return (
    <>
      <hemisphereLight ref={hemi} intensity={0.2} />
      <directionalLight
        ref={key}
        position={[3, 9, 6]}
        intensity={1}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={6}
        shadow-camera-bottom={-3}
        shadow-camera-near={1}
        shadow-camera-far={25}
      />
      {/* studio: overhead pool on the plinth, cool rim behind-left, faint rose kicker behind-right */}
      <spotLight ref={pool} position={[0, 11, 0.6]} angle={0.3} penumbra={1} intensity={0} distance={0} decay={0} />
      <spotLight ref={rim} position={[-5, 5.5, -6]} angle={0.45} penumbra={0.9} intensity={1} distance={0} decay={0} />
      <spotLight ref={rim2} position={[5.5, 3.5, -5]} angle={0.4} penumbra={1} intensity={0} color="#FFB3BE" distance={0} decay={0} />
    </>
  );
}

function EnvironmentRig({ mode }) {
  // Procedural studio environment (no HDR download): softbox overhead, tall
  // strip lights for long clean reflections in the glass and chrome.
  return (
    <Environment key={mode} resolution={256} frames={1}>
      {mode === 'day' ? (
        <>
          <Lightformer form="rect" intensity={3.5} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[12, 6, 1]} color="#FFFFFF" />
          <Lightformer form="rect" intensity={2.4} position={[-6, 2.5, 1]} rotation-y={Math.PI / 2} scale={[1.2, 8, 1]} color="#FFFFFF" />
          <Lightformer form="rect" intensity={1.8} position={[6, 2.5, -1]} rotation-y={-Math.PI / 2} scale={[1.2, 8, 1]} color="#F2F6FF" />
          <Lightformer form="rect" intensity={1} position={[0, 2, 8]} scale={[10, 4, 1]} color="#FFFFFF" />
        </>
      ) : (
        <>
          <Lightformer form="rect" intensity={1.6} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[5, 2, 1]} color="#FFFFFF" />
          <Lightformer form="rect" intensity={3} position={[-5.5, 2.5, -2]} rotation-y={Math.PI / 3} scale={[0.35, 9, 1]} color="#EEF2FF" />
          <Lightformer form="rect" intensity={1.2} position={[5.5, 2.5, -2]} rotation-y={-Math.PI / 3} scale={[0.25, 9, 1]} color={mode === 'rain' ? '#9FD8FF' : '#FF9EAA'} />
          <Lightformer form="rect" intensity={0.8} position={[3, 2, 6]} rotation-y={-Math.PI / 6} scale={[0.2, 6, 1]} color="#50E3C2" />
        </>
      )}
    </Environment>
  );
}

/* ------------------------------------------------------------------------ */
/* Camera: 360° horizontal drag with inertia, pointer parallax, view offset  */
/* ------------------------------------------------------------------------ */

const REST_POLAR = 1.36;
const _look = new THREE.Vector3();
const ease = (t) => t * t * (3 - 2 * t);

function CameraRig({ reducedMotion }) {
  const { camera, gl, size } = useThree();
  const st = useRef({ az: 0.5, vel: 0, dragging: false, lastX: 0, polar: REST_POLAR, idle: 0 });

  // Product-shot framing. Wide screens: subject sits right of centre (copy on the
  // left, selector on the right). Tall screens: subject sits low, under the
  // headline. A camera view offset keeps the orbit pivot on the coupe itself.
  useLayoutEffect(() => {
    const { width: w, height: h } = size;
    const aspect = w / h;
    camera.manual = true;
    // subject a touch right of centre and slightly low, between the four corners
    if (aspect >= 1.05) camera.setViewOffset(w * 1.1, h * 1.08, 0, h * 0.02, w, h);
    else camera.setViewOffset(w, h * 1.12, 0, h * 0.03, w, h);
    camera.updateProjectionMatrix();
    // keep the whole coupe + stack (~4.6 units tall) inside ~78% of the frame height
    const vfit = 2.95 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const hfit = 2.4 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
    rigState.radius = st.current.radius = THREE.MathUtils.clamp(Math.max(vfit, hfit), 10, 22);
  }, [camera, size]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'pan-y';
    const s = st.current;
    const down = (e) => {
      s.dragging = true;
      s.lastX = e.clientX;
      s.vel = 0;
    };
    const move = (e) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.lastX;
      s.lastX = e.clientX;
      s.vel = -dx * 0.0065;
      s.az += s.vel;
      s.idle = 0;
    };
    const up = () => {
      s.dragging = false;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [gl]);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = st.current;
    if (!s.dragging) {
      s.az += s.vel;
      s.vel *= Math.exp(-dt * 3.2); // inertia
      s.idle += dt;
      if (!reducedMotion && s.idle > 4) s.az += dt * 0.05; // slow showroom turntable
    }
    const tiltTarget = reducedMotion ? REST_POLAR : REST_POLAR - state.pointer.y * 0.05;
    s.polar += (tiltTarget - s.polar) * (1 - Math.exp(-dt * 2));

    // arrival: crane up from a macro shot of the stem while pulling back
    const a = introState.dolly;
    const away = 1 - a;
    // exit: push in and look down into the coupe as the scene melts
    const x = ease(Math.min(1, introState.exit * 1.3));
    const r = (s.radius ?? 10.5) * (0.36 + 0.64 * a) * (1 - 0.2 * x);
    const polar = s.polar + away * 0.2 - x * 0.22;
    const az = s.az - away * 1.15;
    _look.set(TARGET.x, TARGET.y - away * 1.25 + x * 0.35, TARGET.z);
    camera.position.set(
      _look.x + r * Math.sin(polar) * Math.sin(az),
      _look.y + r * Math.cos(polar),
      _look.z + r * Math.sin(polar) * Math.cos(az),
    );
    camera.lookAt(_look);
  });
  return null;
}

/** Flags the intro once the scene has actually drawn a few frames. */
function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    if (introState.ready) return;
    frames.current += 1;
    if (frames.current > 3) introState.ready = true;
  });
  return null;
}

/* ------------------------------------------------------------------------ */

function Floor({ mode, tier }) {
  const mat = useRef(null);
  const c = useMemo(() => new THREE.Color(), []);
  useFrame((_, d) => {
    if (!mat.current) return;
    const k = 1 - Math.exp(-Math.min(d, 0.05) * 3);
    mat.current.color.lerp(c.set(LOOKS[mode].floor), k);
    mat.current.metalness += (LOOKS[mode].floorMetal - mat.current.metalness) * k;
    mat.current.roughness += (LOOKS[mode].floorRough - mat.current.roughness) * k;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[30, 64]} />
      {tier === 'high' ? (
        <MeshReflectorMaterial
          ref={mat}
          resolution={512}
          mixBlur={1.2}
          mixStrength={mode === 'day' ? 1 : 2.2}
          blur={[300, 80]}
          roughness={0.75}
          depthScale={0.8}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.4}
          mirror={0.6}
          metalness={0.6}
          color="#0D0D11"
        />
      ) : (
        <meshStandardMaterial ref={mat} roughness={0.55} metalness={0.5} color="#0D0D11" />
      )}
    </mesh>
  );
}

const OBSIDIAN = new THREE.Color('#0A0A0C');

function Effects({ tier, mode }) {
  const ca = useRef(null);
  const rain = useRef(null);
  const transition = useRef(null);
  const rainLevel = useRef(LOOKS[mode].rain);
  useFrame((_, d) => {
    const v = Math.abs(scrollState.velocity);
    const amt = 0.0004 + Math.min(v * 0.00005, 0.003);
    ca.current?.offset?.set(amt, amt * 0.6);
    const k = 1 - Math.exp(-Math.min(d, 0.05) * 1.5);
    rainLevel.current += (LOOKS[mode].rain - rainLevel.current) * k;
    const u = rain.current?.uniforms?.get('uStrength');
    if (u) u.value = rainLevel.current;
    const tu = transition.current?.uniforms;
    if (tu) {
      tu.get('uScan').value = introState.scan;
      const e = introState.exit;
      tu.get('uMelt').value = THREE.MathUtils.smoothstep(e, 0.3, 0.97);
      tu.get('uBg').value.copy(OBSIDIAN);
    }
  });
  const showRain = mode === 'rain' || rainLevel.current > 0.01;
  return (
    <EffectComposer multisampling={tier === 'low' ? 0 : 4} enableNormalPass={false}>
      {tier === 'high' ? <DepthOfField target={[0, 2.9, 0]} worldFocusRange={5} bokehScale={2.4} height={480} /> : null}
      <Bloom mipmapBlur intensity={mode === 'day' ? 0.2 : 0.45} luminanceThreshold={0.95} luminanceSmoothing={0.15} radius={0.6} />
      {showRain ? <RainEffect ref={rain} strength={rainLevel.current} low={tier === 'low'} /> : null}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <ChromaticAberration ref={ca} radialModulation modulationOffset={0.3} offset={[0.0004, 0.0003]} />
      <Vignette offset={0.25} darkness={mode === 'day' ? 0.3 : 0.72} />
      <Noise blendFunction={BlendFunction.OVERLAY} opacity={mode === 'day' ? 0.12 : 0.2} />
      <TransitionEffect ref={transition} />
    </EffectComposer>
  );
}

/** Caps frame rate (low tier) by driving a 'demand' frameloop from a timer. */
function FrameThrottle({ fps }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = setInterval(() => invalidate(), 1000 / fps);
    return () => clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

function QualityMonitor() {
  const setTier = useStore((s) => s.setTier);
  const tier = useStore((s) => s.tier);
  const setDpr = useStore((s) => s.setDpr);
  return (
    <PerformanceMonitor
      bounds={(refresh) => (refresh > 90 ? [50, 90] : [45, 58])}
      flipflops={3}
      onChange={({ factor }) => setDpr(Math.round((0.75 + factor * (TIER[tier].maxDpr - 0.75)) * 10) / 10)}
      onDecline={() => tier === 'high' && setTier('mid')}
      onFallback={() => setTier('low')}
    />
  );
}

/* ------------------------------------------------------------------------ */

export default function GelatoCanvas({ active = true, reducedMotion = false }) {
  const tier = useStore((s) => s.tier);
  const dpr = useStore((s) => s.dpr);
  const mode = useMode();
  const t = TIER[tier] ?? TIER.mid;
  const throttled = t.fps < 60;
  const frameloop = !active ? 'never' : throttled ? 'demand' : 'always';

  return (
    <Canvas
      shadows={tier !== 'low' ? 'soft' : false}
      dpr={[1, Math.min(dpr, t.maxDpr)]}
      frameloop={frameloop}
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      camera={{ fov: 30, near: 0.1, far: 80, position: [3, 5, 10.5] }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
      }}
      aria-hidden="true"
    >
      <QualityMonitor />
      <ReadySignal />
      {throttled && active ? <FrameThrottle fps={t.fps} /> : null}
      <SceneMood mode={mode} tier={tier} />
      <CameraRig reducedMotion={reducedMotion} />
      <Suspense fallback={null}>
        <EnvironmentRig mode={mode} />
        <Floor mode={mode} tier={tier} />
        <VesselMesh tier={tier} mode={mode} />
        <ScoopStack active={active} detail={t.scoopDetail} />
        <CoffeeSteam count={t.steam} mode={mode} position={[-3.6, 0, -2.6]} rotation={[0, 0.6, 0]} scale={0.85} />
        <LlamaMascot burstCount={t.burst} position={[1.5, 0, 0.75]} rotation={[0, -2.2, 0]} scale={0.95} />
        <Effects tier={tier} mode={mode} />
      </Suspense>
    </Canvas>
  );
}
