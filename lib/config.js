// Store facts mirrored from the current site. Edit here, not in components.
export const STORE = {
  name: 'Tifa Chocolate & Gelato',
  city: 'Walnut Creek',
  address: '1545 Locust St',
  cityLine: 'Walnut Creek, CA 94596',
  landmark: 'Next to the Lesher Center for the Arts. Free parking in the Lesher garage next door.',
  phone: '(925) 298-3500',
  phoneHref: 'tel:+19252983500',
  mapsHref: 'https://maps.google.com/?q=1545%20Locust%20St%20Walnut%20Creek%20CA%2094596',
  instagram: 'https://www.instagram.com/tifawalnutcreekca/',
  instagramHandle: '@tifawalnutcreekca',
  storePage: 'https://tifachocolateandgelato.com/location-detail/walnut-creek-ca/',
  catering: 'https://tifachocolateandgelato.com/catering/',
  giftCards: 'https://tifachocolateandgelato.securetree.com',
  merch: 'https://tifa-shop.fourthwall.com',
  menu: 'https://tifachocolateandgelato.com/gelato/',
  rating: '4.8',
  flavorCount: 27,
  timeZone: 'America/Los_Angeles',
  lat: 37.9101,
  lon: -122.0652,
};

// 0 = Sunday. Hours in 24h store-local time.
export const HOURS = [
  { day: 'Sunday', open: 11, close: 22 },
  { day: 'Monday', open: 11, close: 22 },
  { day: 'Tuesday', open: 11, close: 22 },
  { day: 'Wednesday', open: 11, close: 22 },
  { day: 'Thursday', open: 11, close: 22 },
  { day: 'Friday', open: 11, close: 23 },
  { day: 'Saturday', open: 11, close: 23 },
];

/**
 * LaMa easter-egg perk. ⚠️ Confirm the wording/offer with the owner before launch —
 * staff must recognise whatever this screen promises.
 */
export const LAMA_PERK = {
  title: 'You found the LaMa.',
  body: 'Laasya + Maanya = LaMa. Show this screen at the counter on Locust St for a little surprise from the Balupari family.',
  footnote: 'One per visit. While supplies last.',
};

export function storeNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE.timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hour = Number(get('hour')) % 24;
  return { dayIndex: days.indexOf(get('weekday')), hour, minute: Number(get('minute')) };
}

export function openStatus(date = new Date()) {
  const { dayIndex, hour, minute } = storeNow(date);
  const today = HOURS[dayIndex];
  const h = hour + minute / 60;
  const fmt = (x) => `${((x + 11) % 12) + 1} ${x >= 12 ? 'PM' : 'AM'}`;
  if (h >= today.open && h < today.close) return { open: true, label: `Open until ${fmt(today.close)}` };
  if (h < today.open) return { open: false, label: `Opens at ${fmt(today.open)}` };
  const tomorrow = HOURS[(dayIndex + 1) % 7];
  return { open: false, label: `Opens tomorrow at ${fmt(tomorrow.open)}` };
}
