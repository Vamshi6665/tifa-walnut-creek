import { NextResponse } from 'next/server';
import { P, pipeline, redisConfigured, limited, clientId } from '@/lib/server/redis';

/**
 * Catering & event inquiries, delivered straight to the Walnut Creek owner.
 *
 * Env:
 *   CATERING_EMAIL_TO     where inquiries go (Naina's inbox)          required for the form
 *   RESEND_API_KEY        https://resend.com API key (free tier is enough)  required for the form
 *   CATERING_EMAIL_FROM   optional verified sender, e.g. "Tifa Walnut Creek <catering@yourdomain>"
 *
 * Every inquiry is also kept in Redis (tifa:v2:catering) as a backup when KV is set.
 * GET tells the page whether the form is live; without email set up, the page
 * shows phone / Instagram contact instead of a form that would go nowhere.
 */

const TO = process.env.CATERING_EMAIL_TO;
const RESEND = process.env.RESEND_API_KEY;
const FROM = process.env.CATERING_EMAIL_FROM || 'Tifa Walnut Creek website <onboarding@resend.dev>';
const enabled = () => Boolean(TO && RESEND);

const TYPES = new Set(['Birthday', 'Wedding', 'Corporate / office', 'School or team', 'Other']);
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function GET() {
  return NextResponse.json({ enabled: enabled() });
}

export async function POST(req) {
  if (!enabled()) return NextResponse.json({ ok: false, reason: 'not-configured' }, { status: 503 });
  let b;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }
  if (b?.website) return NextResponse.json({ ok: true }); // honeypot: bots fill hidden fields

  const lead = {
    name: clean(b.name, 80),
    email: clean(b.email, 120),
    phone: clean(b.phone, 40),
    date: clean(b.date, 20),
    guests: clean(b.guests, 8),
    type: TYPES.has(b.type) ? b.type : 'Other',
    message: String(b.message ?? '').trim().slice(0, 2000),
  };
  if (!lead.name || (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email) && lead.phone.replace(/\D/g, '').length < 10)) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });
  }
  if (await limited(`catering:${clientId(req)}`, 4, 600)) {
    return NextResponse.json({ ok: false, reason: 'rate-limited' }, { status: 429 });
  }

  const subject = `Catering inquiry: ${lead.type}${lead.date ? `, ${lead.date}` : ''} (${lead.name})`;
  const rows = [
    ['Name', lead.name],
    ['Email', lead.email || '—'],
    ['Phone', lead.phone || '—'],
    ['Event', lead.type],
    ['Date', lead.date || '—'],
    ['Guests', lead.guests || '—'],
  ];
  const html = `<h2 style="font-family:sans-serif">New catering inquiry from the website</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`)
    .join('')}</table>
<p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${esc(lead.message || '(no message)')}</p>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: lead.email || undefined, subject, html }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}`);
  } catch {
    return NextResponse.json({ ok: false, reason: 'send-failed' }, { status: 502 });
  }

  if (redisConfigured()) {
    try {
      await pipeline([
        ['LPUSH', `${P}catering`, JSON.stringify({ ...lead, at: Date.now() })],
        ['LTRIM', `${P}catering`, '0', '499'],
      ]);
    } catch {
      /* backup only */
    }
  }
  return NextResponse.json({ ok: true });
}
