import { kv } from '@vercel/kv';

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
      const ts = Date.now();
      const entry = JSON.stringify({ ...data, ts });

      // Push into a capped list (keep last 1000 per event)
      await kv.lpush(`tifa:${event}`, entry);
      await kv.ltrim(`tifa:${event}`, 0, 999);

      // Also keep running counters
      await kv.incr(`tifa:count:${event}`);
      if(data?.today) await kv.incr(`tifa:day:${data.today}`);

      // Hour bucket for time-of-day chart
      const hour = new Date().getHours();
      await kv.incr(`tifa:hour:${hour}`);

      // Flavor counter
      if (data?.flavor) {
        await kv.zincrby('tifa:flavors', 1, data.flavor);
      }

      // Occasion counter
      if (data?.occ) {
        await kv.zincrby('tifa:occasions', 1, data.occ);
      }

      // Diet counters
      if (data?.diets && Array.isArray(data.diets)) {
        for (const d of data.diets) {
          await kv.zincrby('tifa:diets', 1, d);
        }
        if (data.diets.length > 0) {
          await kv.incr('tifa:count:diet_used');
        }
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('KV write error:', err);
      return res.status(500).json({ error: 'Storage error' });
    }
  }

  // ── GET: return dashboard data ──
  if (req.method === 'GET') {
    try {
      // Total quizzes
      const total = parseInt(await kv.get('tifa:count:quiz_complete') || '0');
      const dietUsed = parseInt(await kv.get('tifa:count:diet_used') || '0');

      // Today's count — store separately by date
      const today = new Date().toISOString().slice(0, 10); // "2025-06-09"
      const todayCount = parseInt(await kv.get(`tifa:day:${today}`) || '0');

      // Top flavors (sorted set, top 8)
      const flavorRaw = await kv.zrange('tifa:flavors', 0, 7, { rev: true, withScores: true });
      const flavors = [];
      for (let i = 0; i < flavorRaw.length; i += 2) {
        flavors.push({ name: flavorRaw[i], count: parseInt(flavorRaw[i + 1]) });
      }

      // Occasions
      const occRaw = await kv.zrange('tifa:occasions', 0, -1, { rev: true, withScores: true });
      const occasions = [];
      for (let i = 0; i < occRaw.length; i += 2) {
        occasions.push({ name: occRaw[i], count: parseInt(occRaw[i + 1]) });
      }

      // Diets
      const dietRaw = await kv.zrange('tifa:diets', 0, -1, { rev: true, withScores: true });
      const diets = [];
      for (let i = 0; i < dietRaw.length; i += 2) {
        diets.push({ name: dietRaw[i], count: parseInt(dietRaw[i + 1]) });
      }

      // Hour breakdown (0–23)
      const hourCounts = {};
      const hourKeys = Array.from({ length: 24 }, (_, i) => `tifa:hour:${i}`);
      const hourVals = await Promise.all(hourKeys.map(k => kv.get(k)));
      hourVals.forEach((v, i) => { hourCounts[i] = parseInt(v || '0'); });

      // Peak hour
      const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

      return res.status(200).json({
        total, todayCount, dietUsed, peakHour: parseInt(peakHour || 0),
        flavors, occasions, diets, hourCounts,
        dietPct: total ? Math.round(dietUsed / total * 100) : 0
      });
    } catch (err) {
      console.error('KV read error:', err);
      return res.status(500).json({ error: 'Read error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
