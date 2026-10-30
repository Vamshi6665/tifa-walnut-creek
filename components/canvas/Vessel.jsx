'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { CuboidCollider, CylinderCollider } from '@react-three/rapier';

/**
 * Chrome-stemmed glass coupe. Visual meshes are lathed profiles; physics uses a
 * ring of thin cuboids following the bowl's 45° wall (convex pieces are far more
 * stable than a trimesh for soft stacking).
 */

export const BOWL = { floorY: 1.6, floorR: 0.45, rimY: 2.5, rimR: 1.35 };

const bowlProfile = [
  [0.0, 1.5], [0.32, 1.52], [0.5, 1.6], [0.82, 1.88], [1.1, 2.17],
  [1.3, 2.42], [1.37, 2.51], [1.355, 2.55],
].map(([r, y]) => new THREE.Vector2(r, y));

const stemProfile = [
  [0.0, 0.04], [0.78, 0.04], [0.82, 0.08], [0.76, 0.13], [0.24, 0.2],
  [0.1, 0.42], [0.075, 0.9], [0.075, 1.22], [0.13, 1.42], [0.3, 1.5], [0.0, 1.505],
].map(([r, y]) => new THREE.Vector2(r, y));

export function VesselMesh({ tier = 'mid', mode = 'night' }) {
  const bowlGeo = useMemo(() => new THREE.LatheGeometry(bowlProfile, 96), []);
  const stemGeo = useMemo(() => new THREE.LatheGeometry(stemProfile, 64), []);
  const iridescence = mode === 'day' ? 1 : 0.35;

  return (
    <group>
      <mesh geometry={stemGeo} castShadow receiveShadow>
        <meshPhysicalMaterial color="#E2E8F0" metalness={1} roughness={0.16} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>

      <mesh geometry={bowlGeo} renderOrder={2}>
        {tier === 'high' ? (
          <MeshTransmissionMaterial
            side={THREE.DoubleSide}
            samples={6}
            resolution={512}
            transmission={1}
            thickness={0.14}
            roughness={0.04}
            ior={1.45}
            chromaticAberration={0.06}
            anisotropy={0.15}
            distortion={0.08}
            distortionScale={0.4}
            temporalDistortion={0.05}
            iridescence={iridescence}
            iridescenceIOR={1.3}
            iridescenceThicknessRange={[100, 600]}
            color="#ffffff"
            backside={false}
          />
        ) : tier === 'mid' ? (
          <meshPhysicalMaterial
            side={THREE.DoubleSide}
            transmission={1}
            thickness={0.12}
            roughness={0.06}
            ior={1.45}
            iridescence={iridescence}
            iridescenceIOR={1.3}
            transparent
          />
        ) : (
          <meshPhysicalMaterial
            side={THREE.DoubleSide}
            color="#cfd8e3"
            metalness={0.2}
            roughness={0.1}
            transparent
            opacity={0.22}
            depthWrite={false}
            iridescence={iridescence}
          />
        )}
      </mesh>

      {/* polished silver lip */}
      <mesh position={[0, 2.548, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.356, 0.007, 8, 160]} />
        <meshStandardMaterial color="#E2E8F0" metalness={1} roughness={0.12} />
      </mesh>
    </group>
  );
}

/** Static colliders: bowl floor + 22 wall slats + ground. */
export function VesselColliders() {
  const slats = useMemo(() => {
    const n = 22;
    const { floorY, floorR, rimY, rimR } = BOWL;
    const dr = rimR - floorR;
    const dy = rimY - floorY;
    const len = Math.hypot(dr, dy);
    const tilt = -Math.atan2(dr, dy); // lean outward
    const midR = (floorR + rimR) / 2;
    const midY = (floorY + rimY) / 2;
    const halfWidth = (Math.PI * midR) / n + 0.05;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return {
        key: i,
        args: [0.05, len / 2 + 0.05, halfWidth],
        position: [Math.cos(a) * (midR + 0.05), midY, -Math.sin(a) * (midR + 0.05)],
        rotation: [0, a, tilt],
      };
    });
  }, []);

  return (
    <>
      <CylinderCollider args={[0.06, BOWL.floorR + 0.1]} position={[0, BOWL.floorY - 0.06, 0]} friction={1.5} />
      {slats.map((s) => (
        <CuboidCollider key={s.key} args={s.args} position={s.position} rotation={s.rotation} friction={1.2} />
      ))}
      <CuboidCollider args={[10, 0.1, 10]} position={[0, -0.1, 0]} friction={1.5} />
    </>
  );
}
