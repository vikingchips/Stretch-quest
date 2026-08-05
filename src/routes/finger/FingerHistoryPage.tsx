import { useNavigate } from 'react-router-dom';
import { bestOf } from '../../finger/maxTest';
import { PROGRAMS } from '../../finger/programs';
import type { FingerTestRecord, Hand } from '../../finger/types';
import { useFingerStore } from '../../store/fingerStore';
import { Icon } from '../../components/Icon';

const HAND_COLOR: Record<Hand, string> = {
  left: 'var(--color-pine-deep)',
  right: 'var(--color-fjord-deep)',
};

const WIDTH = 320;
const HEIGHT = 130;
const PAD = 8;

interface Point {
  x: number;
  y: number;
}

/**
 * Best peak per test, per hand, over time.
 *
 * Hand-rolled rather than pulled from a chart library: two polylines and a
 * baseline is the whole requirement, and it keeps the hairline look the rest
 * of the app has.
 */
function ProgressionChart({ tests }: { tests: FingerTestRecord[] }) {
  const byHand: Record<Hand, Array<{ at: number; kg: number }>> = { left: [], right: [] };
  for (const test of tests) {
    byHand[test.hand].push({ at: new Date(test.testedAt).getTime(), kg: bestOf(test.attemptsKg) });
  }
  for (const hand of ['left', 'right'] as const) byHand[hand].sort((a, b) => a.at - b.at);

  const all = [...byHand.left, ...byHand.right];
  if (all.length < 2) return null;

  const minAt = Math.min(...all.map((p) => p.at));
  const maxAt = Math.max(...all.map((p) => p.at));
  const maxKg = Math.max(...all.map((p) => p.kg));
  const spanAt = Math.max(1, maxAt - minAt);

  const project = (p: { at: number; kg: number }): Point => ({
    x: PAD + ((p.at - minAt) / spanAt) * (WIDTH - PAD * 2),
    y: HEIGHT - PAD - (p.kg / (maxKg * 1.1)) * (HEIGHT - PAD * 2),
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        fill="none"
        aria-hidden="true"
      >
        <line
          x1={0}
          y1={HEIGHT - PAD}
          x2={WIDTH}
          y2={HEIGHT - PAD}
          stroke="var(--color-line)"
          strokeWidth={1}
        />
        {(['left', 'right'] as const).map((hand) => {
          const points = byHand[hand].map(project);
          if (points.length === 0) return null;
          return (
            <g key={hand}>
              {points.length > 1 && (
                <path
                  d={points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join('')}
                  stroke={HAND_COLOR[hand]}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                />
              )}
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={2.4} fill={HAND_COLOR[hand]} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-5 text-[11px] lowercase text-ink-soft">
        {(['left', 'right'] as const).map((hand) => (
          <span key={hand} className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: HAND_COLOR[hand] }}
              aria-hidden="true"
            />
            {hand}
          </span>
        ))}
        <span className="ml-auto tabular-nums">peak {maxKg.toFixed(1)} kg</span>
      </div>
    </div>
  );
}

export function FingerHistoryPage() {
  const navigate = useNavigate();
  const tests = useFingerStore((s) => s.tests);
  const sessions = useFingerStore((s) => s.sessions);

  const recent = [...sessions].reverse().slice(0, 40);
  const testsByDate = [...tests].reverse();

  return (
    <main className="px-6 pb-28 pt-8">
      <button
        onClick={() => navigate('/finger')}
        className="mb-8 flex items-center gap-1 text-sm lowercase text-ink-soft hover:text-ink"
      >
        <Icon name="chevronLeft" size={16} />
        back
      </button>
      <h1 className="mb-12 text-2xl lowercase tracking-wide">history</h1>

      <section className="mb-14">
        <h2 className="mb-4 text-sm lowercase text-ink-soft">max over time</h2>
        {tests.length >= 2 ? (
          <ProgressionChart tests={tests} />
        ) : (
          <p className="measure text-sm leading-relaxed text-ink-soft">
            Two tests draw a line. Retest every four to eight weeks and this fills in.
          </p>
        )}
      </section>

      {testsByDate.length > 0 && (
        <section className="mb-14">
          <h2 className="mb-1 text-sm lowercase text-ink-soft">tests</h2>
          <ul className="border-t border-line-soft">
            {testsByDate.map((test) => (
              <li
                key={test.id}
                className="flex items-center justify-between border-b border-line-soft py-3"
              >
                <span className="text-sm lowercase">
                  {test.dateKey} · {test.hand}
                </span>
                <span className="text-sm tabular-nums text-ink-soft">
                  {bestOf(test.attemptsKg).toFixed(1)} kg · {test.edgeMm} mm
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-sm lowercase text-ink-soft">sessions</h2>
        {recent.length === 0 ? (
          <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
            Nothing yet.
          </p>
        ) : (
          <ul className="border-t border-line-soft">
            {recent.map((session) => {
              const inZone =
                session.sets.length > 0
                  ? session.sets.reduce((sum, s) => sum + s.timeInZone, 0) / session.sets.length
                  : 0;
              return (
                <li key={session.id} className="border-b border-line-soft py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm lowercase">
                      {PROGRAMS[session.programId]?.name ?? session.programId}
                    </span>
                    <span className="text-sm tabular-nums text-ink-soft">
                      {Math.round(inZone * 100)}% in band
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs lowercase tabular-nums text-ink-soft">
                    {session.dateKey} · {session.setsCompleted}/{session.setsTotal} hangs ·{' '}
                    {session.activeSec}s under tension
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
