'use client';

import { DIETARY } from './flavors';
import { STORE } from './config';

/** Renders a 1080×1350 (Instagram portrait) flavor passport PNG and downloads it. */
export async function downloadPassport({ flavor, matchPct, because }) {
  try {
    await Promise.all([
      document.fonts.load('300 100px "Archivo Variable"'),
      document.fonts.load('500 40px "JetBrains Mono Variable"'),
    ]);
  } catch {
    /* fonts optional */
  }
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const setStretch = (v) => {
    if ('fontStretch' in g) g.fontStretch = v;
  };

  g.fillStyle = '#0A0A0C';
  g.fillRect(0, 0, W, H);
  // scoop orb
  const orb = g.createRadialGradient(W * 0.62, H * 0.36, 40, W * 0.62, H * 0.4, 520);
  orb.addColorStop(0, flavor.look.colorB);
  orb.addColorStop(0.45, flavor.look.colorA);
  orb.addColorStop(1, 'rgba(10,10,12,0)');
  g.fillStyle = orb;
  g.fillRect(0, 0, W, H);
  // rings
  g.strokeStyle = 'rgba(255,158,170,0.7)';
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(W * 0.62, H * 0.62, 360, 60, 0, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(80,227,194,0.35)';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(W * 0.62, H * 0.62, 440, 80, 0, 0, Math.PI * 2);
  g.stroke();

  const pad = 80;
  g.fillStyle = '#E2E8F0';
  g.font = '600 64px "Archivo Variable", sans-serif';
  g.fillText('tifa.', pad, pad + 40);
  g.font = '500 28px "JetBrains Mono Variable", monospace';
  g.fillStyle = '#9AA3B2';
  g.fillText(`Flavor passport  ${new Date().toLocaleDateString('en-US')}`, pad, pad + 96);

  // flavor name (wraps)
  g.fillStyle = '#FFF7D6';
  setStretch('expanded');
  let size = 150;
  g.font = `300 ${size}px "Archivo Variable", sans-serif`;
  const words = flavor.name.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > W - pad * 2 && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  lines.push(line);
  if (lines.length > 3) {
    size = 110;
    g.font = `300 ${size}px "Archivo Variable", sans-serif`;
  }
  const baseY = H - 420 - (lines.length - 1) * size * 0.92;
  lines.forEach((l, i) => g.fillText(l, pad, baseY + i * size * 0.92));

  g.font = '600 46px "JetBrains Mono Variable", monospace';
  g.fillStyle = '#50E3C2';
  g.fillText(`${matchPct}% match`, pad, H - 300);

  setStretch('normal');
  g.font = '400 34px "Archivo Variable", sans-serif';
  g.fillStyle = '#E2E8F0';
  const tags = DIETARY.filter((d) => flavor.tags[d.key]).map((d) => d.label);
  if (tags.length) g.fillText(tags.join('  /  '), pad, H - 240);
  g.fillStyle = '#9AA3B2';
  g.font = '400 30px "Archivo Variable", sans-serif';
  if (because) g.fillText(because.slice(0, 60), pad, H - 190);

  g.fillStyle = '#FF9EAA';
  g.font = '600 30px "JetBrains Mono Variable", monospace';
  g.fillText(`${STORE.address}, Walnut Creek`, pad, H - pad);

  const url = c.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `tifa-flavor-passport-${flavor.id}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
