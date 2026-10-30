import Image from 'next/image';
import { MEDIA, SLOTS, photo } from '@/content/media';

/**
 * A real photo from /public/photos, or (until one is added) a quiet placeholder.
 * Placeholder labels show in previews only, never on the production site.
 */
export default function Photo({ slot, src: srcProp, alt, className = '', sizes = '100vw', priority = false, position = '50% 50%', children }) {
  const src = srcProp ?? (slot ? photo(slot) : null);
  const meta = SLOTS[slot] ?? {};
  if (src) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={src} alt={alt ?? meta.alt ?? ''} fill sizes={sizes} priority={priority} className="object-cover" style={{ objectPosition: position }} />
        {children}
      </div>
    );
  }
  return (
    <div
      className={`relative overflow-hidden bg-obsidian-2 bg-[repeating-linear-gradient(135deg,rgb(226_232_240/0.035)_0_1px,transparent_1px_14px)] ${className}`}
      role="img"
      aria-label={alt ?? meta.alt ?? ''}
    >
      {MEDIA.showPlaceholders ? (
        <span className="t-tele absolute bottom-3 left-3 right-3 text-[0.7rem] leading-snug text-chrome-faint">
          Add photo: {meta.label ?? slot}
          <br />
          public/photos/{slot}.jpg
        </span>
      ) : null}
      {children}
    </div>
  );
}

export function hasPhoto(slot) {
  return Boolean(photo(slot));
}
