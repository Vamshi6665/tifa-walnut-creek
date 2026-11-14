import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import './globals.css';
import { BRAND_COLORS } from '@/content/media';

// The teal sampled from public/brand/logo.png at build time drives the accent, so dropping in
// an official logo file re-tunes the site to it. Light scopes only; dark scopes keep their tints.
const brandCss = BRAND_COLORS
  ? `html:root,html .on-paper{--color-green:${BRAND_COLORS.green};--color-tifa:${BRAND_COLORS.green};--color-green-ink:${BRAND_COLORS.greenInk};--btn-bg:${BRAND_COLORS.green}}`
  : null;

export const metadata = {
  metadataBase: new URL('https://tifa-walnut-creek.vercel.app'),
  title: 'Tifa Chocolate & Gelato | Walnut Creek, CA',
  description:
    'Small-batch gelato made in-house every morning, artisan chocolate and Groundwork coffee at 1545 Locust St, downtown Walnut Creek. Build a scoop, find your flavor, meet its taste twins.',
  openGraph: {
    title: 'Tifa Chocolate & Gelato | Walnut Creek',
    description: '27 flavors made in-house daily on Locust Street. Find yours.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2C7F7A',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'IceCreamShop',
  name: 'Tifa Chocolate & Gelato',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '1545 Locust St',
    addressLocality: 'Walnut Creek',
    addressRegion: 'CA',
    postalCode: '94596',
    addressCountry: 'US',
  },
  telephone: '+1-925-298-3500',
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], opens: '11:00', closes: '22:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Friday', 'Saturday'], opens: '11:00', closes: '23:00' },
  ],
  servesCuisine: ['Gelato', 'Chocolate', 'Coffee'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Decide before first paint whether the intro plays, so nothing flashes. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!/[?&]intro=0/.test(location.search)){d.classList.add('tf-intro');if(sessionStorage.getItem('tf-intro-seen')&&!/[?&]intro=1/.test(location.search))d.classList.add('tf-intro-quick')}}catch(e){}`,
          }}
        />
        {brandCss ? <style dangerouslySetInnerHTML={{ __html: brandCss }} /> : null}
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  );
}
