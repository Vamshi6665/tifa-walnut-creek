'use client';

import { useEffect, useState } from 'react';
import { Phone, Camera, MapPin, Check } from 'lucide-react';
import { STORE } from '@/lib/config';
import Photo from './Photo';

const TYPES = ['Birthday', 'Wedding', 'Corporate / office', 'School or team', 'Other'];

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-chrome-dim">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-chrome-faint">{hint}</span> : null}
    </label>
  );
}

const input =
  'mt-1.5 h-12 w-full rounded-[3px] border border-line bg-obsidian-2 px-3.5 text-[0.975rem] text-chrome placeholder:text-chrome-faint focus:border-chrome';

function ContactOptions() {
  return (
    <div className="flex flex-col gap-3">
      <a href={STORE.phoneHref} className="btn btn-primary justify-center sm:justify-start">
        <Phone size={17} aria-hidden="true" /> Call the store, {STORE.phone}
      </a>
      <a href={STORE.instagram} target="_blank" rel="noreferrer" className="btn btn-ghost justify-center sm:justify-start">
        <Camera size={17} aria-hidden="true" /> Message us on Instagram
      </a>
      <a href={STORE.mapsHref} target="_blank" rel="noreferrer" className="btn btn-ghost justify-center sm:justify-start">
        <MapPin size={17} aria-hidden="true" /> Stop by {STORE.address}
      </a>
    </div>
  );
}

export default function Catering() {
  const [enabled, setEnabled] = useState(null);
  const [state, setState] = useState({ status: 'idle', error: '' });
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: 'Birthday', date: '', guests: '', message: '', website: '' });

  useEffect(() => {
    fetch('/api/catering')
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email && form.phone.replace(/\D/g, '').length < 10) {
      setState({ status: 'error', error: 'Add an email or a 10-digit phone number so Naina can reply.' });
      return;
    }
    setState({ status: 'sending', error: '' });
    try {
      const r = await fetch('/api/catering', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) setState({ status: 'sent', error: '' });
      else if (d.reason === 'rate-limited') setState({ status: 'error', error: 'Too many requests from this device. Please call the store instead.' });
      else setState({ status: 'error', error: `The inquiry didn't go through. Please call ${STORE.phone} instead.` });
    } catch {
      setState({ status: 'error', error: `The inquiry didn't go through. Please call ${STORE.phone} instead.` });
    }
  };

  return (
    <section id="catering" className="relative scroll-mt-16 bg-obsidian py-24 md:py-32" aria-labelledby="catering-title">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 md:px-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="catering-title" className="t-h2" data-warp>
            Catering, planned with Naina.
          </h2>
          <p className="t-body mt-6 text-chrome-dim">
            Gelato, chocolates and coffee for birthdays, weddings, office treats and school events. Catering for Tifa Walnut Creek is handled
            right here on Locust Street by owner Naina Balupari. Tell us about your event and she&apos;ll get back to you.
          </p>
          <Photo slot="catering" className="mt-8 aspect-[4/3] rounded-lg" sizes="(min-width: 1024px) 40vw, 100vw" />
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          {enabled === null ? (
            <div className="h-[28rem]" aria-hidden="true" />
          ) : !enabled ? (
            <div className="rounded-lg border border-line p-6 md:p-8">
              <h3 className="t-h3">Talk to us about your event</h3>
              <p className="mt-2 text-chrome-dim">Call, message or stop by and ask for Naina.</p>
              <div className="mt-6">
                <ContactOptions />
              </div>
            </div>
          ) : state.status === 'sent' ? (
            <div className="rounded-lg border border-mint/30 p-6 md:p-8" role="status">
              <Check className="text-mint" aria-hidden="true" />
              <h3 className="t-h3 mt-4">Sent to Naina.</h3>
              <p className="mt-2 text-chrome-dim">
                Thanks, {form.name.split(' ')[0]}. She&apos;ll reply to {form.email || form.phone}. For anything urgent, call {STORE.phone}.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-5 rounded-lg border border-line p-6 sm:grid-cols-2 md:p-8" noValidate>
              <div className="sm:col-span-2">
                <Field label="Your name">
                  <input required autoComplete="name" className={input} value={form.name} onChange={set('name')} />
                </Field>
              </div>
              <Field label="Email">
                <input type="email" autoComplete="email" className={input} value={form.email} onChange={set('email')} />
              </Field>
              <Field label="Phone" hint="Email or phone, whichever you prefer">
                <input type="tel" autoComplete="tel" className={input} value={form.phone} onChange={set('phone')} />
              </Field>
              <Field label="Event">
                <select className={input} value={form.type} onChange={set('type')}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input type="date" className={input} value={form.date} onChange={set('date')} />
              </Field>
              <Field label="Number of guests">
                <input inputMode="numeric" className={input} value={form.guests} onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value.replace(/\D/g, '').slice(0, 5) }))} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Tell us about it">
                  <textarea rows={4} className={`${input} h-auto py-3`} value={form.message} onChange={set('message')} />
                </Field>
              </div>
              {/* honeypot for bots */}
              <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={set('website')} />
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <button type="submit" className="btn btn-primary" disabled={state.status === 'sending'} data-magnetic>
                  {state.status === 'sending' ? 'Sending…' : 'Send to Naina'}
                </button>
                <a href={STORE.phoneHref} className="text-sm text-chrome-dim underline-offset-4 hover:underline">
                  Or call {STORE.phone}
                </a>
              </div>
              {state.status === 'error' ? (
                <p className="text-sm text-rose sm:col-span-2" role="alert">
                  {state.error}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
