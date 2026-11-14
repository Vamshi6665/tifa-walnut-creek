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
  pomegranateCup: p('pomegranate-cup.jpg', 1280, 1092, 'Pomegranate Balsamic Chip gelato in a pink Tifa cup on the counter'),
  pinkGuavaCup: p('pink-guava-cup.jpg', 1280, 1008, 'Pink Guava Pineapple Sorbetto in a pink Tifa cup'),
  pumpkinCup: p('pumpkin-cup.jpg', 1280, 1024, 'Pumpkin Almond Swirl gelato in a pink Tifa cup'),
  chocolateCup: p('chocolate-cup.jpg', 768, 1024, 'Two scoops of chocolate gelato in a peach Tifa cup'),
  celebrationCup: p('celebration-cup.jpg', 768, 1024, 'Gelato with red, white and blue sprinkles in a teal Tifa cup, with flowers and a flag behind'),
  gelatoCase: p('gelato-case-pov.jpg', 1215, 1087, 'A two-flavor cup held up in front of the gelato case'),
  caramelPan: p('caramel-swirl-pan.jpg', 768, 1024, 'A pan of gelato with a thick caramel swirl in the case'),
  truffles: p('truffle-box.jpg', 768, 1024, 'A box of hand-decorated Tifa chocolate truffles'),
  icedLattes: p('iced-lattes-counter.jpg', 768, 1024, 'Four iced lattes with Tifa stickers lined up on the counter'),
  latteTrio: p('latte-trio.jpg', 768, 1024, 'Three iced lattes with Tifa stickers on the counter'),
  latteCookie: p('latte-and-cookie.jpg', 1086, 1448, 'A latte with heart latte art and a chocolate cookie by the window'),
  hotChocolate: p('hot-chocolate.jpg', 768, 1024, 'Hot chocolate with whipped cream and a wafer'),
  mochaWindow: p('mocha-by-the-window.jpg', 768, 1024, 'An iced mocha with cookie crumbles on a table by the front window'),
  icedTea: p('iced-tea.jpg', 768, 1024, 'An iced tea with a Tifa sticker on the counter'),
};

export const CUTOUTS = {
  pomegranate: c('pomegranate-balsamic-chip.webp', 656, 735, 'Pomegranate Balsamic Chip gelato'),
  pinkGuava: c('pink-guava-pineapple-sorbetto.webp', 541, 737, 'Pink Guava Pineapple Sorbetto'),
  pumpkin: c('pumpkin-almond-swirl.webp', 650, 703, 'Pumpkin Almond Swirl gelato'),
  chocolate: c('chocolate-cup.webp', 585, 812, 'Chocolate gelato'),
  celebration: c('celebration-cup.webp', 441, 465, 'Gelato with sprinkles in a teal cup'),
  icedTea: c('iced-tea.webp', 353, 668, 'Iced tea'),
  mocha: c('mocha-freeze.webp', 316, 439, 'Iced mocha'),
};

export const TRUFFLES = ['truffle-orange', 'truffle-pink', 'truffle-purple', 'truffle-red', 'truffle-sprinkle'].map((id) =>
  c(`${id}.webp`, 280, 280, ''),
);

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
