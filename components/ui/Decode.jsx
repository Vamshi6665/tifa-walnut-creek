'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';

const GLYPHS = '0123456789ABCDEF°:./-';

/**
 * Telemetry text that "decodes" left to right once, when the intro fires
 * `decodeAt` in the store. Screen readers always get the real text.
 */
export default function Decode({ text, delay = 0, duration = 0.65 }) {
  const decodeAt = useStore((s) => s.decodeAt);
  const [shown, setShown] = useState(null);
  const latest = useRef(text);
  latest.current = text;

  useEffect(() => {
    if (!decodeAt) return undefined;
    let raf = 0;
    const start = performance.now() + delay * 1000;
    const step = (now) => {
      const full = String(latest.current);
      const t = (now - start) / (duration * 1000);
      if (t >= 1) {
        setShown(null);
        return;
      }
      const reveal = Math.floor(Math.max(0, t) * full.length);
      let out = '';
      for (let i = 0; i < full.length; i++) {
        out += i < reveal || full[i] === ' ' || full[i] === ',' ? full[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setShown(out);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [decodeAt, delay, duration]);

  if (shown == null) return <span>{text}</span>;
  return (
    <span>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
