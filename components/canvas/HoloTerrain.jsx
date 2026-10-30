'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import Anchor from './Anchor';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { TIER } from '@/lib/quality';

/**
 * Holographic map of downtown Walnut Creek as a point-cloud terrain:
 * gentle valley noise plus Mt. Diablo rising to the east-southeast. A radar
 * sweep and a rising scan plane light up the points in the shader; the store
 * beacon at 1545 Locust St fires a ring pulse whenever a quiz is recorded.
 * It shows *where the store is*, not where visitors are (we don't collect that).
 */

const DIABLO = new THREE.Vector2(3.1, 1.3); // +x east, +z south; bearing is real (southeast), distance is stylized

function hash(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function terrainHeight(x, z) {
  let h = (vnoise(x * 0.6, z * 0.6) - 0.5) * 0.5 + (vnoise(x * 1.4 + 7, z * 1.4) - 0.5) * 0.18;
  const dx = x - DIABLO.x;
  const dz = z - DIABLO.y;
  const d2 = dx * dx + dz * dz;
  h += 1.45 * Math.exp(-d2 / 1.6) + 0.55 * Math.exp(-d2 / 5);
  // the creek valley through downtown
  h -= 0.25 * Math.exp(-((x + z * 0.4) ** 2) / 0.6);
  return Math.max(h, -0.35);
}

const vertex = /* glsl */ `
uniform float uTime;
uniform float uPixel;
attribute float aH;
varying float vGlow;
varying float vH;
void main() {
  vec3 p = position;
  float ang = atan(p.z, p.x);
  float sweep = mod(uTime * 0.9 - ang, 6.2831853);
  float radar = exp(-sweep * 1.6);
  float scan = exp(-pow((p.y - (mod(uTime * 0.6, 3.4) - 0.6)) * 9.0, 2.0));
  float r = length(p.xz);
  vGlow = 0.35 + radar * 1.4 + scan * 0.9;
  vGlow *= smoothstep(5.2, 3.6, r);
  vH = aH;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.034 + max(aH, 0.0) * 0.01) * uPixel / max(0.1, -mv.z) * (1.0 + radar * 0.6);
}`;
const fragment = /* glsl */ `
varying float vGlow;
varying float vH;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.15, 0.5, d);
  if (a < 0.02) discard;
  vec3 low = vec3(0.09, 0.42, 0.28);
  vec3 high = vec3(0.5, 0.88, 0.68);
  vec3 peak = vec3(1.0, 1.0, 0.96);
  vec3 c = mix(low, high, smoothstep(-0.3, 0.8, vH));
  c = mix(c, peak, smoothstep(1.2, 2.3, vH));
  float band = smoothstep(0.92, 1.0, fract(vH * 4.0)); // contour lines
  gl_FragColor = vec4(c * vGlow * (1.0 + band * 1.2), a * min(1.0, vGlow));
}`;

function Terrain({ count }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uTime: { value: 0 }, uPixel: { value: 600 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const hs = new Float32Array(count);
    // Fibonacci disc: even coverage without a visible grid
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const r = 5 * Math.sqrt((i + 0.5) / count);
      const a = i * golden;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = terrainHeight(x, z);
      pos.set([x, h, z], i * 3);
      hs[i] = h;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aH', new THREE.BufferAttribute(hs, 1));
    return g;
  }, [count]);
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uPixel.value = state.size.height * state.viewport.dpr * 1.1;
  });
  return <points geometry={geo} material={mat} />;
}

function Beacon({ labels }) {
  const pings = useStore((s) => s.quizPings);
  const rings = useRef([]);
  const starts = useRef([-10, -10, -10]);
  const beam = useRef(null);
  const clock = useRef(0);
  const y0 = terrainHeight(0, 0);

  useEffect(() => {
    if (!pings) return;
    const i = pings % 3;
    starts.current[i] = clock.current;
  }, [pings]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    clock.current = t;
    rings.current.forEach((m, i) => {
      if (!m) return;
      // idle heartbeat every 4s, plus real pings
      const idle = ((t + i * 1.33) % 4) / 4;
      const sincePing = t - starts.current[i];
      const k = sincePing < 2.2 ? sincePing / 2.2 : idle;
      const strength = sincePing < 2.2 ? 1 : 0.22;
      m.scale.setScalar(0.1 + k * (sincePing < 2.2 ? 3.5 : 1.1));
      m.material.opacity = (1 - k) * strength;
    });
    if (beam.current) beam.current.material.opacity = 0.35 + Math.sin(t * 3) * 0.08;
  });

  return (
    <group position={[0, y0, 0]}>
      <mesh ref={beam} position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.008, 0.025, 1.8, 10, 1, true]} />
        <meshBasicMaterial color="#F7E7C1" transparent opacity={0.6} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.08, 16, 12]} />
        <meshBasicMaterial color={[3, 1.6, 1.8]} toneMapped={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            rings.current[i] = m;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
        >
          <ringGeometry args={[0.975, 1, 96]} />
          <meshBasicMaterial color={[2.4, 1.3, 1.45]} transparent opacity={0} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <Anchor position={[0, 2.05, 0]} target={labels?.store} />
    </group>
  );
}

function Rig({ reducedMotion }) {
  useFrame((state) => {
    const t = reducedMotion ? 0.6 : state.clock.elapsedTime * 0.06 + 0.6;
    state.camera.position.set(Math.sin(t) * 7.6, 3.7, Math.cos(t) * 7.6);
    state.camera.lookAt(0, 0.15, 0);
  });
  return null;
}

export default function HoloTerrain({ active = true, reducedMotion = false, labels }) {
  const tier = useStore((s) => s.tier);
  const t = TIER[tier] ?? TIER.mid;
  return (
    <Canvas dpr={[1, Math.min(1.5, t.maxDpr)]} frameloop={active ? 'always' : 'never'} camera={{ fov: 38, position: [0, 4.6, 8.2] }} gl={{ alpha: true, antialias: false }} aria-hidden="true">
      <Rig reducedMotion={reducedMotion} />
      <Terrain count={t.globe * 3} />
      <Beacon labels={labels} />
      <Anchor position={[DIABLO.x, terrainHeight(DIABLO.x, DIABLO.y) + 0.35, DIABLO.y]} target={labels?.diablo} />
      <gridHelper args={[11, 22, '#1e6646', '#14452f']} position={[0, -0.36, 0]} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.55} radius={0.6} />
      </EffectComposer>
    </Canvas>
  );
}
