# Adding Tifa photos and the logo

Everything visual on the site comes from real files in `public/`. Drop a file in
the right place with the right name, commit it (the GitHub web editor's
"Add file → Upload files" works), and Vercel rebuilds the site with it. Empty
slots show a labelled placeholder on preview links and stay quiet in production.

## Logo — `public/brand/`
| File | Used for |
|---|---|
| `logo.png` or `logo.svg` | the official Tifa logo, transparent background |
| `logo-white.png` or `.svg` | white version for the green parts of the site (intro drop on Tifa green, nav over the photo, footer). If missing, the color logo is shown on a small white tile there |

The site's green is sampled from `logo.png` when the site builds, so buttons, links and accents match the real logo exactly. Until a logo file is added, the store name is shown as plain text; nothing is drawn in its place.

## Store photos — `public/photos/`
Landscape, at least 2000 px wide, originals rather than screenshots.

| File name | Where it shows |
|---|---|
| `hero.jpg` | full-screen photo behind the opening (the gelato case or counter works best) |
| `gelato-case.jpg` | big photo 1 in the "inside the shop" gallery |
| `truffle-case.jpg` | gallery photo 2 |
| `chocolates.jpg` | gallery photo 3 |
| `interior.jpg` | gallery photo 4 and Our Story |
| `storefront.jpg` | Visit section |
| `llama-wall.jpg` | Our Story, "Find the LaMa" |
| `kitchen-window.jpg` | Our Story, "Made where you can see it" |
| `drinks.jpg` | Our Story, Groundwork coffee |
| `team.jpg` | Our Story (only with everyone's OK) |
| `catering.jpg` | Catering section |

Any extra photos in `public/photos/gallery/` are added to the end of the gallery.

## Gelato cutouts — `public/photos/cutouts/`
These are the cups/scoops that drop in and pop on the opening screen, and the
photo that pops out of the quiz when it finds your match.

- PNG with a **transparent background**. On an iPhone: open the photo, press and
  hold the gelato, "Copy" or "Share" the lifted subject, save it as PNG. Or use
  remove.bg.
- Name each file after the flavor id so the site can label it, e.g.
  `salted-caramel.png`, `strawberry-rose-sorbetto.png` (ids are listed in
  `lib/flavors.js`; they're the flavor name in lowercase with dashes).
- Up to 3 appear on the opening screen.
- `llama.png` is special: it becomes the hidden LaMa peeking from the bottom
  of the opening screen.

## One photo per flavor (optional) — `public/photos/flavors/`
`<flavor-id>.jpg`, e.g. `honey-lavender.jpg`. Shown in Taste Twins and used by
the quiz when there's no cutout for that flavor.

## Please don't upload
Photos where children's faces are recognizable, or customers who haven't agreed
to be on the website.
