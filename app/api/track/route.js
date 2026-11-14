import { NextResponse } from 'next/server';
import { FLAVOR_BY_ID } from '@/lib/flavors';
import { P, pipeline, redisConfigured, limited, clientId, storeDay, storeHour } from '@/lib/server/redis';

const DIET = new Set(['vegan', 'dairyFree', 'glutenFree', 'nutFree']);

export async function POST(req) {
  if (!redisConfigured()) return NextResponse.json({ ok: false, reason: 'not-configured' }, { status: 202 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }
  const flavorId = String(body?.flavorId || '');
  const dietary = Array.isArray(body?.dietary) ? [...new Set(body.dietary.map(String))].filter((d) => DIET.has(d)) : [];
  if (body?.type !== 'quiz' || !FLAVOR_BY_ID[flavorId]) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });
  }
  if (await limited(`track:${clientId(req)}`, 12)) {
    return NextResponse.json({ ok: false, reason: 'rate-limited' }, { status: 429 });
  }

  const now = new Date();
  const day = `${P}day:${storeDay(now)}`;
  const cmds = [
    ['INCR', `${P}total`],
    ['INCR', day],
    ['EXPIRE', day, String(60 * 60 * 24 * 120)],
    ['HINCRBY', `${P}hours`, String(storeHour(now)), '1'],
    ['HINCRBY', `${P}flavors`, flavorId, '1'],
    ['LPUSH', `${P}recent`, JSON.stringify({ f: flavorId, t: now.getTime() })],
    ['LTRIM', `${P}recent`, '0', '49'],
  ];
  if (dietary.length) {
    cmds.push(['INCR', `${P}dietaryUsed`]);
    dietary.forEach((d) => cmds.push(['HINCRBY', `${P}dietary`, d, '1']));
  }
  try {
    await pipeline(cmds);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: 'storage' }, { status: 502 });
  }
}
