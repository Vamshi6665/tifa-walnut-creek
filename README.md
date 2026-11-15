# Tifa Chocolate & Gelato — Walnut Creek

The website for Tifa Chocolate & Gelato at 1545 Locust St, Walnut Creek, styled like the shop itself: warm white walls, the sage wainscot that runs around the store, the teal of the Tifa sticker with white on top, and real photos of the gelato, truffles and drinks.

**What a visitor sees**
- **Arrival:** the Tifa sticker drops onto Tifa teal while the page loads, the screen slides away, and three real cups fall onto the ledge of the wainscot and land with a little squash. Pendant lamps hang over the counter; truffles drift in the air.
- **Scrolling off the opening screen:** the cups lift off the ledge on curved paths (one floats up, one sinks down) while a teal "Gelato · Sorbetto · Artisan truffles…" band slides past.
- **From our kitchen to your cup:** a Tifa cup rides down a dotted curve (the sticker's dotted ring, stretched into a path) as you scroll, pausing at four real photos: the morning batch, the case, the scoop, the seat by the window.
- **Seasonal flavors:** the cups photographed in the case rise out of colored circles as they scroll into view.
- **Taste Twins:** every menu flavor mapped by taste on a dark-chocolate panel; pick one to see its four closest matches.
- **Find my flavor:** four questions charge a particle collider on dark chocolate; the match comes with a shareable passport.
- **Inside Tifa:** real photos in three columns that slide past each other (outer columns rise, the middle one comes down).
- **Chocolate & coffee:** truffles orbit the truffle box; the iced tea and mocha drift past photos of the lattes and hot chocolate.
- **Reviews, Our story, Catering, live quiz numbers, Visit:** ending on the wainscot again with a row of cups on the ledge, then a teal footer with the white logo.

## Photos and the logo
See **[docs/PHOTOS.md](docs/PHOTOS.md)**. Every image is listed in `content/photos.js`; cutouts (transparent WebP) live in `public/photos/cutouts/`. The logo files in `public/brand/` were traced from the logo printed on the cups; drop the official files in with the same names to replace them, and the site's teal re-tunes to the new `logo.png` on the next build.

## Theme
Tokens live in `app/globals.css`: `paper` (warm white), `paper-2` (cream), `ink`, `green`/`green-ink` (the Tifa teal; text-safe on cream), `sage` (wainscot), cup accents `pink`/`peach`/`sky`, and `cocoa`. Scope classes flip a block: `on-teal` (teal with white, like the sticker), `on-cocoa` (dark chocolate panels). Headlines are Fraunces, everything else Archivo. Canvas and chart colors are in `lib/theme.js`.

## Menu
`lib/flavors.js` holds the store's menu exactly as on the original site (names, families, tags, allergen flags). Taste profiles for Taste Twins and the quiz are derived from the store's own tags. To change the menu, edit `STORE_MENU` there and run `npm run check`.

Allergen flags keep the original site's meaning: `dairyFree` true = dairy-free; `gluten`, `nuts`, `eggs` true = **contains**; `noSugar` true = no sugar added.

## Quick start
```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run check        # menu / quiz / taste-map sanity checks
```

URL flags for demos and screenshots:

| Flag | Effect |
|---|---|
| `?intro=0` / `?intro=1` | Skip the intro / force the full intro (default: full once per tab session, short after) |
| `?quality=high\|mid\|low\|none` | Force a render tier (default: auto, adapts live) |

## Environment variables (Vercel → Settings → Environment Variables)

| Variable | What it turns on | Without it |
|---|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | live quiz analytics (already set on this project) | dashboard shows labelled sample data |
| `ANTHROPIC_API_KEY` | short AI pairing notes (always checked; flavor choice never depends on AI) | notes come from the menu tags |
| `GOOGLE_PLACES_API_KEY` (+ optional `GOOGLE_PLACE_ID`) | live Google rating and reviews | rating from `lib/config.js` and a "Read every review on Google" link; no review text is shown |
| `CATERING_EMAIL_TO`, `RESEND_API_KEY` (+ optional `CATERING_EMAIL_FROM`) | catering form that emails Naina | call / Instagram / visit buttons instead of a form |

**Google reviews key:** Google Cloud console → new project → enable **Places API (New)** → Credentials → Create API key → restrict it to Places API (New) → paste into `GOOGLE_PLACES_API_KEY`. Reviews are shown as Google returns them (up to 5), with author names and links; nothing is filtered or edited.

**Catering email:** create a free account at resend.com → API Keys → create → paste into `RESEND_API_KEY`; set `CATERING_EMAIL_TO` to Naina's address. Inquiries arrive with the customer's email as reply-to. Until a sending domain is verified in Resend, mail comes from Resend's test sender, which can only deliver to the email address that owns the Resend account, so create the account with the address in `CATERING_EMAIL_TO`.

## Deploying
`vercel.json` pins the framework to Next.js. Every push to a branch gets a preview URL; production changes only when a branch is merged into `main`. The GitHub web editor → Vercel auto-deploy workflow works unchanged.

## Architecture
```
app/
  layout.jsx                fonts, metadata, JSON-LD, pre-paint intro flag
  api/reviews/route.js      live Google rating + reviews (Places API, New)
  api/catering/route.js     catering inquiries → email to Naina (Resend) + KV backup
  api/track, api/insights   quiz analytics (KV)
  api/ai-note               guarded one-sentence notes
content/
  photos.js                 every photo and cutout, with sizes and alt text
  media.js                  logo lookup + brand teal (media.generated.json, built by scripts/scan-media.mjs)
  reviews.js                optional hand-picked real reviews (used only without the Google key)
components/
  ui/Hero.jsx               wall + wainscot, cups drop in, intro timeline, scroll curves
  ui/Marquee.jsx            tilted teal band
  ui/Journey.jsx            pinned scroll: a cup rides a dotted curve past four photos
  ui/SeasonalCase.jsx       seasonal cups rising out of colored circles
  ui/Showcase.jsx           three photo columns moving in opposite directions
  ui/Treats.jsx             chocolate (orbiting truffles) and coffee
  ui/Reviews.jsx, ui/Story.jsx, ui/Catering.jsx, ui/Visit.jsx, ui/Footer.jsx
  canvas/ParticleCollider   quiz collider
  canvas/FlavorConstellation  Taste Twins map
  canvas/HoloTerrain        dashboard map
lib/  flavors (menu) · matcher (quiz) · config (store facts) · store · weather · audio · …
```

## Performance and accessibility
- Photos and cutouts go through Next's image optimizer (AVIF/WebP, sized per screen).
- Canvases load lazily, pause off screen, adapt quality to the device, and are wrapped so a failed scene never breaks the page.
- Reduced-motion users get no intro, no scroll-driven motion, and the kitchen-to-cup story as a plain list of photos.
- Any key, click, scroll or touch skips the intro.

## Before launch
- [ ] Swap in the official logo files if Naina has them (the current ones are traced from the cup print).
- [ ] Add a storefront photo and one of the team, if wanted (docs/PHOTOS.md).
- [ ] Confirm opening hours (`lib/config.js` says 11 AM; one online listing says 10 AM).
- [ ] Set `GOOGLE_PLACES_API_KEY` for live reviews.
- [ ] Set `CATERING_EMAIL_TO` + `RESEND_API_KEY` so catering reaches Naina.
- [ ] Confirm the LaMa perk wording with Naina (`LAMA_PERK` in `lib/config.js`).
