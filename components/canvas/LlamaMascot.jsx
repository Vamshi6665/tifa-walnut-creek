'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { pointerState } from '@/lib/scrollState';

/**
 * "LaMa" — low-poly cyber-llama (Laasya + Maanya), sitting kushed on the bench.
 *
 * Head tracking is real inverse kinematics: a 3-joint chain (neck base → neck
 * mid → head) solved every frame with CCD (cyclic coordinate descent) so a
 * gaze point 2 units ahead of the eyes converges on the cursor, with per-joint
 * yaw/pitch limits and frame-rate-independent damping. Idle → slow wander.
 *
 * Click → backflip (parabolic hop + 360° pitch), neon particle burst, then
 * the hidden perk overlay opens.
 */

// Dark-chrome designer figurine: faceted gunmetal with glowing eyes.
const VANILLA = '#2A2D35';
const WOOL = '#3A3E48';
const MINT = '#50E3C2';
const ROSE = '#FF9EAA';
const CHROME = '#E2E8F0';
const PIVOT = 0.45; // backflip pivot height (body centre)

// ---------------------------------------------------------------------------
// CCD IK
// ---------------------------------------------------------------------------
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
const _jw = new THREE.Vector3();
const _ew = new THREE.Vector3();
const _toE = new THREE.Vector3();
const _toT = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _identity = new THREE.Quaternion();

function solveCCD(joints, effector, target, alpha, iterations = 3) {
  for (let it = 0; it < iterations; it++) {
    for (let j = joints.length - 1; j >= 0; j--) {
      const { obj, limits, weight } = joints[j];
      obj.updateWorldMatrix(true, true);
      obj.getWorldPosition(_jw);
      effector.getWorldPosition(_ew);
      _toE.subVectors(_ew, _jw).normalize();
      _toT.subVectors(target, _jw).normalize();
      if (_toE.lengthSq() < 1e-6 || _toT.lengthSq() < 1e-6) continue;

      // world-space correction, damped and weighted per joint
      _q.setFromUnitVectors(_toE, _toT);
      _q.slerp(_identity, 1 - weight * alpha);

      // convert to the joint's local frame: local' = P⁻¹ · q · P · local
      obj.parent.getWorldQuaternion(_pq);
      _q2.copy(_pq).invert().multiply(_q).multiply(_pq);
      obj.quaternion.premultiply(_q2);

      // joint limits (YXZ: yaw first, then pitch, then roll)
      _euler.setFromQuaternion(obj.quaternion, 'YXZ');
      _euler.y = THREE.MathUtils.clamp(_euler.y, limits.yaw[0], limits.yaw[1]);
      _euler.x = THREE.MathUtils.clamp(_euler.x, limits.roll[0], limits.roll[1]);
      _euler.z = THREE.MathUtils.clamp(_euler.z, limits.pitch[0], limits.pitch[1]);
      obj.quaternion.setFromEuler(_euler);
    }
  }
}

