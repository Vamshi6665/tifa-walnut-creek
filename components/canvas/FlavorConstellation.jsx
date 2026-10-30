'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import Anchor from './Anchor';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { FLAVORS, FLAVOR_BY_ID, tasteTwins, twinEdges } from '@/lib/flavors';
import { LAYOUT } from '@/lib/layout';
import { useStore } from '@/lib/store';
import { TIER } from '@/lib/quality';

/**
 * "Taste Twins" constellation.
 *   - 27 nodes = 1 InstancedMesh draw call (+1 additive halo Points call)
 *   - all twin edges (k=4, ~70) = 1 LineSegments draw call
 *   - focus → 4 screen-space-width "synaptic" threads with travelling dashes
 * Node positions come from PCA of the taste profiles (lib/layout.js), so
 * distance on screen really is taste distance.
 */

const POS = LAYOUT.map((p) => new THREE.Vector3(...p));
const INDEX = Object.fromEntries(FLAVORS.map((f, i) => [f.id, i]));
const EDGES = twinEdges(4);
const COLORS = FLAVORS.map((f) => new THREE.Color(f.look.colorA).lerp(new THREE.Color(f.look.colorB), 0.3));

const haloVertex = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
uniform float uScale;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  vColor = aColor;
}`;
const haloFragment = /* glsl */ `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = pow(1.0 - smoothstep(0.0, 0.5, d), 2.2);
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a * 0.55);
}`;

function Starfield({ count = 500 }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(14 + Math.random() * 18);
      p.set([v.x, v.y, v.z], i * 3);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, [count]);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.06} color="#9CCBB2" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Graph({ reducedMotion, labels }) {
  const group = useRef(null);
  const nodes = useRef(null);
  const halo = useRef(null);
  const threads = useRef([]);
  const { gl, size, camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const focusWorld = useMemo(() => new THREE.Vector3(), []);
  const focus = useStore((s) => s.twinFocus);
  const hover = useStore((s) => s.twinHover);
  const moodHighlight = useStore((s) => s.moodHighlight);
  const setFocus = useStore((s) => s.setTwinFocus);
  const setHover = useStore((s) => s.setTwinHover);

  const twins = useMemo(() => tasteTwins(focus, 4), [focus]);
  const twinSet = useMemo(() => new Set(twins.map((t) => t.flavor.id)), [twins]);
  const moodSet = useMemo(() => new Set(moodHighlight), [moodHighlight]);

  // ---- per-node animated state -------------------------------------------
  const anim = useRef(FLAVORS.map(() => ({ s: 1, b: 1 })));
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const haloGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POS.flatMap((p) => [p.x, p.y, p.z])), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(POS.length).fill(1), 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(COLORS.flatMap((c) => [c.r, c.g, c.b])), 3));
    return g;
  }, []);
  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: haloVertex,
        fragmentShader: haloFragment,
        uniforms: { uScale: { value: 300 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const edgeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(EDGES.length * 6);
    EDGES.forEach((e, i) => {
      p.set([POS[e.a].x, POS[e.a].y, POS[e.a].z, POS[e.b].x, POS[e.b].y, POS[e.b].z], i * 6);
    });
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, []);

  // ---- rotation rig: drag with inertia, auto-orbit, seek to focused node ----
  const rig = useRef({ az: 0, vel: 0, dragging: false, lastX: 0, seek: true, target: 0 });
  useEffect(() => {
    const p = POS[INDEX[focus]];
    rig.current.target = -Math.atan2(p.x, p.z);
    rig.current.seek = true;
  }, [focus]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'pan-y';
    const r = rig.current;
    const down = (e) => {
      r.dragging = true;
      r.lastX = e.clientX;
      r.seek = false;
    };
    const move = (e) => {
      if (!r.dragging) return;
      r.vel = (e.clientX - r.lastX) * 0.006;
      r.lastX = e.clientX;
      r.az += r.vel;
    };
    const up = () => {
      r.dragging = false;
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
    const r = rig.current;
    if (!r.dragging) {
      if (r.seek) {
        let d = r.target - r.az;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        r.az += d * (1 - Math.exp(-dt * 2.2));
        if (Math.abs(d) < 0.002) r.seek = false;
      } else {
        r.az += r.vel;
        r.vel *= Math.exp(-dt * 3);
        if (!reducedMotion) r.az += dt * 0.05;
      }
    }
    group.current.rotation.y = r.az;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.06 - state.pointer.y * 0.08;

    // camera drifts toward the focused neighbourhood so its cluster sits centre-frame
    focusWorld.copy(POS[INDEX[focus]]);
    group.current.localToWorld(focusWorld);
    look.lerp(focusWorld.multiplyScalar(0.45), 1 - Math.exp(-dt * 2));
    camera.position.set(look.x * 0.5, 0.6 + look.y * 0.5, 12.5);
    camera.lookAt(look);

    // node scale / brightness
    const k = 1 - Math.exp(-dt * 8);
    const sizes = haloGeo.attributes.aSize.array;
    FLAVORS.forEach((f, i) => {
      const isFocus = f.id === focus;
      const isTwin = twinSet.has(f.id);
      const isMood = moodSet.has(f.id);
      const isHover = f.id === hover;
      const ts = isFocus ? 2.1 : isHover ? 1.7 : isTwin || isMood ? 1.45 : 1;
      const tb = isFocus ? 1.7 : isTwin || isMood || isHover ? 1.3 : moodSet.size ? 0.35 : 0.75;
      const a = anim.current[i];
      a.s += (ts - a.s) * k;
      a.b += (tb - a.b) * k;
      dummy.position.copy(POS[i]);
      dummy.scale.setScalar(a.s);
      dummy.updateMatrix();
      nodes.current.setMatrixAt(i, dummy.matrix);
      tmpColor.copy(COLORS[i]).multiplyScalar(a.b);
      nodes.current.setColorAt(i, tmpColor);
      sizes[i] = a.s * (isFocus ? 1.6 : 1);
    });
    nodes.current.instanceMatrix.needsUpdate = true;
    nodes.current.instanceColor.needsUpdate = true;
    haloGeo.attributes.aSize.needsUpdate = true;
    haloMat.uniforms.uScale.value = size.height * state.viewport.dpr * 0.42;

    // travelling dashes along the synaptic threads
    threads.current.forEach((l) => {
      if (l?.material) l.material.dashOffset -= dt * 0.9;
    });
  });

  const focusPos = POS[INDEX[focus]];

  return (
    <group ref={group}>
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial color="#FFFFFF" transparent opacity={0.09} depthWrite={false} />
      </lineSegments>

      {twins.map((t, i) => {
        const p = POS[INDEX[t.flavor.id]];
        return (
          <Line
            key={`${focus}-${t.flavor.id}`}
            ref={(el) => {
              threads.current[i] = el;
            }}
            points={[focusPos, p]}
            vertexColors={[COLORS[INDEX[focus]].clone().multiplyScalar(2.2), COLORS[INDEX[t.flavor.id]].clone().multiplyScalar(2.2)]}
            lineWidth={2.2}
            dashed
            dashSize={0.35}
            gapSize={0.12}
            transparent
            opacity={0.95}
            toneMapped={false}
          />
        );
      })}

      <instancedMesh
        ref={nodes}
        args={[null, null, FLAVORS.length]}
        onPointerMove={(e) => {
          e.stopPropagation();
          const id = FLAVORS[e.instanceId]?.id;
          if (id && id !== hover) setHover(id);
          document.body.dataset.cursor = 'node';
        }}
        onPointerOut={() => {
          setHover(null);
          delete document.body.dataset.cursor;
        }}
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          const id = FLAVORS[e.instanceId]?.id;
          if (id) setFocus(id);
        }}
      >
        <icosahedronGeometry args={[0.16, 2]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <points geometry={haloGeo} material={haloMat} ref={halo} />

      {/* DOM labels live outside the canvas (see FlavorsSection); anchors pin them here */}
      <Anchor position={POS[INDEX[focus]]} target={labels?.focus} />
      <Anchor position={hover ? POS[INDEX[hover]] : POS[0]} target={labels?.hover} hidden={!hover || hover === focus} />
    </group>
  );
}

export default function FlavorConstellation({ active = true, reducedMotion = false, labels }) {
  const tier = useStore((s) => s.tier);
  const t = TIER[tier] ?? TIER.mid;
  return (
    <Canvas
      dpr={[1, t.maxDpr]}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 40, position: [0, 0.6, 12.5] }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden="true"
    >
      <fog attach="fog" args={['#0B3322', 9, 22]} />
      <Starfield count={tier === 'low' ? 250 : 600} />
      <Graph reducedMotion={reducedMotion} labels={labels} />
      <EffectComposer multisampling={tier === 'low' ? 0 : 4}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.95} radius={0.6} />
      </EffectComposer>
    </Canvas>
  );
}
