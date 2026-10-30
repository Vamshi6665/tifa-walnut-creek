# Tifa Chocolate & Gelato — Walnut Creek

The website for Tifa Chocolate & Gelato at 1545 Locust St, Walnut Creek: real store photography and the real menu, with cinematic motion on top.

**What a visitor sees**
- **Arrival:** the Tifa logo drops in and lands while the page loads, then the whole screen slides down to reveal the store. Real gelato cutouts drop in, bounce and pop (tap them to pop again), the headline stretches into place, and live store facts (address, weather, local time, open now) decode in the corner.
- **Leaving the opening screen:** the photo melts away in dark drips into the next section.
- **Inside the shop:** big real photos glide sideways as you scroll.
- **Taste Twins:** all 27 menu flavors mapped by taste; pick one to see its four closest matches (with its photo once added).
- **Find my flavor:** four questions charge a particle collider; the match pops out as a real photo, with sound and a shareable passport.
- **Reviews:** live Google rating and reviews, credited to their authors.
- **Catering:** an inquiry form that emails Naina directly (or call / Instagram until email is set up).
- Live Walnut Creek weather tints the opening photo and adds rain on the glass when it's raining.

## Adding photos and the logo
See **[docs/PHOTOS.md](docs/PHOTOS.md)**. In short: drop files into `public/brand/` and `public/photos/` with the listed names, commit, and Vercel rebuilds. Empty slots show labelled placeholders on preview links and nothing in production.

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
| `?introAt=1.2` | Freeze the intro at that second |
| `?weather=day\|night\|rain` | Force the weather look (default: live) |
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
  media.js                  photo/logo lookup (+ media.generated.json, built by scripts/scan-media.mjs)
  reviews.js                optional hand-picked real reviews (used only without the Google key)
components/
  canvas/HeroStage.jsx      opening photo, gelato cutout drops, LaMa, rain, grain, melt
  canvas/shaders/           rain on glass, melt transition, noise
  canvas/ParticleCollider   quiz collider; the match pops out as a real photo
  canvas/FlavorConstellation  Taste Twins map
  canvas/HoloTerrain        dashboard map
  ui/Hero.jsx               opening screen + intro timeline
  ui/Showcase.jsx           pinned horizontal photo gallery
  ui/Reviews.jsx, ui/Catering.jsx, ui/Story.jsx, ui/Visit.jsx, …
lib/  flavors (menu) · matcher (quiz) · config (store facts) · store · weather · audio · …
```

## Performance and accessibility
- Photos go through Next's image optimizer (AVIF/WebP, sized per screen), including the WebGL textures.
- Canvases load lazily, pause off screen, adapt quality to the device, and are wrapped so a failed scene never breaks the page.
- Reduced-motion users get no intro, no melt and a plain swipeable gallery.
- Any key, click, scroll or touch skips the intro.

## Before launch
- [ ] Add the logo and photos (docs/PHOTOS.md).
- [ ] Confirm opening hours (`lib/config.js` says 11 AM; one online listing says 10 AM).
- [ ] Set `GOOGLE_PLACES_API_KEY` for live reviews.
- [ ] Set `CATERING_EMAIL_TO` + `RESEND_API_KEY` so catering reaches Naina.
- [ ] Confirm the LaMa perk wording with Naina (`LAMA_PERK` in `lib/config.js`).
