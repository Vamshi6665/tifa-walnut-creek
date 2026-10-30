import * as THREE from 'three';
import { noiseGLSL } from './noise.glsl';

/**
 * Gelato material = MeshPhysicalMaterial + four shader injections:
 *
 *  1. Vertex displacement   — procedural scoop (fbm body, twisted scooper folds,
 *                             ragged tub-cut lip, flat base) with analytic normals
 *                             rebuilt by finite differences, plus jelly squash.
 *  2. Procedural albedo     — two-tone body, ribbon swirl, inclusions (chips, nuts,
 *                             seeds, crumbs, flecks), frost speckle.
 *  3. Procedural normal map — screen-space-derivative bump (Mikkelsen surface
 *                             gradient) so micro-texture needs no texture fetches.
 *  4. Subsurface scattering — real-time translucency approximation
 *                             (Barré-Brisebois & Bouchard, GDC 2011): wrap diffuse,
 *                             distorted back-lighting and thin-edge glow.
 *
 * All scoops share ONE compiled program (customProgramCacheKey) and one set of
 * light uniforms (`shared`), so N scoops = N draw calls, 1 shader compile.
 */

export const sharedGelatoUniforms = {
  uTime: { value: 0 },
  uKeyDir: { value: new THREE.Vector3(0.4, 0.6, -0.7) }, // view-space, updated per frame
  uKeyIntensity: { value: 1 },
  uSSSStrength: { value: 1 },
  uRimColor: { value: new THREE.Color('#FFF7D6') },
};

const vertexPars = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uSquash;
uniform float uWobble;
varying vec3 vScoopP;
${noiseGLSL}

