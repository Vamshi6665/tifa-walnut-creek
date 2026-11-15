/**
 * Real photos from Tifa Walnut Creek (public/photos) and the cutouts made from them
 * (public/photos/cutouts, transparent WebP). Every image on the site comes from here.
 *
 * To swap a photo: replace the file with one of the same name, or add a new entry
 * and use it in a component. Width/height are the file's real pixel size so the
 * layout never jumps while a photo loads.
 */

const p = (file, w, h, alt) => ({ src: `/photos/${file}`, w, h, alt });
const c = (file, w, h, alt) => ({ src: `/photos/cutouts/${file}`, w, h, alt });

export const PHOTOS = {
  pomegranateCup: p('pomegranate-cup.jpg', 2000, 1706, 'Pomegranate Balsamic Chip gelato in a pink Tifa cup on the counter'),
  pinkGuavaCup: p('pink-guava-cup.jpg', 2000, 1575, 'Pink Guava Pineapple Sorbetto in a pink Tifa cup'),
  pumpkinCup: p('pumpkin-cup.jpg', 2000, 1600, 'Pumpkin Almond Swirl gelato in a pink Tifa cup'),
  chocolateCup: p('chocolate-cup.jpg', 1500, 2000, 'Two scoops of chocolate gelato in a peach Tifa cup'),
  celebrationCup: p('celebration-cup.jpg', 1500, 2000, 'Gelato with red, white and blue sprinkles in a teal Tifa cup, with flowers and a flag behind'),
  gelatoCase: p('gelato-case-pov.jpg', 1600, 2000, 'A two-flavor cup held up in front of the gelato case'),
  caramelPan: p('caramel-swirl-pan.jpg', 1600, 2000, 'A pan of gelato with a thick caramel swirl in the case'),
  truffles: p('truffle-box.jpg', 1500, 2000, 'A box of colorful Tifa chocolate truffles'),
  icedLattes: p('iced-lattes-counter.jpg', 1500, 2000, 'Four iced lattes with Tifa stickers lined up on the counter'),
  latteTrio: p('latte-trio.jpg', 1500, 2000, 'Three iced lattes with Tifa stickers on the counter'),
  latteCookie: p('latte-and-cookie.jpg', 1500, 2000, 'A latte with heart latte art and a chocolate cookie by the window'),
  hotChocolate: p('hot-chocolate.jpg', 1500, 2000, 'Hot chocolate with whipped cream and a wafer'),
  mochaWindow: p('mocha-by-the-window.jpg', 1500, 2000, 'An iced mocha with cookie crumbles on a table by the front window'),
  icedTea: p('iced-tea.jpg', 1500, 2000, 'An iced tea with a Tifa sticker on the counter'),
};

export const CUTOUTS = {
  pomegranate: c('pomegranate-balsamic-chip.webp', 1521, 2000, 'Pomegranate Balsamic Chip gelato'),
  pinkGuava: c('pink-guava-pineapple-sorbetto.webp', 1428, 1954, 'Pink Guava Pineapple Sorbetto'),
  pumpkin: c('pumpkin-almond-swirl.webp', 1559, 2000, 'Pumpkin Almond Swirl gelato'),
  chocolate: c('chocolate-cup.webp', 1407, 2000, 'Chocolate gelato'),
  celebration: c('celebration-cup.webp', 1951, 2000, 'Gelato with sprinkles in a teal cup'),
  icedTea: c('iced-tea.webp', 1226, 2000, 'Iced tea'),
  mocha: c('mocha-freeze.webp', 1312, 1814, 'Iced mocha'),
};

const TRUFFLE_SIZES = { 'truffle-orange': [461, 463], 'truffle-pink': [467, 460], 'truffle-purple': [476, 462], 'truffle-red': [450, 452], 'truffle-sprinkle': [467, 514] };
export const TRUFFLES = Object.entries(TRUFFLE_SIZES).map(([id, [w, h]]) => c(`${id}.webp`, w, h, ''));

/** Seasonal flavors photographed in the case (names exactly as the store labeled them). */
export const SEASONAL = [
  { name: 'Pomegranate Balsamic Chip', cutout: CUTOUTS.pomegranate, tint: '#F6CFC8', note: null },
  { name: 'Pink Guava Pineapple Sorbetto', cutout: CUTOUTS.pinkGuava, tint: '#FBE0D2', note: null },
  { name: 'Pumpkin Almond Swirl', cutout: CUTOUTS.pumpkin, tint: '#F6E3C2', note: null },
];

export const BRAND = {
  roundel: '/brand/logo.png', // teal sticker with white art
  white: '/brand/logo-white.png', // white art only, for teal or photo backgrounds
  teal: '/brand/logo-teal.png', // teal art only, for cream backgrounds
};
