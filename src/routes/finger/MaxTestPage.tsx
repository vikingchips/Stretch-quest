import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GRADE_DISCLAIMER, MAX_TEST } from '../../finger/constants';
import { estimateGrade, formatGradeRange, gradeBlocker } from '../../finger/grades';
import {
  applyTestResult,
  bestOf,
  endAttempt,
  feedAttempt,
  initAttempt,
  initMaxTest,
  skipToNextHand,
  type MaxTestState,
} from '../../finger/maxTest';
import { onForceSample } from '../../finger/sourceManager';
import { useSource } from '../../finger/useSource';
import { useFingerStore } from '../../store/fingerStore';
import { todayKey } from '../../game/dates';
import { DevicePicker } from '../../components/DevicePicker';
import { Icon } from '../../components/Icon';

const BLOCKER_MESSAGE: Record<string, string> = {
  edge: 'No grade estimate: those only come from the 20 mm step. Train on anything; there is no data to grade a smaller edge against.',
  grip: 'No grade estimate: those only come from half crimp.',
  bodyweight: 'No grade estimate without a bodyweight — set one on the device page.',
  'below-table': 'No grade estimate: this sits below the bottom of the reference data, and guessing past it would be making things up.',
};

export function MaxTestPage() {
  const navigate = useNavigate();
  const finger = useFingerStore();
  const source = useSource();
  const [test, setTest] = useState<MaxTestState>(() => initMaxTest('half-crimp'));
  const [live, setLive] = useState(0);
  const testRef = useRef(test);
  testRef.current = test;

  // Feed the attempt from the raw stream, but only re-render at a readable
  // rate — the numbers move faster than anyone can read them anyway.
  useEffect(() => {
    if (test.phase !== 'pulling') return;
    const off = onForceSample((sample) => {
      const next = feedAttempt(testRef.current.attempt, sample);
      testRef.current = { ...testRef.current, attempt: next };
    });
    const id = setInterval(() => {
      setTest(testRef.current);
      setLive(testRef.current.attempt.smoothedKg);
      if (testRef.current.attempt.done) setTest(endAttempt(testRef.current));
    }, 100);
    return () => {
      off();
      clearInterval(id);
    };
  }, [test.phase]);

  // Rest countdown between attempts.
  useEffect(() => {
    if (test.phase !== 'resting') return;
    const id = setInterval(() => {
      setTest((current) => {
        if (current.phase !== 'resting') return current;
        const restRemainingMs = current.restRemainingMs - 1000;
        return restRemainingMs <= 0
          ? { ...current, phase: 'ready', restRemainingMs: 0 }
          : { ...current, restRemainingMs };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [test.phase]);

  function save() {
    const { tests, maxes } = applyTestResult({
      state: test,
      edgeMm: finger.activeEdgeMm ?? 0,
      bodyweightKg: finger.bodyweightKg ?? 0,
      testedAt: new Date().toISOString(),
      dateKey: todayKey(),
      existing: finger.maxes,
    });
    finger.recordTest(tests, maxes);
    navigate('/finger');
  }

  const attemptNumber = test.attempts[test.hand].length + 1;

  if (test.phase === 'warmup') {
    return (
      <Shell title="max test" onBack={() => navigate('/finger')}>
        <h2 className="text-lg lowercase">warm up first</h2>
        <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
          Easy hangs, building load, about five minutes. A cold max test measures how cold you
          are, and it is the number every training band gets built from.
        </p>
        <ul className="measure mt-6 space-y-2 text-sm leading-relaxed text-ink-soft">
          <li>· {MAX_TEST.pullSecLo}–{MAX_TEST.pullSecHi} seconds per pull, building smoothly</li>
          <li>· up to {MAX_TEST.attempts} attempts per hand</li>
          <li>· {MAX_TEST.restSec / 60} minutes between attempts</li>
          <li>· each hand measured on its own</li>
        </ul>
        {/* The board comes first: a max test with nothing attached measures
            nothing, so the list is here rather than on another page. */}
        {source.status !== 'connected' ? (
          <div className="mt-10">
            <h3 className="mb-3 text-sm lowercase text-ink-soft">pick a board</h3>
            <DevicePicker />
          </div>
        ) : (
          <button
            onClick={() => setTest({ ...test, phase: 'ready' })}
            className="mt-10 w-full bg-pine-deep py-3 text-sm lowercase tracking-wide text-paper hover:brightness-110"
          >
            warmed up — start
          </button>
        )}
      </Shell>
    );
  }

  if (test.phase === 'done') {
    const bodyweight = finger.bodyweightKg ?? 0;
    const edge = finger.activeEdgeMm ?? 0;
    return (
      <Shell title="max test" onBack={() => navigate('/finger')}>
        <h2 className="text-lg lowercase">results</h2>
        <dl className="mt-6 grid grid-cols-2 gap-6 border-y border-line-soft py-6">
          {(['left', 'right'] as const).map((hand) => (
            <div key={hand}>
              <dd className="display text-3xl leading-none tabular-nums">
                {test.attempts[hand].length > 0 ? bestOf(test.attempts[hand]).toFixed(1) : '—'}
                {test.attempts[hand].length > 0 && (
                  <span className="ml-1 text-base text-ink-soft">kg</span>
                )}
              </dd>
              <dt className="mt-2 text-[11px] lowercase text-ink-soft">
                {hand}
                {test.attempts[hand].length > 0 &&
                  ` · ${test.attempts[hand].map((a) => a.toFixed(1)).join(', ')}`}
              </dt>
            </div>
          ))}
        </dl>

        {(['left', 'right'] as const).map((hand) => {
          if (test.attempts[hand].length === 0) return null;
          const peak = bestOf(test.attempts[hand]);
          const estimate = estimateGrade(peak, bodyweight, edge, 'half-crimp');
          const blocker = gradeBlocker(peak, bodyweight, edge, 'half-crimp');
          return (
            <section key={hand} className="mt-8">
              <h3 className="text-sm lowercase text-ink-soft">{hand} hand</h3>
              {estimate ? (
                <>
                  {/* The range only. A single font grade printed beside it
                      reads as the answer, which is the precision this whole
                      screen is built to avoid claiming. */}
                  <p className="display mt-2 text-2xl lowercase">{formatGradeRange(estimate)}</p>
                  <p className="mt-1 text-xs lowercase tabular-nums text-ink-soft">
                    {estimate.pctBw.toFixed(0)}% of bodyweight · {estimate.confidence} confidence
                  </p>
                </>
              ) : (
                <p className="measure mt-2 text-xs leading-relaxed text-ink-soft">
                  {BLOCKER_MESSAGE[blocker ?? 'edge']}
                </p>
              )}
            </section>
          );
        })}

        <p className="measure mt-8 border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-soft">
          {GRADE_DISCLAIMER} Hands are kept separate — there is no validated way to convert one
          into the other, or into a two-hand number.
        </p>

        <button
          onClick={save}
          className="mt-10 w-full bg-pine-deep py-3 text-sm lowercase tracking-wide text-paper hover:brightness-110"
        >
          save and recalculate bands
        </button>
      </Shell>
    );
  }

  if (test.phase === 'resting') {
    return (
      <Shell title="max test" onBack={() => navigate('/finger')}>
        <div className="flex flex-col items-center py-16 text-center">
          <span className="text-xs lowercase tracking-[0.18em] text-fjord-deep">rest</span>
          <div className="display mt-6 text-6xl tabular-nums leading-none">
            {Math.ceil(test.restRemainingMs / 1000)}
          </div>
          <p className="mt-6 text-sm lowercase text-ink-soft">
            next · {test.hand} · attempt {attemptNumber}
          </p>
          <button
            onClick={() => setTest({ ...test, phase: 'ready', restRemainingMs: 0 })}
            className="mt-10 border border-line px-8 py-3 text-sm lowercase text-ink-soft hover:text-ink"
          >
            skip the rest
          </button>
        </div>
      </Shell>
    );
  }

  const pulling = test.phase === 'pulling';
  return (
    <Shell title="max test" onBack={() => navigate('/finger')}>
      <div className="flex flex-col items-center py-10 text-center">
        <span className="text-xs lowercase tracking-[0.18em] text-pine-deep">
          {test.hand} · half crimp · attempt {attemptNumber} of {MAX_TEST.attempts}
        </span>

        <div className="display mt-10 text-7xl tabular-nums leading-none">
          {(pulling ? live : 0).toFixed(1)}
        </div>
        <span className="mt-2 text-sm lowercase text-ink-soft">kg</span>

        {pulling && (
          <p className="mt-6 text-sm lowercase tabular-nums text-ink-soft">
            peak {test.attempt.peakKg.toFixed(1)} kg
          </p>
        )}

        <p className="measure mt-8 text-sm leading-relaxed text-ink-soft">
          {pulling
            ? `Build smoothly and hold for ${MAX_TEST.pullSecLo}–${MAX_TEST.pullSecHi} seconds. Let go and this ends itself.`
            : 'Set up on the edge, then start when your hand is in position.'}
        </p>

        <div className="mt-12 flex w-full flex-col gap-3">
          {pulling ? (
            <button
              onClick={() => setTest(endAttempt(testRef.current))}
              className="bg-pine-deep py-3 text-sm lowercase tracking-wide text-paper hover:brightness-110"
            >
              done — record {test.attempt.peakKg.toFixed(1)} kg
            </button>
          ) : (
            <button
              onClick={() => setTest({ ...test, phase: 'pulling', attempt: initAttempt() })}
              className="bg-pine-deep py-3 text-sm lowercase tracking-wide text-paper hover:brightness-110"
            >
              start attempt
            </button>
          )}
          <button
            onClick={() => setTest(skipToNextHand(test))}
            className="border border-line-soft py-3 text-sm lowercase text-ink-soft hover:text-ink"
          >
            {test.hand === 'left' ? 'move to the right hand' : 'finish'}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="px-6 pb-28 pt-8">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-1 text-sm lowercase text-ink-soft hover:text-ink"
      >
        <Icon name="chevronLeft" size={16} />
        back
      </button>
      <h1 className="mb-10 text-2xl lowercase tracking-wide">{title}</h1>
      {children}
    </main>
  );
}
