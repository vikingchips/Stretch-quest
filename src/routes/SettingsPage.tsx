import { useNavigate } from 'react-router-dom';
import type { DailyGoalMinutes } from '../types';
import { useSettingsStore } from '../store/settingsStore';
import { useProgressStore } from '../store/progressStore';

const GOALS: DailyGoalMinutes[] = [5, 10, 15, 20];
const REST_OPTIONS = [5, 10, 15, 20];
const PREP_OPTIONS = [3, 5, 10];

export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const resetAll = useProgressStore((s) => s.resetAll);

  return (
    <main className="px-4 pb-24 pt-6">
      <button onClick={() => navigate(-1)} className="mb-3 text-sm font-extrabold text-ink-dim">
        ‹ Back
      </button>
      <h1 className="mb-5 text-2xl font-extrabold">Settings</h1>

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-dim">
          Daily goal
        </h2>
        <div className="flex gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() => settings.setDailyGoal(g)}
              className={`flex-1 rounded-2xl py-3 font-extrabold ${
                settings.dailyGoalMinutes === g ? 'bg-brand text-surface' : 'bg-card text-ink-dim'
              }`}
            >
              {g} min
            </button>
          ))}
        </div>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-dim">
          Rest between stretches
        </h2>
        <div className="flex gap-2">
          {REST_OPTIONS.map((sec) => (
            <button
              key={sec}
              onClick={() => settings.setRestDuration(sec)}
              className={`flex-1 rounded-2xl py-3 font-extrabold ${
                settings.restDurationSec === sec ? 'bg-brand text-surface' : 'bg-card text-ink-dim'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-dim">
          Get-ready countdown
        </h2>
        <div className="flex gap-2">
          {PREP_OPTIONS.map((sec) => (
            <button
              key={sec}
              onClick={() => settings.setPrepDuration(sec)}
              className={`flex-1 rounded-2xl py-3 font-extrabold ${
                settings.prepDurationSec === sec ? 'bg-brand text-surface' : 'bg-card text-ink-dim'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <button
          onClick={() => settings.setSoundEnabled(!settings.soundEnabled)}
          className="flex w-full items-center justify-between rounded-2xl bg-card p-4"
        >
          <span className="font-extrabold">🔔 Sound cues</span>
          <span
            className={`rounded-full px-3 py-1 text-sm font-extrabold ${
              settings.soundEnabled ? 'bg-brand/20 text-brand' : 'bg-line/60 text-ink-dim'
            }`}
          >
            {settings.soundEnabled ? 'On' : 'Off'}
          </span>
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-red-400">
          Danger zone
        </h2>
        <button
          onClick={() => {
            if (
              confirm(
                'Reset ALL progress? Your XP, streak, badges and history will be gone forever.',
              )
            ) {
              resetAll();
              navigate('/');
            }
          }}
          className="w-full rounded-2xl border-2 border-red-400/40 py-3 font-extrabold text-red-400"
        >
          Reset all data
        </button>
      </section>

      <p className="mt-8 text-center text-xs font-semibold text-ink-dim">
        StretchQuest v1.0 · data lives only on this device
      </p>
    </main>
  );
}
