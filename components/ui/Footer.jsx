import { STORE } from '@/lib/config';
import { LOGO_WHITE } from '@/content/media';

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
      [STORE.address, STORE.mapsHref],
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
    <footer className="border-t border-line bg-obsidian">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-16 md:grid-cols-12 md:px-8">
        <div className="md:col-span-5">
          {LOGO_WHITE ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_WHITE} alt="Tifa Chocolate & Gelato" className="h-14 w-auto" />
          ) : (
            <p className="font-display text-5xl font-light tracking-[-0.04em] [font-stretch:125%]">
              tifa<span className="text-rose">.</span>
            </p>
          )}
          <p className="mt-4 max-w-[30ch] text-chrome-dim">Gather, enjoy, embrace. Tifa feels like home.</p>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title} className="md:col-span-2">
            <h2 className="text-sm font-medium text-chrome-faint">{c.title}</h2>
            <ul className="mt-3 space-y-2">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className="text-chrome-dim transition-colors hover:text-vanilla"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-[1440px] border-t border-line px-4 py-6 text-sm text-chrome-faint md:px-8">
        © {new Date().getFullYear()} Tifa, Inc. Walnut Creek is owned and operated by the Balupari family. Made with love on Locust St.
      </div>
    </footer>
  );
}
