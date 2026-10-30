import { LOGO, LOGO_WHITE } from '@/content/media';

/**
 * The store's own logo file from public/brand (logo.* and logo-white.*), never a
 * drawn stand-in. Until the file is added, the store's name is set as plain text.
 * `on="dark"` prefers the white version; if only the color logo exists it sits on a
 * small white tile so it stays legible on deep green or over the photo.
 */
export default function Logo({ on = 'light', className = 'h-8 w-auto', fallbackClassName = '', alt = 'Tifa Chocolate & Gelato' }) {
  /* eslint-disable @next/next/no-img-element */
  if (on === 'dark' && LOGO_WHITE) return <img src={LOGO_WHITE} alt={alt} className={className} />;
  if (on === 'dark' && LOGO)
    return (
      <span className="inline-flex rounded-[6px] bg-white px-2 py-1.5">
        <img src={LOGO} alt={alt} className={className} />
      </span>
    );
  if (LOGO) return <img src={LOGO} alt={alt} className={className} />;
  if (LOGO_WHITE) return <img src={LOGO_WHITE} alt={alt} className={className} />;
  /* eslint-enable @next/next/no-img-element */
  return <span className={`font-sans font-semibold tracking-[-0.01em] ${fallbackClassName}`}>Tifa Chocolate &amp; Gelato</span>;
}
