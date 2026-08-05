import { Link } from 'react-router-dom';
import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { useFingerStore } from '../store/fingerStore';
import { BUILTIN_ROUTINE_BY_ID } from '../data/routines';
import { goalMetOnDay, weekMarks } from '../game/dailyGoal';
import { addDays, todayKey } from '../game/dates';
import { maxByHand } from '../finger/maxTest';
import { ABRAHANGS_MIN_GAP_HOURS, MAX_HANGS_PER_WEEK } from '../finger/constants';
import { StreakStat } from '../components/StreakStat';
import { XpLevelBar } from '../components/XpLevelBar';
import { WeekStrip } from '../components/WeekStrip';
import { TodayList, type TodayItem } from '../components/TodayList';
import { Icon } from '../components/Icon';

const DAILY_ROUTINE_ID = 'daily-warp';
const ABRAHANGS_PER_DAY = 2;

export function HomePage() {
  const progress = useProgressStore((s) => s.progress);
  const sessions = useProgressStore((s) => s.sessions);
  const freezeToast = useProgressStore((s) => s.freezeToast);
  const streakLostToast = useProgressStore((s) => s.streakLostToast);
  const dismissToasts = useProgressStore((s) => s.dismissToasts);
  const fingerEnabled = useSettingsStore((s) => s.fingerModuleEnabled);
  const finger = useFingerStore();

  const today = todayKey();
  const doneToday = goalMetOnDay(sessions, today);
  const marks = weekMarks(sessions, progress.frozenDateKeys, today);

  const items: TodayItem[] = [];

  const daily = BUILTIN_ROUTINE_BY_ID[DAILY_ROUTINE_ID];
  if (daily) {
    const done = sessions.some((s) => s.dateKey === today && s.routineId === DAILY_ROUTINE_ID);
    items.push({
      key: 'daily',
      to: `/routines/${daily.id}`,
      label: daily.name,
      note: done ? 'done today' : 'the daily baseline',
      done,
    });
  }

  if (fingerEnabled) {
    const maxes = maxByHand(finger.maxes, 'half-crimp', finger.activeEdgeMm);
    const noMax = maxes.left === undefined && maxes.right === undefined;

    const abrahangsToday = finger.sessions.filter(
      (s) => s.programId === 'abrahangs' && s.dateKey === today,
    ).length;
    const hoursSince = finger.lastAbrahangsAt
      ? (Date.now() - new Date(finger.lastAbrahangsAt).getTime()) / 3_600_000
      : null;
    const tooSoon =
      abrahangsToday > 0 && hoursSince !== null && hoursSince < ABRAHANGS_MIN_GAP_HOURS;

    items.push({
      key: 'abrahangs',
      to: '/finger/session/abrahangs',
      label: 'abrahangs',
      note: `${abrahangsToday} of ${ABRAHANGS_PER_DAY} today`,
      done: abrahangsToday >= ABRAHANGS_PER_DAY,
      blocked: noMax
        ? 'needs a max test first'
        : tooSoon
          ? `${Math.ceil(ABRAHANGS_MIN_GAP_HOURS - hoursSince!)} h until the next one`
          : undefined,
    });

    const weekStart = addDays(today, -6);
    const maxHangsThisWeek = finger.sessions.filter(
      (s) => s.programId === 'max-hangs' && s.dateKey >= weekStart,
    ).length;
    const doneMaxHangsToday = finger.sessions.some(
      (s) => s.programId === 'max-hangs' && s.dateKey === today,
    );
    items.push({
      key: 'max-hangs',
      to: '/finger/session/max-hangs',
      label: 'max hangs',
      note: `${maxHangsThisWeek} of ${MAX_HANGS_PER_WEEK.lo}–${MAX_HANGS_PER_WEEK.hi} this week`,
      done: maxHangsThisWeek >= MAX_HANGS_PER_WEEK.lo,
      blocked: noMax
        ? 'needs a max test first'
        : doneMaxHangsToday
          ? 'done today — leave a day between'
          : undefined,
    });

    if (noMax) {
      items.push({
        key: 'max-test',
        to: '/finger/test',
        label: 'max test',
        note: 'every hangboard band is a percentage of this',
        done: false,
      });
    } else if (finger.retestDue()) {
      items.push({
        key: 'retest',
        to: '/finger/test',
        label: 'retest your max',
        note: `last tested ${finger.daysSinceTest()} days ago`,
        done: false,
      });
    }
  }

  return (
    <main className="px-6 pb-28 pt-10">
      <header className="mb-12 flex items-start justify-between">
        <div>
          <h1 className="text-2xl lowercase tracking-wide">stretchquest</h1>
          <p className="mt-1 text-sm text-ink-soft">a few quiet minutes, every day.</p>
        </div>
        <Link to="/settings" aria-label="Settings" className="p-1 text-ink-soft hover:text-ink">
          <Icon name="sliders" size={22} />
        </Link>
      </header>

      {(freezeToast || streakLostToast) && (
        <button
          onClick={dismissToasts}
          className="animate-reveal mb-10 w-full border border-line-soft bg-surface px-4 py-3 text-left"
        >
          <span className="text-sm text-ink">
            {freezeToast
              ? 'A streak freeze held your streak overnight. Stretch today to keep it.'
              : 'Your streak reset. Today is a fine day to begin another.'}
          </span>
          <span className="mt-1 block text-[11px] lowercase text-ink-soft">tap to dismiss</span>
        </button>
      )}

      <section className="mb-12">
        <div className="flex items-end justify-between">
          <StreakStat streak={progress.streak} size="lg" />
          <div className="text-right">
            <p className="text-sm lowercase">{doneToday ? 'today is done' : 'nothing yet today'}</p>
            <p className="mt-1 text-[11px] lowercase text-ink-soft">
              {progress.streakFreezes} freeze{progress.streakFreezes === 1 ? '' : 's'} banked
            </p>
          </div>
        </div>
        <div className="mt-8">
          <WeekStrip marks={marks} />
        </div>
      </section>

      <div className="mb-12">
        <XpLevelBar xp={progress.xp} />
      </div>

      <section>
        <h2 className="mb-1 text-sm lowercase text-ink-soft">today</h2>
        <TodayList items={items} />
      </section>
    </main>
  );
}
