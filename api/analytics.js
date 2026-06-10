// Uses Upstash Redis REST API directly — no npm install needed
// Environment variables automatically set by Vercel KV / Upstash integration:
// KV_REST_API_URL and KV_REST_API_TOKEN

async function redis(command, ...args) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error('Missing KV_REST_API_URL or KV_REST_API_TOKEN env vars');
  }

  const res = await fetch(`${url}/${[command, ...args].map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── POST: record an event ──
  if (req.method === 'POST') {
    const { event, data } = req.body || {};
    if (!event) return res.status(400).json({ error: 'Missing event' });

    try {
      // Increment total quiz counter
      await redis('INCR', `tifa:count:${event}`);

      // Track today's count
      if (data?.today) {
        await redis('INCR', `tifa:day:${data.today}`);
      }

      // Track hour of day
      if (data?.hour !== undefined) {
        await redis('INCR', `tifa:hour:${data.hour}`);
      }

      // Track flavor (sorted set — auto-ranks by popularity)
      if (data?.flavor) {
        await redis('ZINCRBY', 'tifa:flavors', '1', data.flavor);
      }

      // Track occasion
      if (data?.occ) {
        await redis('ZINCRBY', 'tifa:occasions', '1', data.occ);
      }

      // Track dietary filters
      if (Array.isArray(data?.diets) && data.diets.length > 0) {
        await redis('INCR', 'tifa:count:diet_used');
        for (const d of data.diets) {
          await redis('ZINCRBY', 'tifa:diets', '1', d);
        }
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Redis write error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET: return dashboard data ──
  if (req.method === 'GET') {
    try {
      // Total quizzes
      const total = parseInt(await redis('GET', 'tifa:count:quiz_complete') || '0') || 0;
      const dietUsed = parseInt(await redis('GET', 'tifa:count:diet_used') || '0') || 0;

      // Today's count
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = parseInt(await redis('GET', `tifa:day:${today}`) || '0') || 0;

      // Top 8 flavors — ZRANGE with REV and WITHSCORES
      const flavorRaw = await redis('ZRANGE', 'tifa:flavors', '+inf', '-inf', 'BYSCORE', 'REV', 'LIMIT', '0', '8', 'WITHSCORES');
      const flavors = [];
      if (Array.isArray(flavorRaw)) {
        for (let i = 0; i < flavorRaw.length; i += 2) {
          flavors.push({ name: flavorRaw[i], count: parseInt(flavorRaw[i + 1]) });
        }
      }

      // Occasions
      const occRaw = await redis('ZRANGE', 'tifa:occasions', '+inf', '-inf', 'BYSCORE', 'REV', 'WITHSCORES');
      const occasions = [];
      if (Array.isArray(occRaw)) {
        for (let i = 0; i < occRaw.length; i += 2) {
          occasions.push({ name: occRaw[i], count: parseInt(occRaw[i + 1]) });
        }
      }

      // Diets
      const dietRaw = await redis('ZRANGE', 'tifa:diets', '+inf', '-inf', 'BYSCORE', 'REV', 'WITHSCORES');
      const diets = [];
      if (Array.isArray(dietRaw)) {
        for (let i = 0; i < dietRaw.length; i += 2) {
          diets.push({ name: dietRaw[i], count: parseInt(dietRaw[i + 1]) });
        }
      }

      // Hour breakdown
      const hourCounts = {};
      for (let h = 0; h < 24; h++) {
        const v = await redis('GET', `tifa:hour:${h}`);
        hourCounts[h] = parseInt(v || '0') || 0;
      }

      // Peak hour
      const peakHour = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

      const dietPct = total ? Math.round(dietUsed / total * 100) : 0;

      return res.status(200).json({
        total, todayCount, dietUsed, dietPct,
        peakHour: parseInt(peakHour),
        flavors, occasions, diets, hourCounts
      });
    } catch (err) {
      console.error('Redis read error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
