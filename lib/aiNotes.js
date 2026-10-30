'use client';

import { useEffect, useState } from 'react';
import { pairingReason } from './flavors';

const cache = new Map();

/**
 * Pairing notes for a flavor's twins. Shows the deterministic, profile-derived
 * note immediately; if the server has an Anthropic key it swaps in a short AI
 * note that has been validated server-side to mention only these two flavors.
 */
export function useTwinNotes(focusId, twinIds) {
  const key = `${focusId}:${twinIds.join(',')}`;
  const fallback = Object.fromEntries(twinIds.map((id) => [id, { text: pairingReason(focusId, id), source: 'profile' }]));
  const [notes, setNotes] = useState(cache.get(key) ?? fallback);

  useEffect(() => {
    if (cache.has(key)) {
      setNotes(cache.get(key));
      return undefined;
    }
    setNotes(fallback);
    const ctrl = new AbortController();
    fetch('/api/ai-note', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'twins', focus: focusId, twins: twinIds }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.notes) return;
        const merged = { ...fallback };
        for (const [id, text] of Object.entries(data.notes)) {
          if (merged[id] && text) merged[id] = { text, source: data.source };
        }
        cache.set(key, merged);
        setNotes(merged);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return notes;
}

export async function fetchMatchNote(flavorId, answers) {
  try {
    const r = await fetch('/api/ai-note', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'match', flavor: flavorId, answers }),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}
