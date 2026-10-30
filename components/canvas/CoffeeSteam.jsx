'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { noiseGLSL } from './shaders/noise.glsl';

/**
 * Groundwork coffee cup + GPU steam.
 * Steam is a single THREE.Points draw call; every particle's motion is a pure
 * function of (seed, time) evaluated in the vertex shader — zero CPU updates,
 * zero buffer uploads after creation.
 */

const steamVertex = /* glsl */ `
attribute vec4 aSeed; // phase, speed, sway, size
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform float uHeight;
varying float vAlpha;
varying vec2 vSeed;
void main() {
  float life = fract(uTime * (0.1 + aSeed.y * 0.09) + aSeed.x);
  vec3 p = position;
  float h = life * uHeight;
  float sway = aSeed.z * 6.2831853;
  p.x += sin(h * 3.0 + uTime * 0.8 + sway) * 0.14 * life + sin(h * 7.0 + sway) * 0.03;
  p.z += cos(h * 2.6 + uTime * 0.7 + sway) * 0.11 * life;
  p.xz *= 1.0 + life * 1.5;
  p.y += h;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.6 + aSeed.w) * (0.35 + life * 1.65) * uPixelRatio / max(0.1, -mv.z);
  vAlpha = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.5, 1.0, life));
  vSeed = aSeed.xz;
}
`;

const steamFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying float vAlpha;
varying vec2 vSeed;
${noiseGLSL}
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float n = tf_snoise(vec3(gl_PointCoord * 2.4 + vSeed * 11.0, uTime * 0.25 + vSeed.x * 4.0)) * 0.5 + 0.5;
  float a = (1.0 - smoothstep(0.08, 0.5, d)) * n * n * vAlpha * uOpacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

function useCremaTexture() {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const s = 256;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(s / 2, s / 2, 10, s / 2, s / 2, s / 2);
    grad.addColorStop(0, '#2a160d');
    grad.addColorStop(0.55, '#4a2a18');
    grad.addColorStop(0.8, '#a8774c');
    grad.addColorStop(1, '#6e4528');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    // latte-art-ish rosette strokes
    g.strokeStyle = 'rgba(230, 200, 160, 0.55)';
    g.lineWidth = 6;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.ellipse(s / 2, s / 2 + 18 - i * 9, 48 - i * 6, 22 - i * 3, 0, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

const cupProfile = [
  [0.0, 0.02], [0.27, 0.0], [0.33, 0.03], [0.39, 0.42], [0.42, 0.55],
  [0.405, 0.565], [0.375, 0.47], [0.33, 0.1], [0.0, 0.09],
].map(([r, y]) => new THREE.Vector2(r, y));

const saucerProfile = [
  [0.0, 0.0], [0.5, 0.0], [0.66, 0.04], [0.68, 0.06], [0.62, 0.05], [0.42, 0.03], [0.0, 0.03],
].map(([r, y]) => new THREE.Vector2(r, y));

export default function CoffeeSteam({ count = 400, mode = 'night', ...props }) {
  const pts = useRef(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const crema = useCremaTexture();
  const cupGeo = useMemo(() => new THREE.LatheGeometry(cupProfile, 64), []);
  const saucerGeo = useMemo(() => new THREE.LatheGeometry(saucerProfile, 64), []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * 0.22;
      const a = Math.random() * Math.PI * 2;
      pos.set([Math.cos(a) * r, 0, Math.sin(a) * r], i * 3);
      seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 2);
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: steamVertex,
        fragmentShader: steamFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uSize: { value: 220 },
          uHeight: { value: 1.7 },
          uColor: { value: new THREE.Color('#F4F1EC') },
          uOpacity: { value: 0.5 },
        },
      }),
    [],
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPixelRatio.value = dpr;
    // steam reads stronger against the dark lounge; softer in the bright studio
    const target = mode === 'day' ? 0.22 : mode === 'rain' ? 0.42 : 0.34;
    material.uniforms.uOpacity.value += (target - material.uniforms.uOpacity.value) * 0.05;
  });

  return (
    <group {...props}>
      <mesh geometry={saucerGeo} receiveShadow castShadow>
        <meshPhysicalMaterial color="#141418" roughness={0.55} clearcoat={0.25} clearcoatRoughness={0.5} />
      </mesh>
      <group position={[0, 0.06, 0]}>
        <mesh geometry={cupGeo} castShadow receiveShadow>
          <meshPhysicalMaterial color="#141418" roughness={0.55} clearcoat={0.25} clearcoatRoughness={0.5} side={THREE.DoubleSide} />
        </mesh>
        {/* handle */}
        <mesh position={[0.43, 0.3, 0]} rotation={[0, 0, -0.1]} castShadow>
          <torusGeometry args={[0.12, 0.028, 12, 32, Math.PI * 1.25]} />
          <meshPhysicalMaterial color="#141418" roughness={0.55} clearcoat={0.25} clearcoatRoughness={0.5} />
        </mesh>
        {/* silver rim */}
        <mesh position={[0, 0.562, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.412, 0.008, 6, 64]} />
          <meshStandardMaterial color="#C9D1DB" metalness={1} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.47, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.378, 48]} />
          <meshStandardMaterial map={crema} roughness={0.18} metalness={0} />
        </mesh>
        <points ref={pts} geometry={geometry} material={material} position={[0, 0.5, 0]} frustumCulled={false} />
      </group>
    </group>
  );
}
