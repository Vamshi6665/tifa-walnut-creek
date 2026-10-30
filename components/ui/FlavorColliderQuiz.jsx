'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Download, Share2, Volume2, VolumeX, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { QUESTIONS, STREAM_COLORS, matchFlavor, eligible, describeAnswers } from '@/lib/matcher';
import { DIETARY, pairingReason, topTraits } from '@/lib/flavors';
import { playCollision, playStream } from '@/lib/audio';
import { fetchMatchNote } from '@/lib/aiNotes';
import { downloadPassport } from '@/lib/passport';
import { useInView, usePrefersReducedMotion } from './useInView';
import InertiaCard from './InertiaCard';
import { Swatch } from './Hero';

const ParticleCollider = dynamic(() => import('@/components/canvas/ParticleCollider'), { ssr: false });

const because = describeAnswers;

export default function FlavorColliderQuiz() {
  const stage = useRef(null);
  const { near, visible } = useInView(stage);
  const reduce = usePrefersReducedMotion();
  const tier = useStore((s) => s.tier);
  const step = useStore((s) => s.quizStep);
  const answers = useStore((s) => s.quizAnswers);
  const phase = useStore((s) => s.quizPhase);
  const result = useStore((s) => s.quizResult);
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const { setQuizAnswer, setQuizStep, setQuizPhase, setQuizResult, resetQuiz } = useStore.getState();
  const [note, setNote] = useState(null);
  const [shareMsg, setShareMsg] = useState('');

  const q = QUESTIONS[Math.min(step, QUESTIONS.length - 1)];
  const ready = step >= QUESTIONS.length;
  const poolSize = eligible(answers.dietary).length;

  const answer = (qId, value) => {
    setQuizAnswer(qId, value);
    playStream(step, sound);
    setQuizStep(step + 1);
  };

  const toggleDiet = (id) => {
    const cur = answers.dietary;
    setQuizAnswer('dietary', cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  const collide = async () => {
    const r = matchFlavor(answers);
    if (!r) return;
    setNote({ text: pairingReason(r.flavor.id, r.runnersUp[0]?.id ?? r.flavor.id), source: 'profile' });
    const wait = (ms) => new Promise((res) => setTimeout(res, reduce ? 0 : ms));
    setQuizPhase('charging');
    await wait(750);
    playCollision(sound);
    setQuizPhase('exploding');
    setQuizResult(r);
    await wait(650);
    setQuizPhase('revealed');

    // analytics (fire-and-forget) + optional AI blurb
    fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'quiz', flavorId: r.flavor.id, dietary: answers.dietary }),
      keepalive: true,
    })
      .then(() => useStore.getState().ping())
      .catch(() => {});
    const ai = await fetchMatchNote(r.flavor.id, answers);
    if (ai?.note) setNote({ text: ai.note, source: ai.source });
  };

  const share = async () => {
    const text = `My Tifa Walnut Creek flavor match is ${result.flavor.name} (${result.matchPct}%). Find yours:`;
    const url = `${window.location.origin}/#game`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Tifa flavor', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareMsg('Link copied');
      setTimeout(() => setShareMsg(''), 2500);
    } catch {
      /* user cancelled */
    }
  };

  const restart = () => {
    resetQuiz();
    setNote(null);
  };

  return (
    <section id="game" className="relative scroll-mt-16 bg-obsidian" aria-labelledby="game-title">
      <div ref={stage} className="relative min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0">
          {near && tier !== 'none' ? <ParticleCollider active={visible} /> : null}
        </div>

        <div className="pointer-events-none relative z-10 mx-auto flex min-h-[100svh] max-w-[1440px] flex-col px-4 py-20 md:px-8 md:py-24">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 id="game-title" className="t-h2 max-w-[12ch]" data-warp>
                Four questions, one flavor.
              </h2>
              <p className="t-body mt-4 max-w-[40ch] text-chrome-dim">
                Every answer fires a stream into the collider. When all four are in, smash them together and see what comes out.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={sound}
              aria-label={sound ? 'Mute collider sounds' : 'Turn collider sounds on'}
              className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-[3px] border border-line text-chrome hover:border-chrome"
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>

          <div className="mt-auto pt-10">
            <AnimatePresence mode="wait">
              {phase === 'revealed' && result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="pointer-events-auto grid gap-4 md:grid-cols-12"
                >
                  <InertiaCard className="holo rounded-lg p-6 md:col-span-7 md:p-8 lg:col-span-6 xl:col-span-5">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-display text-xl font-normal [font-stretch:125%]">
                        tifa<span className="text-rose">.</span> <span className="text-base font-medium text-chrome-dim">flavor passport</span>
                      </p>
                      <p className="t-tele text-sm text-mint">{result.matchPct}% match</p>
                    </div>
                    <div className="mt-7">
                      <Swatch flavorId={result.flavor.id} size={44} />
                      <h3
                        className="mt-4 hyphens-auto break-words font-display text-[clamp(1.9rem,3.4vw,2.9rem)] font-light [font-stretch:125%] leading-[0.95] tracking-tight text-vanilla"
                        aria-live="polite"
                      >
                        {result.flavor.name}
                      </h3>
                    </div>
                    <p className="mt-5 text-chrome-dim">
                      You asked for {because(answers)}.{' '}
                      {answers.dietary.length
                        ? `Matched from the ${result.poolSize} flavors that are ${answers.dietary
                            .map((d) => DIETARY.find((x) => x.id === d)?.label.toLowerCase())
                            .join(' and ')}.`
                        : `Matched from all ${result.poolSize} flavors.`}
                    </p>
                    {note ? <p className="mt-3 text-chrome">{note.text}</p> : null}
                    <div className="mt-6 flex flex-wrap gap-2">
                      {topTraits(result.flavor.id, 3).map((t) => (
                        <span key={t} className="rounded-[3px] border border-line px-3 py-1 text-sm text-chrome-dim">
                          {t}
                        </span>
                      ))}
                    </div>
                    {result.runnersUp.length ? (
                      <p className="mt-6 border-t border-line pt-4 text-sm text-chrome-dim">
                        Close seconds: {result.runnersUp.map((f) => f.name).join(' and ')}
                      </p>
                    ) : null}
                  </InertiaCard>
                  <div className="flex flex-wrap content-end gap-3 md:col-span-5 md:justify-end lg:col-span-6 xl:col-span-7">
                    <button
                      type="button"
                      className="btn btn-primary"
                      data-magnetic
                      onClick={() => downloadPassport({ flavor: result.flavor, matchPct: result.matchPct, because: `For: ${because(answers)}` })}
                    >
                      <Download size={17} aria-hidden="true" /> Save passport
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={share} data-magnetic>
                      <Share2 size={17} aria-hidden="true" /> {shareMsg || 'Share'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={restart} data-magnetic>
                      Try again
                    </button>
                  </div>
                </motion.div>
              ) : phase === 'idle' ? (
                <motion.div
                  key={ready ? 'ready' : q.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="holo pointer-events-auto max-w-xl rounded-lg p-6 md:p-8"
                >
                  <div className="flex items-center gap-3">
                    {step > 0 ? (
                      <button
                        type="button"
                        onClick={() => setQuizStep(step - 1)}
                        aria-label="Previous question"
                        className="grid h-9 w-9 place-items-center rounded-[3px] border border-line text-chrome hover:border-chrome"
                      >
                        <ArrowLeft size={16} />
                      </button>
                    ) : null}
                    <ol className="flex gap-1.5" aria-label={`Question ${Math.min(step + 1, 4)} of 4`}>
                      {QUESTIONS.map((qq, i) => (
                        <li
                          key={qq.id}
                          className="h-1.5 w-10 rounded-full transition-colors"
                          style={{ background: i < step ? STREAM_COLORS[i] : 'rgb(226 232 240 / 0.15)', boxShadow: i < step ? `0 0 12px ${STREAM_COLORS[i]}` : 'none' }}
                        />
                      ))}
                    </ol>
                    <span className="t-tele ml-auto text-sm text-chrome-dim">{ready ? '4 of 4' : `${step + 1} of 4`}</span>
                  </div>

                  {ready ? (
                    <>
                      <h3 className="t-h3 mt-6">All four streams are in.</h3>
                      <p className="mt-2 text-chrome-dim">
                        {poolSize} flavors fit your filters. Collide them to find the closest one to {because(answers)}.
                      </p>
                      <button type="button" className="btn btn-primary mt-6" onClick={collide} data-magnetic disabled={!poolSize}>
                        <Zap size={17} aria-hidden="true" /> Collide
                      </button>
                    </>
                  ) : (
                    <fieldset className="mt-6">
                      <legend className="t-h3">{q.title}</legend>
                      {q.hint ? <p className="mt-2 text-sm text-chrome-dim">{q.hint}</p> : null}
                      <div className={`mt-5 grid gap-2 ${q.options.length === 4 ? 'sm:grid-cols-2' : ''}`}>
                        {q.options.map((o) => {
                          const on = q.multi ? answers.dietary.includes(o.id) : answers[q.id] === o.id;
                          return (
                            <button
                              key={o.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => (q.multi ? toggleDiet(o.id) : answer(q.id, o.id))}
                              className={`flex min-h-14 items-center rounded-md border px-5 text-left text-base font-medium transition-colors ${
                                on ? 'border-transparent text-obsidian' : 'border-line text-chrome hover:border-chrome hover:bg-white/[0.04]'
                              }`}
                              style={on ? { background: STREAM_COLORS[step] } : undefined}
                            >
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                      {q.multi ? (
                        <button type="button" className="btn btn-primary mt-5" onClick={() => answer('dietary', answers.dietary)} data-magnetic>
                          {answers.dietary.length ? 'Continue' : q.emptyLabel}
                        </button>
                      ) : null}
                    </fieldset>
                  )}
                </motion.div>
              ) : (
                <motion.p
                  key="colliding"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="t-tele text-center text-lg text-mint"
                  aria-live="assertive"
                >
                  Colliding…
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
