/**
 * Matcher / Taste Twins sanity harness. Run after editing lib/flavors.js:
 *   npm run check
 * Fails (exit 1) if any quiz result breaks a dietary filter or a layout is degenerate,
 * and prints how many flavors each answer combination can reach.
 */
import { QUESTIONS, matchFlavor } from '../lib/matcher.js';
import { FLAVORS, tasteTwins, twinEdges } from '../lib/flavors.js';
import { LAYOUT } from '../lib/layout.js';

const diets = [[], ['vegan'], ['dairyFree'], ['glutenFree'], ['nutFree'], ['glutenFree', 'nutFree'], ['vegan', 'glutenFree']];
const [, sweet, mood, size] = QUESTIONS;
let failures = 0;
const reach = {};
const noDiet = new Set();

for (const dietary of diets)
  for (const s of sweet.options)
    for (const m of mood.options)
      for (const i of size.options) {
        const answers = { dietary, sweetness: s.id, mood: m.id, intensity: i.id };
        const r = matchFlavor(answers);
        const pool = FLAVORS.filter((f) => dietary.every((d) => f.tags[d]));
        if (!pool.length) continue;
        if (!r || !dietary.every((d) => r.flavor.tags[d])) {
          failures++;
          console.error('DIETARY VIOLATION', answers, r?.flavor.id);
          continue;
        }
        reach[r.flavor.id] = (reach[r.flavor.id] || 0) + 1;
        if (!dietary.length) noDiet.add(r.flavor.id);
      }

const ids = new Set(FLAVORS.map((f) => f.id));
if (ids.size !== FLAVORS.length) failures++, console.error('Duplicate flavor ids');
FLAVORS.forEach((f) => {
  if (tasteTwins(f.id, 4).length < Math.min(4, FLAVORS.length - 1)) failures++, console.error('Too few twins for', f.id);
});
if (LAYOUT.flat().some((v) => !Number.isFinite(v))) failures++, console.error('Layout has NaN');

console.log(`Flavors: ${FLAVORS.length}, twin edges: ${twinEdges(4).length}`);
console.log(`Reachable without filters: ${noDiet.size}/${FLAVORS.length}; with any filter: ${Object.keys(reach).length}/${FLAVORS.length}`);
console.log('Never matched:', FLAVORS.filter((f) => !reach[f.id]).map((f) => f.name).join(', ') || 'none');
console.log(failures ? `\n${failures} problem(s)` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