// ---------------------------------------------------------------------------
// Neon burst (GPU, one draw call)
// ---------------------------------------------------------------------------
const burstVertex = /* glsl */ `
attribute vec3 aDir;
attribute float aSpeed;
attribute vec3 aColor;
uniform float uT;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float t = max(uT, 0.0);
  vec3 p = aDir * aSpeed * t * (1.0 - 0.28 * t);
  p.y -= 1.4 * t * t;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float alive = step(0.0, uT) * (1.0 - smoothstep(0.6, 1.5, t));
  gl_PointSize = (14.0 + aSpeed * 6.0) * alive * uPixelRatio / max(0.1, -mv.z);
  vColor = aColor;
  vAlpha = alive;
}
`;
const burstFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.0, 0.5, d)) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * 3.0, a);
}
`;

function NeonBurst({ count, trigger }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const dir = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const palette = [ROSE, MINT, VANILLA, CHROME].map((c) => new THREE.Color(c));
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.randomDirection();
      v.y = Math.abs(v.y) * 0.8 + 0.2;
      v.normalize();
      dir.set([v.x, v.y, v.z], i * 3);
      speed[i] = 1.2 + Math.random() * 2.6;
      const c = palette[i % palette.length];
      color.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    return g;
  }, [count]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: burstVertex,
        fragmentShader: burstFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uT: { value: -1 }, uPixelRatio: { value: 1 } },
      }),
    [],
  );
  useFrame((state) => {
    material.uniforms.uPixelRatio.value = dpr * 6;
    const start = trigger.current;
    material.uniforms.uT.value = start < 0 ? -1 : state.clock.elapsedTime - start;
  });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

// ---------------------------------------------------------------------------
// Llama
// ---------------------------------------------------------------------------
function Flat({ color, emissive, intensity = 0, ...props }) {
  return (
    <meshStandardMaterial
      color={color}
      flatShading
      roughness={0.26}
      metalness={0.9}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={intensity}
      {...props}
    />
  );
}

export default function LlamaMascot({ burstCount = 300, ...props }) {
  const root = useRef(null);
  const flip = useRef(null);
  const neck0 = useRef(null);
  const neck1 = useRef(null);
  const head = useRef(null);
  const gaze = useRef(null);
  const eyeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: MINT, emissive: MINT, emissiveIntensity: 3, toneMapped: false }),
    [],
  );
  const burstAt = useRef(-1);
  const anim = useRef({ t: -1, perkOpened: false });
  const lastMove = useRef({ x: 0, y: 0, at: 0 });
  const openPerk = useStore((s) => s.openPerk);
  const { camera, gl } = useThree();

  const target = useMemo(() => new THREE.Vector3(), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  const joints = useRef([]);
  useEffect(() => {
    joints.current = [
      { obj: neck0.current, weight: 0.25, limits: { yaw: [-0.7, 0.7], pitch: [-0.35, 0.45], roll: [-0.12, 0.12] } },
      { obj: neck1.current, weight: 0.4, limits: { yaw: [-0.75, 0.75], pitch: [-0.4, 0.5], roll: [-0.1, 0.1] } },
      { obj: head.current, weight: 0.9, limits: { yaw: [-0.9, 0.9], pitch: [-0.6, 0.6], roll: [-0.15, 0.15] } },
    ];
  }, []);

  const onClick = (e) => {
    e.stopPropagation();
    if (anim.current.t >= 0) return;
    anim.current = { t: 0, perkOpened: false };
  };

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 20);
    const time = state.clock.elapsedTime;

    // ---- cursor → world target on a camera-facing plane in front of the llama
    const rect = gl.domElement.getBoundingClientRect();
    const px = pointerState.px;
    const py = pointerState.py;
    if (px !== lastMove.current.x || py !== lastMove.current.y) {
      lastMove.current = { x: px, y: py, at: time };
    }
    const idle = time - lastMove.current.at > 3.5 || (px === 0 && py === 0);
    if (idle) {
      ndc.set(Math.sin(time * 0.35) * 0.7, 0.15 + Math.sin(time * 0.6) * 0.25);
    } else {
      ndc.set(((px - rect.left) / rect.width) * 2 - 1, -((py - rect.top) / rect.height) * 2 + 1);
    }
    head.current.getWorldPosition(tmp);
    camera.getWorldDirection(camDir);
    tmp.addScaledVector(camDir, -2.2); // plane sits between llama and viewer
    plane.setFromNormalAndCoplanarPoint(camDir, tmp);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, tmp)) target.lerp(tmp, 1 - Math.exp(-dt * 10));

    if (anim.current.t < 0) {
      solveCCD(joints.current, gaze.current, target, 1 - Math.exp(-dt * 7));
    }

    // ---- breathing + ear twitch
    const breathe = 1 + Math.sin(time * 1.6) * 0.015;
    flip.current.scale.set(1, breathe, 1);

    // ---- eye glow pulse
    eyeMat.emissiveIntensity = 3 + Math.sin(time * 2.2) * 0.8;

    // ---- backflip
    const a = anim.current;
    if (a.t >= 0) {
      a.t += dt / 1.05;
      const t = Math.min(a.t, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      flip.current.position.y = PIVOT + 4 * 0.85 * t * (1 - t);
      flip.current.rotation.z = ease * Math.PI * 2;
      if (t > 0.3 && burstAt.current < time - 2) burstAt.current = time;
      if (t > 0.72 && !a.perkOpened) {
        a.perkOpened = true;
        openPerk();
      }
      if (a.t >= 1) {
        a.t = -1;
        flip.current.position.y = PIVOT;
        flip.current.rotation.z = 0;
      }
    }
  });

  return (
    <group ref={root} {...props}>
      <group ref={flip} position={[0, PIVOT, 0]}>
        <group
          position={[0, -PIVOT, 0]}
          onClick={onClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.dataset.cursor = 'llama';
          }}
          onPointerOut={() => delete document.body.dataset.cursor}
        >
          {/* body (kushed) */}
          <mesh position={[0, 0.38, 0]} scale={[0.6, 0.36, 0.38]} castShadow>
            <icosahedronGeometry args={[1, 2]} />
            <Flat color={VANILLA} />
          </mesh>
          {/* wool tufts */}
          {[
            [0.12, 0.63, 0.0, 0.2],
            [-0.24, 0.6, 0.02, 0.18],
          ].map(([x, y, z, s], i) => (
            <mesh key={i} position={[x, y, z]} scale={s} castShadow>
              <icosahedronGeometry args={[1, 0]} />
              <Flat color={WOOL} />
            </mesh>
          ))}
          {/* tucked legs */}
          {[
            [0.32, 0.08, 0.19],
            [0.32, 0.08, -0.19],
            [-0.3, 0.08, 0.2],
            [-0.3, 0.08, -0.2],
          ].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <capsuleGeometry args={[0.065, 0.2, 2, 6]} />
              <Flat color={VANILLA} />
            </mesh>
          ))}
          {/* chrome hooves peeking out */}
          {[0.22, -0.22].map((z, i) => (
            <mesh key={i} position={[0.56, 0.07, z]}>
              <boxGeometry args={[0.08, 0.06, 0.09]} />
              <meshStandardMaterial color={CHROME} metalness={1} roughness={0.2} />
            </mesh>
          ))}
          {/* tail */}
          <mesh position={[-0.62, 0.48, 0]} scale={[0.1, 0.13, 0.1]}>
            <icosahedronGeometry args={[1, 0]} />
            <Flat color={WOOL} />
          </mesh>

          {/* ---- IK chain ---------------------------------------------- */}
          <group ref={neck0} position={[0.42, 0.55, 0]}>
            <mesh position={[0, 0.15, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.13, 0.32, 6]} />
              <Flat color={VANILLA} />
            </mesh>
            {/* rose-gold "LaMa" collar */}
            <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.13, 0.012, 6, 24]} />
              <meshStandardMaterial color={ROSE} emissive={ROSE} emissiveIntensity={0.9} metalness={0.8} roughness={0.3} />
            </mesh>
            <group ref={neck1} position={[0, 0.3, 0]}>
              <mesh position={[0, 0.14, 0]} castShadow>
                <cylinderGeometry args={[0.085, 0.1, 0.3, 6]} />
                <Flat color={VANILLA} />
              </mesh>
              <group ref={head} position={[0, 0.3, 0]}>
                {/* skull */}
                <mesh position={[0.05, 0.07, 0]} scale={[0.2, 0.17, 0.17]} castShadow>
                  <icosahedronGeometry args={[1, 1]} />
                  <Flat color={VANILLA} />
                </mesh>
                {/* snout */}
                <mesh position={[0.23, 0.0, 0]} scale={[0.13, 0.1, 0.11]} castShadow>
                  <icosahedronGeometry args={[1, 0]} />
                  <Flat color={WOOL} />
                </mesh>
                {/* forelock */}
                <mesh position={[0.02, 0.22, 0]} scale={0.095}>
                  <icosahedronGeometry args={[1, 0]} />
                  <Flat color={WOOL} />
                </mesh>
                {/* ears with neon tips */}
                {[0.075, -0.075].map((z, i) => (
                  <group key={i} position={[-0.03, 0.22, z * 1.25]} rotation={[z > 0 ? -0.25 : 0.25, 0, -0.15]}>
                    <mesh position={[0, 0.07, 0]}>
                      <coneGeometry args={[0.042, 0.2, 4]} />
                      <Flat color={VANILLA} />
                    </mesh>
                    <mesh position={[0, 0.185, 0]}>
                      <coneGeometry args={[0.016, 0.045, 4]} />
                      <meshStandardMaterial color={ROSE} emissive={ROSE} emissiveIntensity={1.2} />
                    </mesh>
                  </group>
                ))}
                {/* glowing eyes */}
                {[0.1, -0.1].map((z, i) => (
                  <mesh key={i} position={[0.18, 0.1, z]} scale={[0.026, 0.036, 0.026]} material={eyeMat}>
                    <sphereGeometry args={[1, 10, 8]} />
                  </mesh>
                ))}
                {/* gaze effector: 2 units ahead of the eyes */}
                <object3D ref={gaze} position={[2.0, 0.08, 0]} />
              </group>
            </group>
          </group>
        </group>
      </group>
      <group position={[0.2, 0.9, 0]}>
        <NeonBurst count={burstCount} trigger={burstAt} />
      </group>
    </group>
  );
}
