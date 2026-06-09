const STORE = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { event, data } = req.body || {};
    if (!event) return res.status(400).json({ error: 'Missing event' });

    const key = event;
    if (!STORE[key]) STORE[key] = [];
    STORE[key].push({ ...data, ts: Date.now() });

    // Keep only last 500 events per key to avoid memory bloat
    if (STORE[key].length > 500) STORE[key] = STORE[key].slice(-500);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    return res.status(200).json(STORE);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
