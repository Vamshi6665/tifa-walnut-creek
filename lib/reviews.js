'use client';

import { useEffect, useState } from 'react';

let pending = null;

/**
 * Live Google rating + reviews from /api/reviews (one request per page load,
 * shared by every component that asks). Returns null until loaded, and
 * { configured: false } when no Google key is set.
 */
export function useReviews() {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!pending) {
      pending = fetch('/api/reviews')
        .then((r) => (r.ok ? r.json() : { configured: false }))
        .catch(() => ({ configured: false }));
    }
    let alive = true;
    pending.then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}
