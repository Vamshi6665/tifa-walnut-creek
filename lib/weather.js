'use client';

import { useEffect } from 'react';
import { STORE } from './config';
import { useStore } from './store';

// Open-Meteo: free, keyless, CORS-enabled. WMO weather codes.
const URL = `https://api.open-meteo.com/v1/forecast?latitude=${STORE.lat}&longitude=${STORE.lon}&current=temperature_2m,weather_code,is_day,precipitation&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles`;

const RAIN = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

export function describe(code) {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'foggy';
  if (code >= 51 && code <= 57) return 'drizzly';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
  if (code >= 71 && code <= 77) return 'snowy';
  if (code >= 95) return 'stormy';
  return 'mild';
}

export function modeFor({ code, isDay, precipitation }) {
  if (RAIN.has(code) || precipitation > 0.1) return 'rain';
  return isDay ? 'day' : 'night';
}

/** Mount once (in the page shell). Refreshes every 15 minutes. */
export function useWalnutCreekWeather() {
  const setWeather = useStore((s) => s.setWeather);

  useEffect(() => {
    // ?weather=rain|night|day forces a mode for demos/screenshots.
    const forced = new URLSearchParams(window.location.search).get('weather');
    if (forced && ['day', 'night', 'rain'].includes(forced)) {
      useStore.setState({ weatherOverride: forced });
    }

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`weather ${res.status}`);
        const { current } = await res.json();
        const w = {
          tempF: Math.round(current.temperature_2m),
          code: current.weather_code,
          isDay: current.is_day === 1,
          precipitation: current.precipitation ?? 0,
        };
        w.label = describe(w.code);
        if (!cancelled) setWeather(w, modeFor(w));
      } catch {
        // Fall back to the store clock so lighting still matches day/night.
        const h = Number(
          new Intl.DateTimeFormat('en-US', { timeZone: STORE.timeZone, hour: 'numeric', hour12: false }).format(new Date()),
        ) % 24;
        if (!cancelled) setWeather(null, h >= 7 && h < 18 ? 'day' : 'night');
      }
    };
    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [setWeather]);
}
