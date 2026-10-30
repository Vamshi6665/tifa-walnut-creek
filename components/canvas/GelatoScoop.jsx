'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FLAVOR_BY_ID } from '@/lib/flavors';
import { createGelatoMaterial, dampLook } from './shaders/gelatoMaterial';

/**
 * Procedural gelato scoop.
 *
 * Geometry is a plain indexed UV sphere; the vertex shader sculpts it into a
 * scoop, so one cached geometry per detail level serves every scoop.
 * Flavor changes cross-fade on the GPU (uniform lerp), no texture uploads.
 *
 * Imperative API (via ref): impact(strength 0..1) → jelly squash spring.
 */
const geometryCache = new Map();
function scoopGeometry(detail) {
  if (!geometryCache.has(detail)) {
    geometryCache.set(detail, new THREE.SphereGeometry(1, detail * 2, Math.round(detail * 1.5)));
  }
  return geometryCache.get(detail);
}

const GelatoScoop = forwardRef(function GelatoScoop(
  { flavorId, radius = 0.55, detail = 48, selected = false, seed, ...props },
  ref,
) {
  const look = (FLAVOR_BY_ID[flavorId] ?? FLAVOR_BY_ID.pistachio).look;
  const geometry = useMemo(() => scoopGeometry(detail), [detail]);
  // Material is created once per scoop; flavor swaps animate its uniforms.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const material = useMemo(() => createGelatoMaterial(look, seed ?? Math.random() * 100), []);
  useEffect(() => () => material.dispose(), [material]);

  const spring = useRef({ x: 0, v: 0, wobble: 0 });
  useImperativeHandle(ref, () => ({
    impact(strength = 1) {
      spring.current.v += 6 * strength;
      spring.current.wobble = Math.max(spring.current.wobble, 0.12 * strength);
    },
  }));

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 20);
    const u = material.userData.uniforms;
    dampLook(u, look, 1 - Math.exp(-dt * 6));
    u.uSelected.value += ((selected ? 1 : 0) - u.uSelected.value) * (1 - Math.exp(-dt * 10));

    // Damped spring: x'' = -k x - c x'
    const s = spring.current;
    const k = 180;
    const c = 14;
    s.v += (-k * s.x - c * s.v) * dt;
    s.x += s.v * dt;
    s.wobble *= Math.exp(-dt * 3);
    u.uSquash.value = THREE.MathUtils.clamp(s.x, -0.4, 0.6);
    u.uWobble.value = s.wobble;
  });

  return (
    <mesh geometry={geometry} material={material} scale={radius} castShadow receiveShadow {...props} />
  );
});

export default GelatoScoop;

/** Visual half-height of a scoop relative to its radius (used to align colliders). */
export const SCOOP_VISUAL = {
  top: 0.98,
  bottom: -0.66,
  center: 0.16, // (top + bottom) / 2
  halfHeight: 0.82,
  outerRadius: 1.05,
};
