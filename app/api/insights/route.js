import { NextResponse } from 'next/server';
import { FLAVOR_BY_ID } from '@/lib/flavors';
import { P, pipeline, redisConfigured, storeDay, hashToObject } from '@/lib/server/redis';

export const dynamic = 'force-dynamic';

const DAYS = 14;

function lastDays(n) {
  const out = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) out.push(storeDay(new Date(now - i * 86400000)));
  return out;
}

export async function GET() {
  if (!redisConfigured()) {
    return NextResponse.json({ configured: false }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const days = lastDays(DAYS);
  try {
    const [total, hours, flavors, dietary, dietaryUsed, recent, perDay] = await pipeline([
      ['GET', `${P}total`],
      ['HGETALL', `${P}hours`],
      ['HGETALL', `${P}flavors`],
      ['HGETALL', `${P}dietary`],
      ['GET', `${P}dietaryUsed`],
      ['LRANGE', `${P}recent`, '0', '19'],
      ['MGET', ...days.map((d) => `${P}day:${d}`)],
    ]);
    const hourObj = hashToObject(hours);
    const daily = days.map((d, i) => ({ day: d, count: Number(perDay?.[i]) || 0 }));
    const body = {
      configured: true,
      generatedAt: new Date().toISOString(),
      total: Number(total) || 0,
      today: daily[daily.length - 1].count,
      hours: Array.from({ length: 24 }, (_, h) => hourObj[h] || 0),
      flavors: Object.entries(hashToObject(flavors))
        .filter(([id]) => FLAVOR_BY_ID[id])
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({ id, count })),
      dietary: hashToObject(dietary),
      dietaryUsed: Number(dietaryUsed) || 0,
      daily,
      recent: (recent || [])
        .map((s) => {
          try {
            const r = JSON.parse(s);
            return FLAVOR_BY_ID[r.f] ? { id: r.f, t: Number(r.t) } : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } });
  } catch {
    return NextResponse.json({ configured: true, error: 'storage-unavailable' }, { status: 502 });
  }
}
