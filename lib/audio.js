'use client';

/**
 * Synthesized spatial audio cues (Web Audio API, HRTF panner). No audio files.
 * Every call is user-gesture driven (quiz clicks), so autoplay policies are satisfied.
 */
let ctx = null;
let noiseBuffer = null;

function audio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function spatial(ac, x, y, z) {
  const p = ac.createPanner();
  p.panningModel = 'HRTF';
  p.distanceModel = 'inverse';
  p.refDistance = 1;
  if (p.positionX) {
    p.positionX.value = x;
    p.positionY.value = y;
    p.positionZ.value = z;
  } else p.setPosition(x, y, z);
  return p;
}

/** Energy stream entering the vortex from a compass direction (0..3). */
export function playStream(index = 0, enabled = true) {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 6;
  bp.frequency.setValueAtTime(300 + index * 120, t);
  bp.frequency.exponentialRampToValueAtTime(2400 + index * 300, t + 0.55);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  const pan = spatial(ac, Math.cos(angle) * 3, 0, Math.sin(angle) * 3 - 1);
  src.connect(bp).connect(g).connect(pan).connect(ac.destination);
  src.start(t);
  src.stop(t + 0.75);

  // tonal ping, one step up the scale per answer
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.value = [392, 494, 587, 740][index % 4];
  const og = ac.createGain();
  og.gain.setValueAtTime(0.0001, t + 0.15);
  og.gain.exponentialRampToValueAtTime(0.12, t + 0.2);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  o.connect(og).connect(pan);
  o.start(t + 0.15);
  o.stop(t + 1);
}

/** Collision: sub drop + bright shimmer, centered in front of the listener. */
export function playCollision(enabled = true) {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const pan = spatial(ac, 0, 0, -1);
  pan.connect(ac.destination);

  const sub = ac.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(140, t);
  sub.frequency.exponentialRampToValueAtTime(38, t + 0.9);
  const sg = ac.createGain();
  sg.gain.setValueAtTime(0.6, t);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  sub.connect(sg).connect(pan);
  sub.start(t);
  sub.stop(t + 1.2);

  const n = ac.createBufferSource();
  n.buffer = noiseBuffer;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3200;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.25, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  n.connect(hp).connect(ng).connect(pan);
  n.start(t);
  n.stop(t + 1.5);

  [1047, 1319, 1568].forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t + 0.25 + i * 0.07);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.3 + i * 0.07);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(pan);
    o.start(t + 0.25 + i * 0.07);
    o.stop(t + 1.7);
  });
}

/** Short, soft "pop" for a scoop landing or being tapped (pitch varies per scoop). */
export function playPop(index = 0, enabled = true) {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = 'sine';
  const f0 = 520 + (index % 4) * 90;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 2.1, t + 0.06);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + 0.18);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + 0.25);
}

/** True once the visitor has interacted (browsers block audio before that). */
export function audioUnlocked() {
  return Boolean(ctx && ctx.state === 'running');
}

/** Create/resume the audio context on the first tap or click anywhere. */
export function primeAudioOnFirstGesture() {
  if (typeof window === 'undefined') return;
  const go = () => {
    audio();
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
  };
  window.addEventListener('pointerdown', go, { passive: true });
  window.addEventListener('keydown', go);
}
