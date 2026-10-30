'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Pins a regular DOM element (rendered OUTSIDE the canvas) to a 3D point.
 * Every frame we project the point and write a transform straight onto the
 * element — no React re-render, no extra React root (cheaper and more robust
 * than drei <Html> for simple labels). The element should be absolutely
 * positioned at the canvas container's top-left with pointer-events: none.
 */
export default function Anchor({ position, target, hidden = false }) {
  const group = useRef(null);
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const el = target?.current;
    if (!el || !group.current) return;
    group.current.getWorldPosition(v);
    v.project(camera);
    const offscreen = v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2;
    const x = (v.x * 0.5 + 0.5) * size.width;
    const y = (-v.y * 0.5 + 0.5) * size.height;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    el.style.opacity = hidden || offscreen ? '0' : '1';
  });
  return <group ref={group} position={position} />;
}
