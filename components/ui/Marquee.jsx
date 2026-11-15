import Image from 'next/image';
import { BRAND } from '@/content/photos';

const WORDS = ['Gelato', 'Sorbetto', 'Artisan truffles', 'Groundwork coffee', 'Made in house in small batches', 'Walnut Creek'];

/**
 * A tilted Tifa-teal band with white type, the sticker's own colors.
 * Pure CSS motion (pauses for reduced motion via the global rule).
 */
export default function Marquee() {
  const row = (hidden) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {WORDS.map((w) => (
        <li key={w} className="flex items-center">
          <span className="whitespace-nowrap px-6 font-display text-[clamp(1.35rem,2.4vw,2.1rem)] font-[380] italic tracking-[-0.01em] [font-variation-settings:'SOFT'_100,'WONK'_1] md:px-9">
            {w}
          </span>
          <Image src={BRAND.white} alt="" width={1024} height={1024} sizes="40px" className="h-8 w-8 opacity-90 md:h-10 md:w-10" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="relative z-20 -my-6 overflow-hidden py-6">
      <div className="on-teal -mx-4 -rotate-[2.2deg] bg-paper py-4 shadow-[0_18px_40px_-20px_rgb(27_79_75/0.55)] md:py-5">
        <div className="marquee-track flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  );
}
