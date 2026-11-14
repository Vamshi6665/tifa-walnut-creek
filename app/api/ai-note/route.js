import { NextResponse } from 'next/server';
import { FLAVORS, FLAVOR_BY_ID, pairingReason, topTraits } from '@/lib/flavors';
import { QUESTIONS } from '@/lib/matcher';
import { limited, clientId } from '@/lib/server/redis';

/**
 * Short pairing / match notes. The flavor CHOICE is always made client-side by
 * deterministic math over the catalog; this endpoint only writes the sentence.
 *
 * Guardrails against hallucination:
 *   1. IDs are validated against the catalog before anything is sent.
 *   2. The prompt carries the only facts the model may use (names + taste traits).
 *   3. Every returned sentence is checked: length cap, must name the expected
 *      flavor(s), must not name any OTHER catalog flavor, and must not make
 *      dietary/allergen/health claims. Anything that fails falls back to the
 *      profile-derived note.
 * No key configured → deterministic notes only (source: 'profile').
 */

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const BANNED = /(allerg|gluten|vegan|dairy|lactose|nut-?free|peanut|healthy|calorie|sugar-?free|keto|medical|cure)/i;
const cache = new Map();

const label = (qId, optId) => QUESTIONS.find((q) => q.id === qId)?.options.find((o) => o.id === optId)?.label;
const plainName = (n) => n.replace(/ Sorbetto$/, '');

function mentionsOnly(text, allowedIds) {
  const t = text.toLowerCase();
  const allowed = new Set(allowedIds);
  for (const f of FLAVORS) {
    if (allowed.has(f.id)) continue;
    const name = plainName(f.name).toLowerCase();
    if (name.length > 3 && t.includes(name)) return false;
  }
  return true;
}

function valid(text, mustName, allowedIds) {
  if (typeof text !== 'string') return false;
  const s = text.trim();
  if (s.length < 12 || s.length > 220) return false;
  if (BANNED.test(s)) return false;
  if (mustName && !s.toLowerCase().includes(plainName(mustName).toLowerCase())) return false;
  return mentionsOnly(s, allowedIds);
}

async function ask(system, user) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, temperature: 0.4, system, messages: [{ role: 'user', content: user }] }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.content?.find((c) => c.type === 'text')?.text ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM = `You write one-sentence flavor notes for Tifa Chocolate & Gelato in Walnut Creek.
Rules: use ONLY the flavor names and taste traits given. Never mention any other flavor, ingredient, topping, allergen, dietary status, health claim or price. Plain, warm, specific. No emoji. No exclamation marks. Max 22 words per sentence.`;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad-json' }, { status: 400 });
  }

  // ---- twins -----------------------------------------------------------------
  if (body?.kind === 'twins') {
    const focus = FLAVOR_BY_ID[body.focus];
    const twins = (Array.isArray(body.twins) ? body.twins : []).slice(0, 4).map((id) => FLAVOR_BY_ID[id]).filter(Boolean);
    if (!focus || !twins.length) return NextResponse.json({ error: 'invalid' }, { status: 400 });

    const fallback = Object.fromEntries(twins.map((t) => [t.id, pairingReason(focus.id, t.id)]));
    const key = `t:${focus.id}:${twins.map((t) => t.id).join(',')}`;
    if (cache.has(key)) return NextResponse.json(cache.get(key));
    if (!KEY || (await limited(`ai:${clientId(req)}`, 20))) return NextResponse.json({ notes: fallback, source: 'profile' });

    const facts = [focus, ...twins].map((f) => `- ${f.id}: "${f.name}", traits: ${topTraits(f.id, 3).join(', ')}`).join('\n');
    const user = `Flavors:\n${facts}\n\nFor each of ${twins.map((t) => t.id).join(', ')}, write one sentence on why it pairs with "${focus.name}", naming both flavors. Reply with JSON only: {"<id>": "<sentence>", ...}`;
    const text = await ask(SYSTEM, user);
    const notes = { ...fallback };
    let source = 'profile';
    try {
      const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      for (const t of twins) {
        if (valid(json[t.id], t.name, [focus.id, t.id])) {
          notes[t.id] = json[t.id].trim();
          source = 'ai';
        }
      }
    } catch {
      /* keep fallback */
    }
    const out = { notes, source };
    cache.set(key, out);
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    return NextResponse.json(out);
  }

  // ---- quiz match -----------------------------------------------------------------
  if (body?.kind === 'match') {
    const f = FLAVOR_BY_ID[body.flavor];
    if (!f) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const a = body.answers || {};
    const wants = [label('sweetness', a.sweetness), label('mood', a.mood), label('intensity', a.intensity)].filter(Boolean);
    if (!KEY || !wants.length || (await limited(`ai:${clientId(req)}`, 20))) return NextResponse.json({ note: null, source: 'profile' });

    const key = `m:${f.id}:${wants.join('|')}`;
    if (cache.has(key)) return NextResponse.json(cache.get(key));
    const user = `Flavor: "${f.name}", traits: ${topTraits(f.id, 3).join(', ')}.\nThe guest asked for: ${wants.join('; ')}.\nWrite one sentence telling them why ${f.name} fits, naming it. Reply with the sentence only.`;
    const text = (await ask(SYSTEM, user))?.trim().replace(/^"|"$/g, '');
    const out = valid(text, f.name, [f.id]) ? { note: text, source: 'ai' } : { note: null, source: 'profile' };
    cache.set(key, out);
    return NextResponse.json(out);
  }

  return NextResponse.json({ error: 'unknown-kind' }, { status: 400 });
}
