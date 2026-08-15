import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GAMES } from '../../../finger/games';
import {
  bestKey,
  type GameCue,
  type GameId,
  type GameSpec,
} from '../../../finger/games/types';
import { ForceFollower, makeRng } from '../../../finger/games/control';
import {
  initCalibration,
  stepCalibration,
  type CalibrationState,
} from '../../../finger/games/calibrate';
import { fitPixelCanvas, paletteFromTokens } from '../../../finger/games/pixel';
import { mockSource, onForceSample } from '../../../finger/sourceManager';
import { useSource } from '../../../finger/useSource';
import type { Hand } from '../../../finger/types';
import { useFingerStore } from '../../../store/fingerStore';
import { useProgressStore } from '../../../store/progressStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { MIN_ACTIVE_SEC } from '../../../game/xp';
import { todayKey } from '../../../game/dates';
import {
  initAudio,
  playComplete,
  playCountdownTick,
  playSegmentStart,
  playSideSwitch,
} from '../../../session/audio';
import { ScreenWakeLock } from '../../../session/wakeLock';
import { DevicePicker } from '../../../components/DevicePicker';
import { Icon } from '../../../components/Icon';

const CUE_SOUND: Record<GameCue, () => void> = {
  start: playSegmentStart,
  tick: playCountdownTick,
  good: playSideSwitch,
  over: () => {},
};

/** The simulated board's pull, controllable wherever the game needs force. */
function MockPull() {
  const source = useSource();
  const [level, setLevel] = useState(0);
  if (source.kind !== 'mock' || source.status !== 'connected') return null;
  return (
    <div className="mt-6 w-full max-w-sm">
      <label className="text-xs lowercase text-ink-soft" htmlFor="sim-pull">
        simulated pull · {level} kg
      </label>
      <input
        id="sim-pull"
        type="range"
        min={0}
        max={80}
        value={level}
        onChange={(e) => {
          const kg = Number(e.target.value);
          setLevel(kg);
          mockSource().setLevel(kg);
        }}
        className="mt-2 w-full accent-pine-deep"
      />
    </div>
  );
}

export function GamePlayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const spec = gameId ? GAMES[gameId as GameId] : undefined;

  if (!spec) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <p className="text-ink-soft">Game not found.</p>
      </main>
    );
  }
  return <GameVisit key={spec.meta.id} spec={spec} />;
}

/**
 * One visit to one game: pick a hand, calibrate it, play runs, leave.
 *
 * The calibration pull defines 100% for that hand for the whole visit, and is
 * kept per hand so switching sides asks for one pull each. Leaving with a
 * minute or more of accumulated tension records an ordinary session — games
 * pay a little xp and hold the streak, but they never tick the daily plan.
 */
