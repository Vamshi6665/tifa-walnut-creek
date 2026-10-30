'use client';

import { useEffect, useState } from 'react';
import { CloudRain, Moon, Sun, Menu, X } from 'lucide-react';
import { useStore, useMode } from '@/lib/store';

const LINKS = [
  { href: '#flavors', label: 'Flavors' },
  { href: '#game', label: 'Find yours' },
  { href: '#story', label: 'Our story' },
  { href: '#visit', label: 'Visit' },
  { href: '#dashboard', label: 'Mission control' },
];

const ICON = { day: Sun, night: Moon, rain: CloudRain };

export default function Nav() {
  const weather = useStore((s) => s.weather);
  const override = useStore((s) => s.weatherOverride);
  const cycle = useStore((s) => s.cycleWeather);
  const mode = useMode();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const Icon = ICON[mode];
  const weatherText = override
    ? `Previewing ${override === 'day' ? 'daylight' : override}`
    : weather
      ? `${weather.tempF}°F and ${weather.label}`
      : 'Walnut Creek';
  const onHero = !scrolled;

  return (
    <header
      data-intro="nav"
      data-mode={onHero ? mode : 'night'}
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-500 ${
        scrolled ? 'border-b border-line bg-obsidian/75 backdrop-blur-xl' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 md:px-8" aria-label="Main">
        <a
          href="#top"
          className="font-display text-[1.6rem] font-[350] leading-none tracking-[-0.04em] text-[var(--hero-ink)] [font-stretch:125%]"
          data-magnetic
        >
          tifa<span className="text-rose">.</span>
        </a>
        <ul className="ml-6 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="px-3 py-2 text-[0.875rem] font-medium text-[var(--hero-ink-dim)] transition-colors hover:text-[var(--hero-ink)]"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={cycle}
            title="Lighting follows live Walnut Creek weather. Tap to preview the other looks."
            aria-label={`Lighting: ${weatherText}. Change lighting preview`}
            className="t-tele flex h-10 items-center gap-2 rounded-[3px] border border-[var(--hero-line)] px-3 text-[0.75rem] text-[var(--hero-ink)] transition-colors hover:border-[var(--hero-ink)]"
          >
            <Icon size={15} strokeWidth={2} className={mode === 'rain' ? 'text-mint' : mode === 'night' ? 'text-rose' : ''} />
            <span className="hidden sm:inline">{weatherText}</span>
          </button>
          <a href="#game" className="btn btn-primary hidden !min-h-10 !px-4 text-sm md:inline-flex" data-magnetic>
            Find my flavor
          </a>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-[3px] border border-[var(--hero-line)] text-[var(--hero-ink)] lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>
      {open ? (
        <div id="mobile-menu" className="holo mx-4 mb-4 rounded-md p-3 lg:hidden" data-mode="night">
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block rounded-[3px] px-4 py-3 text-lg font-medium text-chrome hover:bg-white/5">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
