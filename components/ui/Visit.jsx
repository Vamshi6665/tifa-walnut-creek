'use client';

import { useEffect, useState } from 'react';
import { MapPin, Phone, Camera, Cake } from 'lucide-react';
import { HOURS, STORE, openStatus, storeNow } from '@/lib/config';
import Photo from './Photo';

const fmt = (h) => `${((h + 11) % 12) + 1} ${h >= 12 ? 'PM' : 'AM'}`;
// Display order Mon → Sun
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Visit() {
  const [today, setToday] = useState(null);
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const tick = () => {
      setToday(storeNow().dayIndex);
      setStatus(openStatus());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="visit" className="relative scroll-mt-16 bg-paper pb-24 md:pb-32" aria-labelledby="visit-title">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="grid gap-6 border-t border-line pt-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <h2 id="visit-title" className="t-h2" data-warp>
              Right in the heart of Walnut Creek.
            </h2>
            <p className="t-body mt-6 text-ink-dim">{STORE.landmark} Close to Lafayette, Danville and Pleasant Hill.</p>
            <Photo slot="storefront" className="mt-8 aspect-[4/3] rounded-lg" sizes="(min-width: 768px) 40vw, 100vw" />
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={STORE.mapsHref} target="_blank" rel="noreferrer" className="btn btn-primary" data-magnetic>
                <MapPin size={17} aria-hidden="true" /> Get directions
              </a>
              <a href={STORE.phoneHref} className="btn btn-ghost" data-magnetic>
                <Phone size={17} aria-hidden="true" /> {STORE.phone}
              </a>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:col-span-7">
            <div className="rounded-lg border border-line p-6">
              <div className="flex items-center justify-between">
                <h3 className="t-h3">Hours</h3>
                {status ? (
                  <span className={`t-tele text-sm ${status.open ? 'text-green-ink' : 'text-green-ink'}`}>{status.label}</span>
                ) : null}
              </div>
              <table className="mt-4 w-full text-left">
                <caption className="sr-only">Opening hours</caption>
                <tbody>
                  {ORDER.map((d) => {
                    const h = HOURS[d];
                    const isToday = d === today;
                    return (
                      <tr key={h.day} className={`border-b border-line/60 last:border-0 ${isToday ? 'text-ink' : 'text-ink-dim'}`}>
                        <th scope="row" className="py-2.5 font-semibold">
                          {h.day}
                          {isToday ? <span className="sr-only"> (today)</span> : null}
                        </th>
                        <td className="t-tele py-2.5 text-right">
                          {fmt(h.open)} to {fmt(h.close)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-6">
              <address className="rounded-lg border border-line p-6 not-italic">
                <h3 className="t-h3">Location</h3>
                <p className="mt-3 text-ink">
                  {STORE.address}
                  <br />
                  {STORE.cityLine}
                </p>
              </address>
              <div className="rounded-lg border border-line p-6">
                <h3 className="t-h3">Follow along</h3>
                <p className="mt-2 text-ink-dim">New flavors, behind the scenes and specials, posted daily.</p>
                <ul className="mt-4 space-y-2 font-semibold">
                  <li>
                    <a href={STORE.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-green-ink hover:text-ink">
                      <Camera size={17} aria-hidden="true" /> {STORE.instagramHandle}
                    </a>
                  </li>
                  <li>
                    <a href="#catering" className="inline-flex items-center gap-2 text-ink hover:text-ink">
                      <Cake size={17} aria-hidden="true" /> Catering with Naina
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
