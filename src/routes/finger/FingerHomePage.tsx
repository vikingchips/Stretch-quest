import { Link } from 'react-router-dom';
import {
  ABRAHANGS_MIN_GAP_HOURS,
  MAX_HANGS_PER_WEEK,
} from '../../finger/constants';
import { maxByHand } from '../../finger/maxTest';
import { COMBINATION_MESSAGE, PROGRAM_LIST } from '../../finger/programs';
import { useSource } from '../../finger/useSource';
import { useFingerStore } from '../../store/fingerStore';
import { useProgressStore } from '../../store/progressStore';
import { addDays, todayKey } from '../../game/dates';
import { Icon } from '../../components/Icon';

function hoursSince(iso: string | null): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export function FingerHomePage() {
  const finger = useFingerStore();
  const source = useSource();
  const sessions = useProgressStore((s) => s.sessions);

  const maxes = maxByHand(finger.maxes, 'half-crimp', finger.activeEdgeMm);
  const hasMax = maxes.left !== undefined || maxes.right !== undefined;
  const daysSince = finger.daysSinceTest();
  const due = finger.retestDue();

  const sinceAbrahangs = hoursSince(finger.lastAbrahangsAt);
  const abrahangsWait =
    sinceAbrahangs !== null && sinceAbrahangs < ABRAHANGS_MIN_GAP_HOURS
      ? ABRAHANGS_MIN_GAP_HOURS - sinceAbrahangs
      : null;

  const weekStart = addDays(todayKey(), -6);
  const maxHangsThisWeek = finger.sessions.filter(
    (s) => s.programId === 'max-hangs' && s.dateKey >= weekStart,
  ).length;

  // Finger sessions are ordinary sessions as far as the streak is concerned,
  // so today's count comes from the same place the home screen reads.
  const doneToday = sessions.filter(
    (s) => s.category === 'fingers' && s.dateKey === todayKey(),
  ).length;

  return (
    <main className="px-6 pb-28 pt-10">
      <h1 className="mb-2 text-2xl lowercase tracking-wide">grip</h1>
      <Link
        to="/finger/device"
        className="mb-12 flex items-center gap-2 text-xs lowercase text-ink-soft hover:text-ink"
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor:
              source.status === 'connected' ? 'var(--color-pine)' : 'var(--color-line)',
          }}
          aria-hidden="true"
        />
        {source.status === 'connected'
          ? source.kind === 'mock'
            ? 'simulated device'
            : 'device connected'
          : 'no device — tap to connect'}
      </Link>

      {hasMax ? (
        <section className="mb-12">
          <h2 className="mb-4 text-sm lowercase text-ink-soft">
            one-hand max · half crimp
            {finger.activeEdgeMm !== null && ` · ${finger.activeEdgeMm} mm`}
          </h2>
          <dl className="grid grid-cols-2 gap-6 border-y border-line-soft py-6">
            {(['left', 'right'] as const).map((hand) => (
              <div key={hand}>
                <dd className="display text-3xl leading-none tabular-nums">
                  {maxes[hand] !== undefined ? maxes[hand]!.toFixed(1) : '—'}
                  {maxes[hand] !== undefined && (
                    <span className="ml-1 text-base text-ink-soft">kg</span>
                  )}
                </dd>
                <dt className="mt-2 text-[11px] lowercase text-ink-soft">{hand}</dt>
              </div>
            ))}
          </dl>
          {daysSince !== null && (
            <p className={`mt-3 text-xs lowercase ${due ? 'text-clay' : 'text-ink-soft'}`}>
              {due
                ? `tested ${daysSince} days ago — time to retest`
                : `tested ${daysSince} days ago`}
            </p>
          )}
        </section>
      ) : (
        <section className="mb-12 border-y border-line-soft py-6">
          <h2 className="text-base lowercase">test first</h2>
          <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
            Every training band is a percentage of your one-hand max, so there is nothing to
            compute until it has been measured. Takes about ten minutes.
          </p>
          <Link
            to="/finger/test"
            className="mt-6 block bg-pine-deep py-3 text-center text-sm lowercase tracking-wide text-paper hover:brightness-110"
          >
            run the max test
          </Link>
        </section>
      )}

      <section className="mb-12">
        <h2 className="mb-1 text-sm lowercase text-ink-soft">programs</h2>
        <div className="border-t border-line-soft">
          {PROGRAM_LIST.map((program) => {
            const blocked = !hasMax;
            const note =
              program.id === 'abrahangs'
                ? abrahangsWait !== null
                  ? `next window in ${Math.ceil(abrahangsWait)} h`
                  : doneToday > 0
                    ? 'one done today'
                    : '2 a day'
                : `${maxHangsThisWeek} of ${MAX_HANGS_PER_WEEK.lo}–${MAX_HANGS_PER_WEEK.hi} this week`;
            const body = (
              <>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base lowercase">{program.name}</h3>
                  <p className="mt-0.5 text-xs lowercase text-ink-soft">
                    {program.reps}×{program.hangSec}s · {Math.round(program.band.lo * 100)}–
                    {Math.round(program.band.hi * 100)}% · {note}
                  </p>
                </div>
                <span className="text-line">
                  <Icon name="chevronRight" size={18} />
                </span>
              </>
            );
            return blocked ? (
              <div
                key={program.id}
                className="flex items-center gap-4 border-b border-line-soft py-4 opacity-40"
              >
                {body}
              </div>
            ) : (
              <Link
                key={program.id}
                to={`/finger/session/${program.id}`}
                className="group flex items-center gap-4 border-b border-line-soft py-4 hover:bg-surface"
              >
                {body}
              </Link>
            );
          })}
        </div>
        <p className="measure mt-4 text-xs leading-relaxed text-ink-soft">
          {COMBINATION_MESSAGE}
        </p>
      </section>

      <nav className="flex flex-col gap-px">
        {[
          { to: '/finger/games', label: 'games' },
          { to: '/finger/history', label: 'history' },
          { to: '/finger/test', label: 'max test' },
          { to: '/finger/device', label: 'device and setup' },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center justify-between border-b border-line-soft py-4 text-sm lowercase text-ink-soft hover:text-ink"
          >
            {link.label}
            <Icon name="chevronRight" size={16} />
          </Link>
        ))}
      </nav>
    </main>
  );
}
