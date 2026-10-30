import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';

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
  themeColor: '#0A0A0C',
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
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {/* SVG displacement filters for scroll-velocity + hover text warps */}
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
          <filter id="tf-warp" x="-5%" y="-25%" width="110%" height="150%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.004 0.09" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap id="tf-warp-map" in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="tf-hover" x="-5%" y="-25%" width="110%" height="150%" colorInterpolationFilters="sRGB">
            <feTurbulence id="tf-hover-noise" type="turbulence" baseFrequency="0.012 0.03" numOctaves="1" seed="2" result="noise" />
            <feDisplacementMap id="tf-hover-map" in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="B" />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}