vec3 tf_scoopShape(vec3 p) {
  // a scooped ball: the scooper drags across the tub and rolls a sheet of gelato,
  // so the ridges wrap over the dome around a horizontal axis (like a rolled sheet),
  // fading out toward the sides and the cut base.
  float n1 = tf_snoise(p * 1.2 + uSeed);
  float phi = atan(p.y + 0.15, p.z);
  float ph = phi * 6.0 + p.x * 1.6 + tf_snoise(p * 1.1 + uSeed) * 1.3;
  float ribbon = smoothstep(-0.2, 1.0, sin(ph));
  float band = smoothstep(-0.5, 0.1, p.y) * (1.0 - smoothstep(0.55, 0.95, abs(p.x)));
  float r = 1.0 + 0.018 * n1 + 0.045 * ribbon * band;

  // ragged lip where the scoop was cut from the tub
  float lipNoise = 0.5 + 0.5 * tf_snoise(vec3(p.x * 3.2, p.z * 3.2, uSeed * 2.3));
  float lipBand = (1.0 - smoothstep(-0.48, -0.12, p.y)) * smoothstep(-0.9, -0.62, p.y);
  r += lipBand * (0.015 + 0.035 * lipNoise);

  vec3 pos = p * r;
  pos.y = max(pos.y, -0.72 - 0.03 * lipNoise); // flat base so scoops sit and stack

  // jelly: impact squash + decaying wobble, roughly volume-preserving
  float sq = uSquash + uWobble * sin(uTime * 14.0 + p.y * 4.0);
  pos.y *= (0.9 - 0.25 * sq);
  pos.xz *= (1.0 + 0.14 * sq);
  return pos;
}
`;

const vertexNormal = /* glsl */ `
  vec3 tf_p0 = normalize(position);
  vec3 tf_pos = tf_scoopShape(tf_p0);
  vec3 tf_up = abs(tf_p0.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tf_t = normalize(cross(tf_up, tf_p0));
  vec3 tf_b = normalize(cross(tf_p0, tf_t));
  const float tf_e = 0.012;
  vec3 tf_pt = tf_scoopShape(normalize(tf_p0 + tf_t * tf_e));
  vec3 tf_pb = tf_scoopShape(normalize(tf_p0 + tf_b * tf_e));
  vec3 objectNormal = normalize(cross(tf_pt - tf_pos, tf_pb - tf_pos));
  if (dot(objectNormal, tf_p0) < 0.0) objectNormal = -objectNormal;
  vScoopP = tf_pos;
  #ifdef USE_TANGENT
    vec3 objectTangent = vec3(tangent.xyz);
  #endif
`;

const fragmentPars = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uSwirl;
uniform float uSwirlAmt;
uniform vec3 uIncColor;
uniform float uIncScale;
uniform float uIncThreshold;
uniform float uIncAmt;
uniform vec3 uSSSColor;
uniform float uSSSStrength;
uniform vec3 uKeyDir;
uniform float uKeyIntensity;
uniform float uBumpScale;
uniform float uSelected;
uniform vec3 uRimColor;
varying vec3 vScoopP;
${noiseGLSL}
`;

const fragmentColor = /* glsl */ `
  vec3 tf_sp = vScoopP;
  float tf_base = tf_snoise(tf_sp * 1.6 + uSeed * 0.71);
  vec3 tf_col = mix(uColorA, uColorB, 0.38 + 0.24 * smoothstep(-0.8, 0.8, tf_base));

  vec3 tf_tp = tf_twist(tf_sp, 3.0);
  float tf_band = sin(tf_tp.y * 9.0 + tf_snoise(tf_sp * 1.8 + uSeed) * 3.5 + tf_tp.x * 2.0);
  float tf_swirl = (1.0 - smoothstep(0.0, 0.22, abs(tf_band))) * uSwirlAmt;
  tf_col = mix(tf_col, uSwirl, tf_swirl);

  float tf_incN = tf_snoise(tf_sp * uIncScale + uSeed * 3.1);
  float tf_inc = smoothstep(uIncThreshold, uIncThreshold + 0.06, tf_incN) * uIncAmt;
  tf_col = mix(tf_col, uIncColor, tf_inc);

  diffuseColor.rgb = tf_col;
`;

const fragmentRoughness = /* glsl */ `
  roughnessFactor = clamp(mix(roughnessFactor * 0.8, 0.28, tf_inc * 0.85), 0.05, 1.0);
`;

const fragmentNormal = /* glsl */ `
  {
    float tf_h = tf_snoise(vScoopP * 22.0 + uSeed) * 0.04 + tf_inc * 0.5;
    vec3 tf_sx = normalize(dFdx(-vViewPosition));
    vec3 tf_sy = normalize(dFdy(-vViewPosition));
    vec2 tf_dh = vec2(dFdx(tf_h), dFdy(tf_h)) * uBumpScale;
    vec3 tf_r1 = cross(tf_sy, normal);
    vec3 tf_r2 = cross(normal, tf_sx);
    float tf_det = dot(tf_sx, tf_r1) * faceDirection;
    vec3 tf_grad = sign(tf_det) * (tf_dh.x * tf_r1 + tf_dh.y * tf_r2);
    normal = normalize(abs(tf_det) * normal - tf_grad);
  }
`;

const fragmentSSS = /* glsl */ `
  {
    vec3 tf_V = normalize(vViewPosition);
    vec3 tf_L = normalize(uKeyDir);
    vec3 tf_H = normalize(tf_L + normal * 0.35);
    float tf_back = pow(clamp(dot(tf_V, -tf_H), 0.0, 1.0), 4.0) * 0.7;
    float tf_thin = pow(1.0 - clamp(dot(normal, tf_V), 0.0, 1.0), 2.5);
    float tf_wrap = clamp((dot(normal, tf_L) + 0.5) / 1.5, 0.0, 1.0);
    outgoingLight += uSSSColor * diffuseColor.rgb * (tf_back + tf_thin * 0.18 + tf_wrap * 0.1) * uKeyIntensity * uSSSStrength;
    outgoingLight += uRimColor * tf_thin * uSelected * 0.45;
  }
`;

const toLinear = (hex) => new THREE.Color(hex);

/** Build per-flavor uniforms from a flavor `look` (see lib/flavors.js). */
export function lookUniforms(look, seed = Math.random() * 100) {
  return {
    uSeed: { value: seed },
    uSquash: { value: 0 },
    uWobble: { value: 0 },
    uColorA: { value: toLinear(look.colorA) },
    uColorB: { value: toLinear(look.colorB) },
    uSwirl: { value: toLinear(look.swirl) },
    uSwirlAmt: { value: look.swirlAmt },
    uIncColor: { value: toLinear(look.incColor) },
    uIncScale: { value: look.inclusion.scale },
    uIncThreshold: { value: look.inclusion.threshold },
    uIncAmt: { value: look.inclusion.amount },
    uSSSColor: { value: toLinear(look.sss) },
    uBumpScale: { value: 0.045 },
    uSelected: { value: 0 },
  };
}

/** Smoothly move a material's flavor uniforms toward a new look (call in useFrame). */
export function dampLook(uniforms, look, alpha) {
  const lerpC = (u, hex) => {
    _tmp.set(hex);
    u.value.lerp(_tmp, alpha);
  };
  lerpC(uniforms.uColorA, look.colorA);
  lerpC(uniforms.uColorB, look.colorB);
  lerpC(uniforms.uSwirl, look.swirl);
  lerpC(uniforms.uIncColor, look.incColor);
  lerpC(uniforms.uSSSColor, look.sss);
  uniforms.uSwirlAmt.value += (look.swirlAmt - uniforms.uSwirlAmt.value) * alpha;
  uniforms.uIncAmt.value += (look.inclusion.amount - uniforms.uIncAmt.value) * alpha;
  // Frequency/threshold jump (they define *what* the inclusion is); amount fades.
  uniforms.uIncScale.value = look.inclusion.scale;
  uniforms.uIncThreshold.value = look.inclusion.threshold;
}
const _tmp = new THREE.Color();

export function createGelatoMaterial(look, seed) {
  const own = lookUniforms(look, seed);
  const material = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: look.rough,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.24,
    sheen: 0.25,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#ffffff'),
    ior: 1.35,
    specularIntensity: 0.6,
  });

  material.userData.uniforms = own;
  material.customProgramCacheKey = () => 'tifa-gelato-v1';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedGelatoUniforms, own);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexPars}`)
      .replace('#include <beginnormal_vertex>', vertexNormal)
      .replace('#include <begin_vertex>', 'vec3 transformed = tf_pos;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${fragmentPars}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${fragmentColor}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${fragmentRoughness}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${fragmentNormal}`)
      .replace('#include <opaque_fragment>', `${fragmentSSS}\n#include <opaque_fragment>`);
  };
  return material;
}
