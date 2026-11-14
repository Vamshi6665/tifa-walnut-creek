# Photos and the logo

Every image on the site is real and listed in one place: **`content/photos.js`**.

## Store photos — `public/photos/`
JPGs, about 1600 px on the long side. To swap one, replace the file with a new one of the
**same name** (GitHub web editor → "Add file → Upload files" works) and, if its shape is
different, update its width/height in `content/photos.js` so the layout doesn't jump.

| File | Where it shows |
|---|---|
| `caramel-swirl-pan.jpg` | Kitchen-to-cup story, stop 1 · Inside Tifa |
| `gelato-case-pov.jpg` | Kitchen-to-cup story, stop 2 · Inside Tifa |
| `pomegranate-cup.jpg` | Kitchen-to-cup story, stop 3 |
| `latte-and-cookie.jpg` | Kitchen-to-cup story, stop 4 |
| `pink-guava-cup.jpg` | Our story · Inside Tifa |
| `celebration-cup.jpg` | Our story · Inside Tifa |
| `iced-lattes-counter.jpg` | Catering · Inside Tifa |
| `truffle-box.jpg` | Chocolate · Inside Tifa |
| `latte-trio.jpg`, `hot-chocolate.jpg` | Coffee · Inside Tifa |
| `mocha-by-the-window.jpg` | Visit · Inside Tifa |
| `chocolate-cup.jpg`, `pumpkin-cup.jpg`, `iced-tea.jpg` | Inside Tifa |

Photos with Instagram text labels were cropped below the label.

## Cutouts — `public/photos/cutouts/`
Transparent WebP, used for everything that moves: the cups dropping onto the ledge, the cup
riding the dotted curve, the seasonal cups, the drinks, the floating truffles and the row of
cups at the bottom.

To make a new one: on an iPhone, open the photo, press and hold the cup, "Copy" or "Share"
the lifted subject and save it; or use remove.bg. Export as WebP or PNG with a transparent
background, crop tight to the cup, then add it to `CUTOUTS` in `content/photos.js`.

Seasonal flavors in "Spotted in the case" are listed in `SEASONAL` in the same file; use the
flavor's name exactly as the store labels it.

## Logo — `public/brand/`
| File | Used for |
|---|---|
| `logo.png` | the teal sticker with white art (nav, hero sticker, story) |
| `logo-white.png` | white art only (intro screen, marquee, footer, teal cards) |
| `logo-teal.png` | teal art only, for cream backgrounds |

These were traced from the logo printed on the cups. If Naina has the official files, upload
them with the same names. The site's teal is sampled from `logo.png` on every build.

## Please don't upload
Photos where children's faces are recognizable, or customers who haven't agreed to be on the
website.
