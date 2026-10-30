'use client';

import { DIETARY } from './flavors';
import { STORE } from './config';
import { THEME } from './theme';
import { LOGO, flavorPhoto, optimized } from '@/content/media';

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

  const loadImg = (src) =>
    new Promise((res) => {
      if (!src) return res(null);
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
  const [logo, pic] = await Promise.all([loadImg(LOGO), loadImg(flavorPhoto(flavor.id) ? optimized(flavorPhoto(flavor.id), 1080) : null)]);

  // white card, Tifa green band at the foot (the store's colors)
  g.fillStyle = THEME.paper;
  g.fillRect(0, 0, W, H);
  const pad = 80;

  // the flavor: its real photo when there is one, otherwise its colors
  const cx = W * 0.64;
  const cy = H * 0.37;
  const r = 330;
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();
  if (pic) {
    const k = Math.max((r * 2) / pic.width, (r * 2) / pic.height);
    g.drawImage(pic, cx - (pic.width * k) / 2, cy - (pic.height * k) / 2, pic.width * k, pic.height * k);
  } else {
    const orb = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 30, cx, cy, r);
    orb.addColorStop(0, flavor.look.colorB);
    orb.addColorStop(1, flavor.look.colorA);
    g.fillStyle = orb;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  g.restore();
  g.strokeStyle = THEME.green;
  g.lineWidth = 6;
  g.beginPath();
  g.arc(cx, cy, r + 18, 0, Math.PI * 2);
  g.stroke();

  // logo (the store's own file) or the name in plain type
  if (logo) {
    const ar = logo.width / logo.height || 1;
    const lw = Math.min(420, ar * 120);
    g.drawImage(logo, pad, pad - 10, lw, lw / ar);
  } else {
    g.fillStyle = THEME.ink;
    g.font = '600 46px "Archivo Variable", sans-serif';
    g.fillText('Tifa Chocolate & Gelato', pad, pad + 40);
  }
  g.font = '500 26px "JetBrains Mono Variable", monospace';
  g.fillStyle = THEME.inkDim;
  g.fillText(`Flavor passport  ${new Date().toLocaleDateString('en-US')}`, pad, pad + (logo ? 150 : 92));

  // flavor name (wraps)
  g.fillStyle = THEME.ink;
  setStretch('expanded');
  let size = 132;
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
  if (lines.length > 2) {
    size = 100;
    g.font = `300 ${size}px "Archivo Variable", sans-serif`;
  }
  const baseY = H - 470 - (lines.length - 1) * size * 0.92 + size * 0.6;
  lines.forEach((l, i) => g.fillText(l, pad, baseY + i * size * 0.92));

  g.font = '600 44px "JetBrains Mono Variable", monospace';
  g.fillStyle = THEME.greenInk;
  g.fillText(`${matchPct}% match`, pad, H - 330);

  setStretch('normal');
  g.font = '400 32px "Archivo Variable", sans-serif';
  g.fillStyle = THEME.ink;
  const tags = DIETARY.filter((d) => flavor.tags[d.key]).map((d) => d.label);
  if (tags.length) g.fillText(tags.join('  /  '), pad, H - 270);
  g.fillStyle = THEME.inkDim;
  g.font = '400 28px "Archivo Variable", sans-serif';
  if (because) g.fillText(because.slice(0, 64), pad, H - 222);

  g.fillStyle = THEME.green;
  g.fillRect(0, H - 150, W, 150);
  g.fillStyle = THEME.white;
  g.font = '600 30px "JetBrains Mono Variable", monospace';
  g.fillText(`${STORE.address}, Walnut Creek`, pad, H - 64);

  const url = c.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `tifa-flavor-passport-${flavor.id}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
