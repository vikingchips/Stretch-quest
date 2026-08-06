import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { useProgressStore } from '../store/progressStore';
import { Icon } from '../components/Icon';
import { AccountSection } from '../components/AccountSection';
import { syncConfigured } from '../sync/client';

const REST_OPTIONS = [5, 10, 15, 20];
const PREP_OPTIONS = [3, 5, 10];

function optionClass(selected: boolean): string {
  return `flex-1 border py-3 text-sm lowercase ${
    selected ? 'border-pine text-pine-deep' : 'border-line-soft text-ink-soft hover:text-ink'
  }`;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useSettingsStore();
  const resetAll = useProgressStore((s) => s.resetAll);

  return (
    <main className="px-6 pb-28 pt-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-1 text-sm lowercase text-ink-soft hover:text-ink"
      >
        <Icon name="chevronLeft" size={16} />
        back
      </button>
      <h1 className="mb-12 text-2xl lowercase tracking-wide">settings</h1>

      <AccountSection />

      <section className="mb-10">
        <h2 className="mb-3 text-sm lowercase text-ink-soft">rest between stretches</h2>
        <div className="flex gap-3">
          {REST_OPTIONS.map((sec) => (
            <button
              key={sec}
              onClick={() => settings.setRestDuration(sec)}
              className={optionClass(settings.restDurationSec === sec)}
            >
              {sec}s
            </button>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm lowercase text-ink-soft">get-ready countdown</h2>
        <div className="flex gap-3">
          {PREP_OPTIONS.map((sec) => (
            <button
              key={sec}
              onClick={() => settings.setPrepDuration(sec)}
              className={optionClass(settings.prepDurationSec === sec)}
            >
              {sec}s
            </button>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <button
          onClick={() => settings.setSoundEnabled(!settings.soundEnabled)}
          className="flex w-full items-center justify-between border-y border-line-soft py-4"
        >
          <span className="flex items-center gap-3 text-sm lowercase">
            <Icon name="sound" size={18} className="text-ink-soft" />
            sound cues
          </span>
          <span
            className={`text-sm lowercase ${
              settings.soundEnabled ? 'text-pine-deep' : 'text-ink-soft'
            }`}
          >
            {settings.soundEnabled ? 'on' : 'off'}
          </span>
        </button>
      </section>

      <section className="mb-16">
        <h2 className="mb-3 text-sm lowercase text-ink-soft">modules</h2>
        <button
          onClick={() => settings.setFingerModuleEnabled(!settings.fingerModuleEnabled)}
          className="flex w-full items-center justify-between border-y border-line-soft py-4"
        >
          <span className="flex items-center gap-3 text-sm lowercase">
            <Icon name="grip" size={18} className="text-ink-soft" />
            finger strength
          </span>
          <span
            className={`text-sm lowercase ${
              settings.fingerModuleEnabled ? 'text-pine-deep' : 'text-ink-soft'
            }`}
          >
            {settings.fingerModuleEnabled ? 'on' : 'off'}
          </span>
        </button>
        <p className="measure mt-3 text-xs leading-relaxed text-ink-soft">
          Hangboard training and testing with a Progressor-compatible force sensor — or a
          simulated one, if you do not have the hardware. Adds a tab. Stretching works the
          same either way.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm lowercase text-ink-soft">reset</h2>
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
          className="w-full border border-line-soft py-3 text-sm lowercase text-clay hover:bg-surface"
        >
          erase all data
        </button>
        <p className="measure mt-3 text-xs leading-relaxed text-ink-soft">
          Removes your XP, streak, badges and session history from this device. There is no undo.
        </p>
      </section>

      {/* The build, not a version number. "v1.0" never changed, so it could
          not answer the one thing anyone reads it for: whether the service
          worker has picked up the new bundle yet. */}
      <p className="mt-16 text-center text-xs lowercase text-ink-soft">
        stretchquest · build {__BUILD_ID__}
      </p>
      <p className="mt-1 text-center text-xs lowercase text-ink-soft">
        {syncConfigured ? 'history syncs to your account' : 'data lives only on this device'}
      </p>
    </main>
  );
}
