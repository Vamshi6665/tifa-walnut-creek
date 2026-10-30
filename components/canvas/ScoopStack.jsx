'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics, RigidBody, BallCollider } from '@react-three/rapier';
import { useStore } from '@/lib/store';
import GelatoScoop, { SCOOP_VISUAL } from './GelatoScoop';
import { VesselColliders } from './Vessel';

export const SCOOP_R = 0.55;

// Initial drop points, held above the frame until the intro releases them:
// two settle side by side on the 45° walls, the rest crown them.
const START = [
  [-0.42, 6.6, 0.05],
  [0.42, 7.5, -0.05],
  [0.0, 8.6, 0.12],
  [-0.2, 9.6, -0.2],
  [0.25, 10.6, 0.1],
];

/**
 * Rapier rigid-body "Scoop Stack".
 * - Scoops are ball bodies with locked tilt: they slide (not roll) into a pile
 *   against the 45° walls, and the flat-cut base always stays down.
 * - X/Z rotation is locked so scoops stay upright; they may spin around Y.
 * - Impact speed from the previous frame drives the jelly squash spring.
 * - `restackNonce` (store) re-drops every scoop with a staggered cascade.
 */
function PhysicsScoop({ scoop, index, detail, selected, nonce }) {
  const body = useRef(null);
  const visual = useRef(null);
  const lastVy = useRef(0);
  const selectScoop = useStore((s) => s.selectScoop);

  useEffect(() => {
    if (nonce === 0) return undefined;
    const id = setTimeout(() => {
      const b = body.current;
      if (!b) return;
      const [sx, , sz] = START[index % START.length];
      b.setTranslation({ x: sx + (Math.random() - 0.5) * 0.15, y: 3.8 + index * 0.35, z: sz + (Math.random() - 0.5) * 0.15 }, true);
      b.setLinvel({ x: 0, y: -1, z: 0 }, true);
      b.setAngvel({ x: 0, y: (Math.random() - 0.5) * 6, z: 0 }, true);
    }, index * 190);
    return () => clearTimeout(id);
  }, [nonce, index]);

  useFrame(() => {
    const b = body.current;
    if (b) lastVy.current = b.linvel().y;
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={START[index % START.length]}
      enabledRotations={[false, true, false]}
      linearDamping={0.35}
      angularDamping={2.5}
      ccd
      onCollisionEnter={() => {
        const s = Math.min(1, Math.abs(lastVy.current) / 5);
        if (s > 0.12) visual.current?.impact(s);
      }}
    >
      {/* round collider: later scoops slide off earlier ones and settle into a
          pile against the bowl walls instead of balancing in a column */}
      <BallCollider args={[0.86 * SCOOP_R]} friction={0.55} restitution={0.05} density={1.1} />
      <GelatoScoop
        ref={visual}
        flavorId={scoop.flavorId}
        radius={SCOOP_R}
        detail={detail}
        selected={selected}
        position={[0, -SCOOP_VISUAL.center * SCOOP_R, 0]}
        onClick={(e) => {
          if (e.delta > 6) return; // was a drag, not a click
          e.stopPropagation();
          selectScoop(scoop.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.dataset.cursor = 'grab-scoop';
        }}
        onPointerOut={() => {
          delete document.body.dataset.cursor;
        }}
      />
    </RigidBody>
  );
}

export default function ScoopStack({ active = true, detail = 48 }) {
  const scoops = useStore((s) => s.scoops);
  const selected = useStore((s) => s.selectedScoop);
  const nonce = useStore((s) => s.restackNonce);
  const dropped = useStore((s) => s.scoopsDropped);

  return (
    <Physics gravity={[0, -12, 0]} timeStep={1 / 60} paused={!active || !dropped}>
      <VesselColliders />
      {scoops.map((s, i) => (
        <PhysicsScoop key={s.id} scoop={s} index={i} detail={detail} selected={selected === s.id} nonce={nonce} />
      ))}
    </Physics>
  );
}
