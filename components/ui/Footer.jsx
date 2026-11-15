import { STORE } from '@/lib/config';
import Logo from './Logo';
const COLS = [
  {
    title: 'Here',
    links: [
      ["Today's flavors", '#flavors'],
      ['Find my flavor', '#game'],
      ['Reviews', '#reviews'],
      ['Catering with Naina', '#catering'],
    ],
  },
  {
    title: 'Visit',
    links: [
      [`${STORE.address}, ${STORE.cityLine}`, STORE.mapsHref],
      [STORE.phone, STORE.phoneHref],
      ['Hours', '#visit'],
    ],
  },
  {
    title: 'Follow',
    links: [[STORE.instagramHandle, STORE.instagram]],
  },
];
export default function Footer() {
  return (
    <footer className="on-teal bg-paper">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:grid-cols-12 md:px-8 md:py-20">
        <div className="md:col-span-5">
          <Logo on="dark" className="h-28 w-auto md:h-32" fallbackClassName="text-2xl" />
          <p className="mt-5 font-display text-[1.6rem] italic leading-snug [font-variation-settings:'SOFT'_100,'WONK'_1]">
            Gather, enjoy, embrace.
            <br />
            Tifa feels like home.
          </p>
          <p className="mt-3 text-ink-dim">Walnut Creek, California</p>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title} className="md:col-span-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">{c.title}</h2>
            <ul className="mt-3 space-y-2">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className="text-ink-dim transition-colors hover:text-ink"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-[1440px] border-t border-line px-5 py-6 text-sm text-ink-faint md:px-8">
        © {new Date().getFullYear()} Tifa, Inc. Walnut Creek is owned and operated by the Balupari family. Made with love on Locust St.
      </div>
    </footer>
  );
}
