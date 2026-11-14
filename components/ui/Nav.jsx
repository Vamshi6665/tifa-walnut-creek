'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { openStatus } from '@/lib/config';
import Logo from './Logo';

const LINKS = [
  { href: '#flavors', label: 'Flavors' },
  { href: '#game', label: 'Find yours' },
  { href: '#treats', label: 'Chocolate & coffee' },
  { href: '#story', label: 'Our story' },
  { href: '#catering', label: 'Catering' },
  { href: '#visit', label: 'Visit' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    const tick = () => setStatus(openStatus());
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      window.removeEventListener('scroll', on);
      clearInterval(id);
    };
  }, []);

  return (
    <header data-intro="nav" className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5">
      <nav
        aria-label="Main"
        className={`mx-auto flex h-[60px] max-w-[1400px] items-center gap-4 rounded-full pl-2 pr-2 transition-[background-color,box-shadow,border-color] duration-500 md:pl-2.5 ${
          scrolled || open
            ? 'border border-line bg-paper/90 shadow-[0_14px_34px_-22px_rgb(31_43_42/0.45)] backdrop-blur-xl'
            : 'border border-transparent bg-transparent'
        }`}
      >
        <a href="#top" className="flex shrink-0 items-center gap-3" aria-label="Tifa Chocolate & Gelato, Walnut Creek home">
          <Logo alt="" className="h-11 w-11" fallbackClassName="whitespace-nowrap text-[1rem]" />
          <span className="hidden leading-tight sm:block">
            <span className="block font-display text-[1.05rem] font-[500] tracking-[-0.01em] text-ink">Tifa Chocolate &amp; Gelato</span>
            <span className="block text-[0.72rem] font-medium text-ink-faint">Walnut Creek</span>
          </span>
        </a>
        <ul className="ml-4 hidden items-center gap-0.5 xl:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-full px-3.5 py-2 text-[0.875rem] font-medium text-ink-dim transition-colors hover:bg-ink/[0.05] hover:text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          {status ? (
            <span className="t-tele hidden items-center gap-2 rounded-full px-3 text-[0.8125rem] font-medium text-ink-dim lg:inline-flex">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.open ? 'bg-green' : 'bg-ink-faint'}`} />
              {status.label}
            </span>
          ) : null}
          <a href="#game" className="btn btn-primary hidden !min-h-11 !px-5 text-sm md:inline-flex">
            Find my flavor
          </a>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-line bg-paper/80 text-ink xl:hidden"
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
        <div id="mobile-menu" className="holo mx-auto mt-2 max-w-[1400px] rounded-[28px] p-3 xl:hidden">
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 font-display text-xl text-ink hover:bg-ink/5">
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