function GameVisit({ spec }: { spec: GameSpec }) {
  const navigate = useNavigate();
  const source = useSource();
  const completeSession = useProgressStore((s) => s.completeSession);

  const [stage, setStage] = useState<'hand' | 'calibrate' | 'play'>('hand');
  const [hand, setHand] = useState<Hand>('left');
  const [calib, setCalib] = useState<Partial<Record<Hand, number>>>({});
  const [runKey, setRunKey] = useState(0);

  const followerRef = useRef<ForceFollower>(null as unknown as ForceFollower);
  followerRef.current ??= new ForceFollower();
  const startedAtRef = useRef(new Date().toISOString());
  const totalActiveSecRef = useRef(0);
  const runsRef = useRef(0);

  useEffect(() => {
    const lock = new ScreenWakeLock();
    void lock.request();
    const off = onForceSample((sample) => followerRef.current.push(sample));
    return () => {
      off();
      lock.release();
    };
  }, []);

  function finish() {
    const activeSec = Math.round(totalActiveSecRef.current);
    if (runsRef.current > 0 && activeSec >= MIN_ACTIVE_SEC) {
      const summary = completeSession({
        routine: {
          id: `finger-game-${spec.meta.id}`,
          name: spec.meta.name,
          description: spec.meta.tagline,
          category: 'fingers',
          effort: 'primer',
          steps: [],
          isCustom: false,
        },
        startedAt: startedAtRef.current,
        activeSec,
        stepsCompleted: runsRef.current,
        stepsTotal: runsRef.current,
      });
      navigate('/complete', { replace: true, state: summary });
    } else {
      navigate('/finger/games');
    }
  }

  function pickHand(next: Hand) {
    initAudio();
    setHand(next);
    setStage(calib[next] ? 'play' : 'calibrate');
  }

  if (source.status !== 'connected') {
    return (
      <main className="flex min-h-dvh flex-col px-6 pb-10 pt-6">
        <button
          onClick={() => navigate('/finger/games')}
          className="mb-10 flex items-center gap-1 self-start text-sm lowercase text-ink-soft hover:text-ink"
        >
          <Icon name="chevronLeft" size={16} />
          back
        </button>
        <div className="flex flex-1 flex-col items-center justify-center">
          <h1 className="text-xl lowercase">{spec.meta.name}</h1>
          <p className="measure mt-2 text-center text-sm leading-relaxed text-ink-soft">
            {spec.meta.tagline}. Pick a board to play on.
          </p>
          <div className="mt-10 flex justify-center">
            <DevicePicker />
          </div>
        </div>
      </main>
    );
  }

  if (stage === 'hand') {
    return (
      <main className="flex min-h-dvh flex-col px-6 pb-10 pt-6">
        <button
          onClick={finish}
          className="mb-10 self-start text-ink-soft hover:text-ink"
          aria-label="Leave"
        >
          <Icon name="close" size={18} />
        </button>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="text-2xl lowercase">{spec.meta.name}</h1>
          <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">{spec.meta.tagline}</p>
          <p className="mt-12 text-sm lowercase text-ink-soft">which hand?</p>
          <div className="mt-4 flex w-full max-w-sm gap-3">
            {(['left', 'right'] as const).map((h) => (
              <button
                key={h}
                onClick={() => pickHand(h)}
                className="flex-1 border border-line py-6 text-lg lowercase text-ink hover:bg-surface"
              >
                {h}
                {calib[h] && (
                  <span className="mt-1 block text-xs tabular-nums text-ink-soft">
                    100% = {calib[h]!.toFixed(1)} kg
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="measure mt-10 text-xs leading-relaxed text-ink-soft">
            Warm your fingers up before playing. The first pull sets the scale for everything —
            cold fingers set a scale you will regret mid-run.
          </p>
        </div>
      </main>
    );
  }

  if (stage === 'calibrate') {
    return (
      <CalibrateStage
        spec={spec}
        hand={hand}
        follower={followerRef.current}
        onClose={finish}
        onDone={(kg) => {
          setCalib((c) => ({ ...c, [hand]: kg }));
          setStage('play');
        }}
      />
    );
  }

  return (
    <PlayStage
      key={`${hand}-${runKey}`}
      spec={spec}
      hand={hand}
      calibKg={calib[hand]!}
      follower={followerRef.current}
      onAgain={() => setRunKey((k) => k + 1)}
      onSwitchHand={() => pickHand(hand === 'left' ? 'right' : 'left')}
      onRecalibrate={() => {
        setCalib((c) => ({ ...c, [hand]: undefined }));
        setStage('calibrate');
      }}
      onRunDone={(activeSec) => {
        totalActiveSecRef.current += activeSec;
        runsRef.current += 1;
      }}
      onExit={finish}
    />
  );
}

function CalibrateStage({
  spec,
  hand,
  follower,
  onDone,
  onClose,
}: {
  spec: GameSpec;
  hand: Hand;
  follower: ForceFollower;
  onDone: (kg: number) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const kgRef = useRef<HTMLSpanElement>(null);
  const [status, setStatus] = useState<'waiting' | 'rejected' | 'done'>('waiting');
  const [lockedKg, setLockedKg] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = fitPixelCanvas(canvas, spec.width, spec.height);
    const palette = paletteFromTokens();
    let machine: CalibrationState = initCalibration();
    let last = performance.now();
    const start = last;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let raf = requestAnimationFrame(function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const kg = follower.kg;
      const prev = machine;
      machine = stepCalibration(machine, dt, kg);
      if (kgRef.current) kgRef.current.textContent = kg.toFixed(1);
      spec.drawCalibration(ctx, palette, now - start, kg, machine.peakKg, machine.phase === 'done');
      if (machine.rejected && !prev.rejected) setStatus('rejected');
      if (machine.phase === 'done' && prev.phase !== 'done') {
        const peak = machine.peakKg;
        setStatus('done');
        setLockedKg(peak);
        if (useSettingsStore.getState().soundEnabled) playSegmentStart();
        timer = setTimeout(() => onDone(peak), 900);
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pb-10 pt-6">
      <button
        onClick={onClose}
        className="mb-6 self-start text-ink-soft hover:text-ink"
        aria-label="Leave"
      >
        <Icon name="close" size={18} />
      </button>
      <h1 className="text-xl lowercase">pull as hard as you can</h1>
      <p className="mt-1 text-sm lowercase text-ink-soft">{hand} hand · then let go</p>

      <div className="mt-8 flex w-full justify-center">
        <canvas ref={canvasRef} aria-label="calibration" className="border border-line-soft" />
      </div>

      <div className="mt-8 flex items-baseline gap-2">
        <span ref={kgRef} className="display text-5xl tabular-nums leading-none">
          0.0
        </span>
        <span className="text-sm lowercase text-ink-soft">kg</span>
      </div>

      <p className="measure mt-6 text-center text-sm leading-relaxed text-ink-soft">
        {status === 'done' && lockedKg !== null
          ? `locked · ${lockedKg.toFixed(1)} kg is 100%`
          : status === 'rejected'
            ? 'that was a touch, not a pull. again — properly.'
            : 'one hard pull. the peak becomes 100% for this hand today.'}
      </p>

      <MockPull />
    </main>
  );
}

function PlayStage({
  spec,
  hand,
  calibKg,
  follower,
  onAgain,
  onSwitchHand,
  onRecalibrate,
  onRunDone,
  onExit,
}: {
  spec: GameSpec;
  hand: Hand;
  calibKg: number;
  follower: ForceFollower;
  onAgain: () => void;
  onSwitchHand: () => void;
  onRecalibrate: () => void;
  onRunDone: (activeSec: number) => void;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const pullRef = useRef<HTMLSpanElement>(null);
  const [over, setOver] = useState<{ score: number; newBest: boolean; prevBest: number | null } | null>(
    null,
  );

  const format = spec.formatScore ?? String;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = fitPixelCanvas(canvas, spec.width, spec.height);
    const palette = paletteFromTokens();
    const rng = makeRng((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) | 0);
    let state = spec.init(rng);
    let ended = false;
    let last = performance.now();
    const start = last;

    const endRun = (finalState: unknown) => {
      const score = spec.score(finalState);
      const activeSec = spec.activeSec(finalState);
      onRunDone(activeSec);
      const store = useFingerStore.getState();
      const prevBest = store.gameBests[bestKey(spec.meta.id, hand)] ?? null;
      const newBest = prevBest !== null && score > prevBest.score;
      if (score > 0) {
        store.recordGameRun({
          id: crypto.randomUUID(),
          gameId: spec.meta.id,
          hand,
          score,
          calibKg,
          at: new Date().toISOString(),
          dateKey: todayKey(),
          activeSec: Math.round(activeSec),
          curve: spec.curve?.(finalState),
        });
        if (newBest && useSettingsStore.getState().soundEnabled) playComplete();
      }
      setOver({ score, newBest, prevBest: prevBest?.score ?? null });
    };

    let raf = requestAnimationFrame(function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const force = calibKg > 0 ? Math.max(0, follower.kg / calibKg) : 0;
      const prev = state;
      state = spec.step(state, dt, force, rng);
      if (prev !== state && useSettingsStore.getState().soundEnabled) {
        const cue = spec.cue?.(prev, state);
        if (cue) CUE_SOUND[cue]();
      }
      if (scoreRef.current) scoreRef.current.textContent = format(spec.score(state));
      if (pullRef.current) pullRef.current.textContent = `${Math.round(force * 100)}%`;
      spec.draw(ctx, state, palette, now - start);
      // The loop keeps running after the run ends so the scene stays alive
      // behind the overlay — the sim is terminal, so stepping it is free.
      if (!ended && spec.phase(state) === 'over') {
        ended = true;
        endRun(state);
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pb-10 pt-6">
      <div className="mb-6 flex w-full items-center gap-4">
        <button onClick={onExit} className="text-ink-soft hover:text-ink" aria-label="Leave">
          <Icon name="close" size={18} />
        </button>
        <span className="flex-1 text-sm lowercase text-ink-soft">
          {spec.meta.name} · {hand}
        </span>
        <span ref={scoreRef} className="text-sm tabular-nums">
          0
        </span>
      </div>

      <div className="relative">
        <canvas ref={canvasRef} aria-label={spec.meta.name} className="border border-line-soft" />
        {over && (
          <div className="animate-reveal absolute inset-0 z-10 flex items-center justify-center bg-paper/85 backdrop-blur-sm">
            <div className="w-full max-w-xs px-6 text-center">
              <p className="text-xs lowercase tracking-[0.18em] text-ink-soft">{spec.scoreLabel}</p>
              <p className="display mt-2 text-5xl tabular-nums leading-none">{format(over.score)}</p>
              {over.newBest ? (
                <p className="mt-3 text-sm lowercase text-pine-deep">new best</p>
              ) : (
                over.prevBest !== null && (
                  <p className="mt-3 text-sm lowercase text-ink-soft">
                    best {format(over.prevBest)}
                  </p>
                )
              )}
              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={onAgain}
                  className="bg-pine-deep py-3 text-sm lowercase tracking-wide text-paper hover:brightness-110"
                >
                  again
                </button>
                <button
                  onClick={onSwitchHand}
                  className="border border-line py-3 text-sm lowercase text-ink-soft hover:bg-surface hover:text-ink"
                >
                  other hand
                </button>
                <button
                  onClick={onExit}
                  className="border border-line py-3 text-sm lowercase text-ink-soft hover:bg-surface hover:text-ink"
                >
                  done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="measure mt-6 text-center text-xs leading-relaxed text-ink-soft">{spec.hint}</p>

      <div className="mt-4 flex items-center gap-3 text-xs lowercase tabular-nums text-ink-soft">
        <span>
          pull <span ref={pullRef}>0%</span>
        </span>
        <span>·</span>
        <span>100% = {calibKg.toFixed(1)} kg</span>
        <span>·</span>
        <button onClick={onRecalibrate} className="lowercase underline-offset-2 hover:text-ink">
          recalibrate
        </button>
      </div>

      <MockPull />
    </main>
  );
}
