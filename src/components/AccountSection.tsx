import { useSyncExternalStore } from 'react';
import { syncConfigured } from '../sync/client';
import { useAuthStore } from '../sync/authStore';
import { onSyncChange, syncNow, syncState } from '../sync/cloudSync';
import { Icon } from './Icon';

const SYNC_LABEL = {
  idle: '',
  syncing: 'syncing…',
  synced: 'everything is backed up',
  error: 'could not sync',
} as const;

/**
 * Only ever renders for someone already signed in — the gate in App.tsx
 * handles getting them there. Signing out returns them to it.
 */
export function AccountSection() {
  const { displayName, signOut } = useAuthStore();
  const sync = useSyncExternalStore(onSyncChange, syncState, syncState);

  if (!syncConfigured) {
    return (
      <section className="mb-10">
        <h2 className="mb-3 text-sm lowercase text-ink-soft">account</h2>
        <p className="measure text-sm leading-relaxed text-ink-soft">
          This build has no sync credentials, so everything stays on this device and there is
          nothing to sign in to.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm lowercase text-ink-soft">account</h2>
      <div className="border-y border-line-soft py-4">
        <p className="text-sm lowercase">{displayName ?? 'signed in'}</p>
        <p className="mt-1 text-xs lowercase text-ink-soft">
          {sync.state === 'error' ? (sync.error ?? SYNC_LABEL.error) : SYNC_LABEL[sync.state]}
        </p>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => void syncNow()}
          className="flex flex-1 items-center justify-center gap-2 border border-line py-3 text-sm lowercase hover:bg-surface"
        >
          <Icon name="check" size={16} />
          sync now
        </button>
        <button
          onClick={() => void signOut()}
          className="flex-1 border border-line py-3 text-sm lowercase text-ink-soft hover:bg-surface hover:text-ink"
        >
          sign out
        </button>
      </div>
      <p className="measure mt-3 text-xs leading-relaxed text-ink-soft">
        Signing out returns you to the sign-in screen. Nothing on this device is deleted.
      </p>
    </section>
  );
}
