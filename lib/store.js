'use client';

import { create } from 'zustand';
import { HERO_FLAVORS } from './flavors';

let scoopSeq = 0;
const makeScoop = (flavorId) => ({ id: `s${++scoopSeq}`, flavorId });

export const MAX_SCOOPS = 5;

export const useStore = create((set, get) => ({
  // ---- rendering quality -------------------------------------------------
  tier: 'mid',
  setTier: (tier) => set({ tier }),
  dpr: 1.5,
  setDpr: (dpr) => set({ dpr }),

  // ---- weather / environment --------------------------------------------
  weather: null, // { tempF, code, isDay, label }
  weatherMode: 'night', // 'day' | 'night' | 'rain' (live)
  weatherOverride: null, // manual preview from the weather chip
  setWeather: (weather, mode) => set({ weather, weatherMode: mode }),
  cycleWeather: () => {
    const order = ['day', 'night', 'rain'];
    const cur = get().weatherOverride ?? get().weatherMode;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    set({ weatherOverride: next === get().weatherMode ? null : next });
  },
  mode: () => get().weatherOverride ?? get().weatherMode,

  // ---- hero customizer ---------------------------------------------------
  scoops: [makeScoop(HERO_FLAVORS[0]), makeScoop(HERO_FLAVORS[1]), makeScoop(HERO_FLAVORS[2])],
  selectedScoop: null,
  restackNonce: 0,
  // false while the intro holds the scoops above the frame; true lets them fall in
  scoopsDropped: true,
  setScoopsDropped: (scoopsDropped) => set({ scoopsDropped }),
  introDone: true,
  setIntroDone: (introDone) => set({ introDone }),
  decodeAt: 0,
  triggerDecode: () => set({ decodeAt: Date.now() }),
  selectScoop: (id) => set({ selectedScoop: id }),
  setScoopFlavor: (flavorId) =>
    set((s) => {
      const target = s.selectedScoop ?? s.scoops[s.scoops.length - 1]?.id;
      return { scoops: s.scoops.map((x) => (x.id === target ? { ...x, flavorId } : x)) };
    }),
  addScoop: (flavorId) =>
    set((s) => {
      if (s.scoops.length >= MAX_SCOOPS) return {};
      const scoop = makeScoop(flavorId);
      return { scoops: [...s.scoops, scoop], selectedScoop: scoop.id };
    }),
  restack: () => set((s) => ({ restackNonce: s.restackNonce + 1 })),

  // ---- LaMa easter egg -----------------------------------------------------
  perkOpen: false,
  llamaFound: false,
  openPerk: () => set({ perkOpen: true, llamaFound: true }),
  closePerk: () => set({ perkOpen: false }),

  // ---- quiz ----------------------------------------------------------------
  quizStep: 0,
  quizAnswers: { dietary: [], sweetness: null, mood: null, intensity: null },
  quizPhase: 'idle', // idle | charging | exploding | revealed
  quizResult: null,
  setQuizAnswer: (key, value) => set((s) => ({ quizAnswers: { ...s.quizAnswers, [key]: value } })),
  setQuizStep: (quizStep) => set({ quizStep }),
  setQuizPhase: (quizPhase) => set({ quizPhase }),
  setQuizResult: (quizResult) => set({ quizResult }),
  resetQuiz: () =>
    set({
      quizStep: 0,
      quizAnswers: { dietary: [], sweetness: null, mood: null, intensity: null },
      quizPhase: 'idle',
      quizResult: null,
    }),

  // ---- taste twins -----------------------------------------------------------
  twinFocus: 'pistachio',
  twinHover: null,
  moodHighlight: [],
  setTwinFocus: (twinFocus) => set({ twinFocus, moodHighlight: [] }),
  setTwinHover: (twinHover) => set({ twinHover }),
  setMoodHighlight: (moodHighlight) => set({ moodHighlight }),

  // ---- telemetry -------------------------------------------------------------
  quizPings: 0, // bumps whenever a new quiz event is observed → globe beacon pulse
  ping: () => set((s) => ({ quizPings: s.quizPings + 1 })),

  // ---- audio -----------------------------------------------------------------
  sound: true,
  toggleSound: () => set((s) => ({ sound: !s.sound })),
}));

/** Effective lighting mode (manual preview wins over live weather). */
export const useMode = () => useStore((s) => s.weatherOverride ?? s.weatherMode);
