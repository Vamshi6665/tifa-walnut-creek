'use client';

import { forwardRef, useEffect, useMemo } from 'react';
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';
import { Uniform } from 'three';

/**
 * Screen-space "rain on the glass" post effect (original implementation).
 *
 * A procedural height field of water on the viewport:
 *   - static beads   — hashed grid of hemispherical droplets that grow/evaporate
 *   - runners        — one drop per column sliding down with a wobbly path,
 *                      a thin wet trail and a wake of tiny beads behind it
 * The height gradient refracts the rendered frame (lens offset); everywhere
 * that is *not* water shows lightly fogged glass (8-tap blur), so drops read
 * as clear lenses. `uStrength` fades the whole effect in/out with the weather.
 *
 * Uses `aspect`, `texelSize`, `inputBuffer` provided by postprocessing's EffectPass.
 */
const fragment = /* glsl */ `
uniform float uTime;
uniform float uStrength;

float tf_h21(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

float tf_dome(float d, float r) {
  float k = d / max(r, 1e-4);
  return sqrt(max(0.0, 1.0 - k * k));
}

float tf_beads(vec2 uv, float t, float scale) {
  vec2 g = uv * scale;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float n = tf_h21(id);
  vec2 c = (vec2(tf_h21(id + 1.7), tf_h21(id + 4.3)) - 0.5) * 0.6;
  float life = fract(t * (0.04 + n * 0.07) + n * 7.0);
  float alive = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.65, 1.0, life));
  float r = (0.07 + 0.2 * n * n) * alive;
  return tf_dome(length(f - c), r) * step(0.62, n);
}

float tf_runners(vec2 uv, float t, float cols) {
  float gx = uv.x * cols;
  float col = floor(gx);
  float n = tf_h21(vec2(col, 3.7));
  float speed = 0.07 + n * 0.16;
  float head = (1.0 - fract(t * speed + n * 13.0)) * 1.4 - 0.2;
  float wig = sin(uv.y * 17.0 + n * 6.28) * 0.08 + sin(uv.y * 41.0 + n * 3.1) * 0.025;
  float dx = (fract(gx) - 0.5 - wig) / cols * aspect;
  float dy = uv.y - head;
  float rr = 0.011 + n * 0.008;
  float hHead = tf_dome(length(vec2(dx, dy * 0.85)), rr);

  float above = smoothstep(0.0, 0.008, dy) * (1.0 - smoothstep(0.0, 0.18 + n * 0.22, dy));
  float trailW = rr * 0.32 * max(0.0, 1.0 - dy * 2.5);
  float hTrail = (1.0 - smoothstep(0.0, max(trailW, 1e-4), abs(dx))) * above * 0.3;

  float k = 22.0;
  float cell = floor(dy * k);
  float by = (fract(dy * k) - 0.5) / k;
  float hBead = tf_dome(length(vec2(dx, by)), rr * 0.42) * above * step(0.45, tf_h21(vec2(col, cell)));
  return max(hHead, max(hTrail, hBead * 0.8)) * step(0.45, n);
}

float tf_water(vec2 uv, float t) {
  vec2 a = vec2(aspect, 1.0);
  float h = tf_beads(uv * a, t, 14.0);
  h = max(h, tf_beads(uv * a + 3.1, t * 1.3, 30.0) * 0.75);
  h = max(h, tf_runners(uv, t, 9.0));
  h = max(h, tf_runners(uv + vec2(0.37, 0.0), t * 0.8, 6.0));
  return h;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uStrength < 0.001) { outputColor = inputColor; return; }
  float t = uTime;
  vec2 e = vec2(0.0015);
  float h = tf_water(uv, t);
  float hx = tf_water(uv + vec2(e.x, 0.0), t);
  float hy = tf_water(uv + vec2(0.0, e.y), t);
  vec2 slope = vec2(hx - h, hy - h) / e;
  vec2 lens = -slope * 0.00045 * uStrength;

  float wet = smoothstep(0.02, 0.18, h);
  vec3 throughDrop = texture2D(inputBuffer, uv + lens).rgb * 1.06;

  vec3 fog = inputColor.rgb;
  #ifndef TF_RAIN_LOW
    fog = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853982;
      float rad = (i == 1 || i == 3 || i == 5 || i == 7) ? 7.0 : 3.5;
      fog += texture2D(inputBuffer, uv + vec2(cos(a), sin(a)) * texelSize * rad).rgb;
    }
    fog /= 8.0;
  #endif
  fog = fog * 0.9 + vec3(0.012, 0.018, 0.03);

  vec3 col = mix(inputColor.rgb, fog, 0.6 * uStrength);
  col = mix(col, throughDrop, wet * uStrength);
  float glint = pow(clamp(length(lens) * 30.0, 0.0, 1.0), 3.0);
  col += vec3(0.65, 0.92, 1.0) * glint * 0.18 * wet * uStrength;
  outputColor = vec4(col, inputColor.a);
}
`;

export class RainEffectImpl extends Effect {
  constructor({ strength = 1, low = false } = {}) {
    super('TifaRainEffect', fragment, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      defines: low ? new Map([['TF_RAIN_LOW', '1']]) : new Map(),
      uniforms: new Map([
        ['uTime', new Uniform(0)],
        ['uStrength', new Uniform(strength)],
      ]),
    });
  }

  update(_renderer, _inputBuffer, deltaTime) {
    this.uniforms.get('uTime').value += Math.min(deltaTime, 0.1);
  }
}

export const RainEffect = forwardRef(function RainEffect({ strength = 1, low = false }, ref) {
  const effect = useMemo(() => new RainEffectImpl({ strength, low }), [low]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    effect.uniforms.get('uStrength').value = strength;
  }, [effect, strength]);
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive ref={ref} object={effect} dispose={null} />;
});
