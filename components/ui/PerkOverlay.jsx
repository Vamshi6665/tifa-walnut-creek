'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { LAMA_PERK } from '@/lib/config';
import { FLAVOR_BY_ID } from '@/lib/flavors';
import { Swatch } from './Hero';

// ⚠️ Sample month → flavor mapping; replace with the store's real birthday list.
const BIRTHDAY = [
  'dark-chocolate', 'raspberry', 'matcha', 'strawberry', 'mango', 'lemon',
  'passion-fruit', 'pistachio', 'chai', 'salted-caramel', 'cinnamon', 'mint-chip',
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PerkOverlay() {
  const open = useStore((s) => s.perkOpen);
  const close = useStore((s) => s.closePerk);
  const [month, setMonth] = useState(null);
  const closeBtn = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    window.__lenis?.stop();
    closeBtn.current?.focus();
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      window.__lenis?.start();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const flavor = month != null ? FLAVOR_BY_ID[BIRTHDAY[month]] : null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center bg-obsidian/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="perk-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, scale: 0.92, rotateX: 18, opacity: 0 }}
            animate={{ y: 0, scale: 1, rotateX: 0, opacity: 1 }}
            exit={{ y: 20, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="holo relative w-full max-w-md overflow-hidden rounded-lg p-7"
            style={{ transformPerspective: 900 }}
          >
            <button
              ref={closeBtn}
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-[3px] border border-line text-chrome hover:border-chrome"
            >
              <X size={18} />
            </button>
            <h2 id="perk-title" className="t-h3 pr-12 text-vanilla">
              {LAMA_PERK.title}
            </h2>
            <p className="mt-2 text-chrome-dim">{LAMA_PERK.body}</p>

            <div className="mt-6 rounded-md border border-line p-4">
              <p className="text-sm font-medium text-chrome">Birthday this month? Pick it to see your birthday flavor.</p>
              <div className="mt-3 grid grid-cols-6 gap-1.5" role="group" aria-label="Birthday month">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={month === i}
                    onClick={() => setMonth(i)}
                    className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                      month === i ? 'bg-mint text-obsidian' : 'bg-white/5 text-chrome-dim hover:text-chrome'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {flavor ? (
                <p className="mt-4 flex items-center gap-3 text-chrome" aria-live="polite">
                  <Swatch flavorId={flavor.id} size={28} />
                  <span>
                    Your birthday flavor is <strong className="text-vanilla">{flavor.name}</strong>. Mention it at the counter.
                  </span>
                </p>
              ) : null}
            </div>
            <p className="mt-4 text-xs text-chrome-faint">{LAMA_PERK.footnote}</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
