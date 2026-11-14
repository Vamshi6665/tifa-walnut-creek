'use client';
import { useEffect, useState } from 'react';
import { MapPin, Phone, Camera, Cake } from 'lucide-react';
import { HOURS, STORE, openStatus, storeNow } from '@/lib/config';
import Image from 'next/image';
import { PHOTOS, CUTOUTS } from '@/content/photos';
import Cutout from './Cutout';
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
    <section id="visit" className="relative scroll-mt-16 overflow-hidden bg-paper pt-24 md:pt-32" aria-labelledby="visit-title">
      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <p className="t-eyebrow">Visit</p>
            <h2 id="visit-title" className="t-h2 mt-4">
              Right in the heart of <span className="t-accent">Walnut Creek.</span>
            </h2>
            <p className="t-body mt-6 text-ink-dim">{STORE.landmark} Close to Lafayette, Danville and Pleasant Hill.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={STORE.mapsHref} target="_blank" rel="noreferrer" className="btn btn-primary">
                <MapPin size={17} aria-hidden="true" /> Get directions
              </a>
              <a href={STORE.phoneHref} className="btn btn-ghost">
                <Phone size={17} aria-hidden="true" /> {STORE.phone}
              </a>
            </div>
            <figure className="print mt-10 max-w-[460px] rotate-[-2deg]">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[8px]">
                <Image src={PHOTOS.mochaWindow.src} alt={PHOTOS.mochaWindow.alt} fill sizes="(min-width: 768px) 34vw, 90vw" className="object-cover object-[50%_42%]" />
              </div>
              <figcaption className="px-2 pt-3 text-sm text-ink-dim">A table by the front window, looking out on Locust Street.</figcaption>
            </figure>
          </div>
          <div className="grid content-start gap-6 sm:grid-cols-2 md:col-span-7 md:pt-4">
            <div className="rounded-[24px] border border-line bg-paper-2 p-6">
              <div className="flex items-center justify-between">
                <h3 className="t-h3">Hours</h3>
                {status ? (
                  <span className={`t-tele rounded-full px-2.5 py-1 text-xs font-semibold ${status.open ? 'bg-tifa text-white' : 'bg-paper-3 text-ink-dim'}`}>{status.label}</span>
                ) : null}
              </div>
              <table className="mt-4 w-full text-left">
                <caption className="sr-only">Opening hours</caption>
                <tbody>
                  {ORDER.map((d) => {
                    const h = HOURS[d];
                    const isToday = d === today;
                    return (
                      <tr key={h.day} className={`border-b border-line/60 last:border-0 ${isToday ? 'font-semibold text-ink' : 'text-ink-dim'}`}>
                        <th scope="row" className="py-2.5 font-medium">
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
              <address className="rounded-[24px] border border-line bg-paper-2 p-6 not-italic">
                <h3 className="t-h3">Location</h3>
                <p className="mt-3 text-ink">
                  {STORE.address}
                  <br />
                  {STORE.cityLine}
                </p>
              </address>
              <div className="on-teal relative overflow-hidden rounded-[24px] bg-paper p-6">
                <h3 className="t-h3">Follow along</h3>
                <p className="mt-2 text-ink-dim">New flavors, behind the scenes and specials, posted daily.</p>
                <ul className="mt-4 space-y-2 font-semibold">
                  <li>
                    <a href={STORE.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-ink underline-offset-4 hover:underline">
                      <Camera size={17} aria-hidden="true" /> {STORE.instagramHandle}
                    </a>
                  </li>
                  <li>
                    <a href="#catering" className="inline-flex items-center gap-2 text-ink underline-offset-4 hover:underline">
                      <Cake size={17} aria-hidden="true" /> Catering with Naina
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Shelf />
    </section>
  );
}

/** The sage wainscot again, with a row of cups on the ledge: see you soon. */
function Shelf() {
  const cups = [
    [CUTOUTS.mocha, 'clamp(92px, 11vw, 150px)'],
    [CUTOUTS.chocolate, 'clamp(110px, 14vw, 200px)'],
    [CUTOUTS.celebration, 'clamp(96px, 12vw, 168px)'],
    [CUTOUTS.pomegranate, 'clamp(116px, 15vw, 214px)'],
    [CUTOUTS.icedTea, 'clamp(120px, 15vw, 214px)'],
    [CUTOUTS.pumpkin, 'clamp(104px, 13vw, 186px)'],
  ];
  return (
    <div className="relative mt-24 md:mt-32">
      <ul className="relative z-10 mx-auto flex max-w-[1200px] items-end justify-center gap-[2.2vw] px-3">
        {cups.map(([img, h], i) => (
          <li key={img.src} className={`group -mb-[10px] ${i === 0 || i === 5 ? 'hidden sm:block' : ''}`}>
            <div className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-4 group-hover:rotate-[-4deg]">
              <Cutout img={img} h={h} sizes="220px" />
            </div>
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="wainscot relative h-[110px] md:h-[150px]">
        <div className="absolute inset-x-0 -top-[14px] h-[14px] bg-[linear-gradient(180deg,#f4f1ea,#dde3d8)] shadow-[0_8px_14px_-8px_rgb(42_31_27/0.4)]" />
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display text-[clamp(1.5rem,2.8vw,2.4rem)] italic text-[#1d3a36] [font-variation-settings:'SOFT'_100,'WONK'_1]">
          See you on Locust Street.
        </p>
      </div>
    </div>
  );
}
