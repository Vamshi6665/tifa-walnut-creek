// Upstash Redis over REST with plain fetch (no SDK), server-only.
// Accepts either naming: the Upstash integration (UPSTASH_*) or the Vercel KV
// integration the current tifa-walnut-creek project already uses (KV_REST_API_*).
const URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const P = 'tifa:v2:'; // key prefix; keeps v2 data apart from the current site's keys

export const redisConfigured = () => Boolean(URL && TOKEN);

export async function pipeline(commands) {
  if (!redisConfigured()) throw new Error('redis-not-configured');
  const res = await fetch(`${URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const out = await res.json();
  return out.map((r) => (r.error ? null : r.result));
}

/** Fixed-window rate limit. Returns true if the caller is over `limit` per `windowSec`. */
export async function limited(id, limit, windowSec = 60) {
  if (!redisConfigured()) return false;
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const key = `${P}rl:${id}:${bucket}`;
  try {
    const [count] = await pipeline([
      ['INCR', key],
      ['EXPIRE', key, String(windowSec + 5)],
    ]);
    return Number(count) > limit;
  } catch {
    return false;
  }
}

export function clientId(req) {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return (fwd.split(',')[0] || req.headers.get('x-real-ip') || 'anon').trim().slice(0, 64);
}

const fmtDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtHour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false });

/** Store-local (Walnut Creek) calendar day, YYYY-MM-DD. */
export const storeDay = (d = new Date()) => fmtDay.format(d);
export const storeHour = (d = new Date()) => Number(fmtHour.format(d)) % 24;

export function hashToObject(arr) {
  const o = {};
  if (Array.isArray(arr)) for (let i = 0; i < arr.length; i += 2) o[arr[i]] = Number(arr[i + 1]) || 0;
  else if (arr && typeof arr === 'object') for (const [k, v] of Object.entries(arr)) o[k] = Number(v) || 0;
  return o;
}
