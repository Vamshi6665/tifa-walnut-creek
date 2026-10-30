'use client';

import { forwardRef, useEffect, useMemo } from 'react';
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';
import { Color, Uniform } from 'three';

/**
 * The hero's two signature transitions, as one post effect.
 *
 * ARRIVAL ("print")  uScan 0→1
 *   A hairline beam rises from the bottom of the frame. Below it the scene
 *   exists; above it there is only obsidian and a faint mint construction grid.
 *   The band just under the beam is over-exposed and slice-jittered for a few
 *   frames, so the coupe reads as being fabricated from the base upward.
 *
 * EXIT ("melt")  uMelt 0→1 (scroll-driven)
 *   Obsidian liquid pours down over the scene in drips. Each screen column has
 *   its own delay (slow swell + narrow "fingers" that run ahead); the falling
 *   front carries a mercury-like specular lip and drags the image beneath it
 *   downward, so the scene looks like it is melting away into the next section.
 *
 * Pass-through (one branch) when neither transition is active.
 */
const fragment = /* glsl */ `
uniform float uScan;
uniform float uMelt;
uniform float uTime;
uniform vec3 uBg;

float tf_h11(float x) { return fract(sin(x * 127.1) * 43758.5453); }
float tf_n1(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(tf_h11(i), tf_h11(i + 1.0), u);
}

// how far (in uv) the dark liquid has run down at column x
float tf_front(float x, float melt) {
  float slow = tf_n1(x * 4.0 + 3.1);
  // drips: smooth rounded bumps rather than hard-edged columns
  float f = tf_n1(x * 16.0 + 11.7);
  float finger = f * f * (3.0 - 2.0 * f);
  finger = finger * finger;
  float delay = 0.5 * slow + 0.32 * (1.0 - finger);
  float m = clamp(melt * 1.9 - delay, 0.0, 2.0);
  return m * m * 0.85;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uScan > 0.999 && uMelt < 0.001) {
    outputColor = inputColor;
    return;
  }
  vec3 col = inputColor.rgb;

  // ---------------- arrival: bottom-up print ----------------
  if (uScan <= 0.999) {
    float beamY = uScan * 1.12 - 0.04;
    float wob = (tf_n1(uv.x * 60.0 + uTime * 9.0) - 0.5) * 0.003;
    float d = uv.y - (beamY + wob);                 // > 0: not printed yet
    float printed = 1.0 - smoothstep(-0.001, 0.001, d);
    float fresh = exp(-max(-d, 0.0) * 22.0) * printed; // just-printed band

    // slice jitter inside the fresh band
    float slice = floor(uv.y * 160.0);
    float jitter = (tf_h11(slice + floor(uTime * 24.0)) - 0.5) * 0.012 * fresh;
    vec3 src = texture2D(inputBuffer, uv + vec2(jitter, 0.0)).rgb;
    vec3 printedCol = src * (1.0 + fresh * 0.9) + vec3(0.7, 1.0, 0.92) * fresh * 0.05;

    // construction grid ahead of the beam
    float gx = 1.0 - smoothstep(0.0, 0.014, 0.5 - abs(fract(uv.x * aspect * 18.0) - 0.5));
    float gy = 1.0 - smoothstep(0.0, 0.014, 0.5 - abs(fract(uv.y * 18.0) - 0.5));
    float grid = max(gx, gy) * smoothstep(0.45, 0.0, d) * (1.0 - printed);
    vec3 ahead = uBg + vec3(0.31, 0.89, 0.76) * grid * 0.07;

    col = mix(ahead, printedCol, printed);
    float beam = exp(-abs(d) * 1400.0) + exp(-abs(d) * 120.0) * 0.18;
    col += vec3(0.9, 1.0, 0.96) * beam * 1.25;
  }

  // ---------------- exit: obsidian melt ----------------
  if (uMelt >= 0.001) {
    float front = 1.0 - tf_front(uv.x, uMelt);       // y of the liquid front
    float below = front - uv.y;                       // > 0: scene still visible
    // drag the image under the front downward (melting)
    float drag = 0.035 * exp(-max(below, 0.0) * 12.0) * smoothstep(0.0, 0.25, uMelt);
    vec3 scene = texture2D(inputBuffer, vec2(uv.x, min(uv.y + drag, 0.999))).rgb;
    scene *= 1.0 - 0.55 * exp(-max(below, 0.0) * 40.0);  // contact shadow under the front
    float covered = smoothstep(0.0, 0.0025, -below);
    // mercury lip on the liquid front
    float lip = exp(-abs(below + 0.004) * 420.0);
    float sheen = 0.5 + 0.5 * sin(uv.x * 90.0 + uTime * 1.5);
    vec3 liquid = uBg + vec3(0.78, 0.82, 0.9) * lip * (0.35 + 0.25 * sheen);
    col = mix(scene, liquid, max(covered, lip * 0.85));
  }

  outputColor = vec4(col, inputColor.a);
}
`;

export class TransitionEffectImpl extends Effect {
  constructor() {
    super('TifaTransitionEffect', fragment, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ['uScan', new Uniform(1)],
        ['uMelt', new Uniform(0)],
        ['uTime', new Uniform(0)],
        ['uBg', new Uniform(new Color('#0A0A0C'))],
      ]),
    });
  }

  update(_renderer, _inputBuffer, deltaTime) {
    this.uniforms.get('uTime').value += Math.min(deltaTime, 0.1);
  }
}

export const TransitionEffect = forwardRef(function TransitionEffect(_props, ref) {
  const effect = useMemo(() => new TransitionEffectImpl(), []);
  useEffect(() => () => effect.dispose(), [effect]);
  return <primitive ref={ref} object={effect} dispose={null} />;
});
