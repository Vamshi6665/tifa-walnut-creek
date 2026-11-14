import { NextResponse } from 'next/server';

/**
 * Live Google rating + reviews for Tifa Walnut Creek (Places API, New).
 *
 * Env:
 *   GOOGLE_PLACES_API_KEY   required (Google Cloud → Places API (New) enabled)
 *   GOOGLE_PLACE_ID         optional; looked up by name + address if missing
 *
 * Reviews are shown exactly as Google returns them (up to 5, Google's order),
 * with author names, links and Google attribution. Nothing is filtered,
 * edited or invented. Responses are CDN-cached for an hour.
 */

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const QUERY = 'Tifa Chocolate & Gelato, 1545 Locust St, Walnut Creek, CA 94596';
let placeId = process.env.GOOGLE_PLACE_ID || null;

async function findPlaceId() {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'places.id,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery: QUERY }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = await res.json();
  const hit = (data.places || []).find((p) => /1545 Locust/i.test(p.formattedAddress || '')) || data.places?.[0];
  if (!hit) throw new Error('not found');
  return hit.id;
}

export async function GET() {
  if (!KEY) {
    return NextResponse.json({ configured: false }, { headers: { 'Cache-Control': 'public, s-maxage=600' } });
  }
  try {
    if (!placeId) placeId = await findPlaceId();
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=en`, {
      headers: {
        'X-Goog-Api-Key': KEY,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri',
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`details ${res.status}`);
    const p = await res.json();
    const body = {
      configured: true,
      rating: p.rating ?? null,
      count: p.userRatingCount ?? null,
      mapsUrl: p.googleMapsUri ?? null,
      reviews: (p.reviews || []).map((r) => ({
        author: r.authorAttribution?.displayName ?? 'Google user',
        authorUrl: r.authorAttribution?.uri ?? null,
        photo: r.authorAttribution?.photoUri ?? null,
        rating: r.rating ?? null,
        when: r.relativePublishTimeDescription ?? '',
        text: r.originalText?.text ?? r.text?.text ?? '',
        url: r.googleMapsUri ?? p.googleMapsUri ?? null,
      })),
    };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch {
    return NextResponse.json({ configured: true, error: 'unavailable' }, { status: 502 });
  }
}
