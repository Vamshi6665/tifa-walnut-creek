'use client';

import { Star } from 'lucide-react';
import { useReviews } from '@/lib/reviews';
import { FEATURED_REVIEWS } from '@/content/reviews';
import { MEDIA } from '@/content/media';
import { STORE } from '@/lib/config';
import InertiaCard from './InertiaCard';
import Cutout from './Cutout';
import { CUTOUTS } from '@/content/photos';

function Stars({ value, size = 14 }) {
  const full = Math.round(value ?? 0);
  return (
    <span className="flex gap-0.5 text-[#E9A23B]" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={size} aria-hidden="true" className={i < full ? 'fill-current' : 'opacity-25'} />
      ))}
    </span>
  );
}

function ReviewCard({ r }) {
  return (
    <InertiaCard
      as="figure"
      max={5}
      className="flex w-[19rem] shrink-0 snap-start flex-col rounded-[24px] border border-line bg-paper p-7 shadow-[0_24px_48px_-32px_rgb(31_43_42/0.35)] md:w-[23rem]"
    >
      <Stars value={r.rating} />
      <blockquote className="mt-4 line-clamp-[8] flex-1 font-display text-[1.08rem] font-[380] leading-relaxed text-ink">{r.text}</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4 text-sm">
        {r.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.photo} alt="" width={32} height={32} className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
        ) : null}
        <span className="min-w-0 flex-1">
          {r.authorUrl ? (
            <a href={r.authorUrl} target="_blank" rel="noreferrer" className="block truncate font-medium text-ink hover:underline">
              {r.author}
            </a>
          ) : (
            <span className="block truncate font-medium text-ink">{r.author}</span>
          )}
          <span className="text-ink-faint">
            {r.when ? `${r.when} on ` : 'on '}
            {r.url ? (
              <a href={r.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                {r.source ?? 'Google'}
              </a>
            ) : (
              (r.source ?? 'Google')
            )}
          </span>
        </span>
      </figcaption>
    </InertiaCard>
  );
}

export default function Reviews() {
  const data = useReviews();
  const live = data?.configured && Array.isArray(data.reviews) && data.reviews.length;
  const reviews = live ? data.reviews : FEATURED_REVIEWS;
  const rating = data?.rating ?? Number(STORE.rating);
  const count = data?.count ?? null;
  const mapsUrl = data?.mapsUrl ?? STORE.mapsHref;

  return (
    <section id="reviews" className="relative scroll-mt-16 bg-paper-2 py-24 md:py-32" aria-labelledby="reviews-title">
      <div className="mx-auto max-w-[1440px] px-5 md:px-8">
        <div className="grid gap-10 md:grid-cols-12 md:items-center">
          <div className="md:col-span-7">
            <p className="t-eyebrow">Reviews</p>
            <h2 id="reviews-title" className="t-h2 mt-4">
              What Walnut Creek <span className="t-accent">says.</span>
            </h2>
            <p className="t-body mt-5 text-ink-dim">Our neighbors rate us {rating.toFixed(1)} out of 5 on Google. Read what they say, then come taste for yourself.</p>
          </div>
          <div className="md:col-span-5">
            <div className="relative rounded-[28px] border border-line bg-paper p-7 shadow-[0_30px_60px_-40px_rgb(31_43_42/0.45)] md:p-8">
              <div className="flex items-end gap-4">
                <p className="font-display text-[clamp(3.75rem,6.5vw,5.5rem)] font-[350] leading-none tracking-[-0.03em] text-ink">
                  {rating.toFixed(1)}
                </p>
                <div className="pb-2">
                  <Stars value={rating} size={18} />
                  <p className="mt-1 text-sm text-ink-dim">
                    {count ? `from ${count.toLocaleString('en-US')} Google reviews` : 'on Google'}
                  </p>
                </div>
              </div>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn btn-ghost mt-6">
                Read every review on Google
              </a>
              <div className="pointer-events-none absolute -top-20 right-4 hidden rotate-[6deg] sm:block md:-top-24 md:right-6">
                <Cutout img={CUTOUTS.chocolate} h="clamp(120px, 11vw, 170px)" sizes="140px" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {reviews.length ? (
        <div
          className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:px-8 lg:px-[max(2rem,calc((100vw-1440px)/2+2rem))]"
          role="list"
          aria-label="Customer reviews"
          data-lenis-prevent-wheel
        >
          {reviews.map((r, i) => (
            <div role="listitem" key={`${r.author}-${i}`}>
              <ReviewCard r={r} />
            </div>
          ))}
        </div>
      ) : MEDIA.showPlaceholders ? (
        <p className="t-tele mx-auto mt-10 max-w-[1440px] px-4 text-[0.75rem] text-ink-faint md:px-8">
          Live Google reviews appear here once GOOGLE_PLACES_API_KEY is set in Vercel (see README).
        </p>
      ) : null}
    </section>
  );
}
