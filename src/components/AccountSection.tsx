import { useEffect, useState, useSyncExternalStore } from 'react';
import { syncConfigured } from '../sync/client';
import { attachSession, useAuthStore } from '../sync/authStore';
import { isValidName, isValidPin, PIN_LENGTH } from '../sync/identity';
import { onSyncChange, syncNow, syncState } from '../sync/cloudSync';
import { Icon } from './Icon';

const SYNC_LABEL = {
  idle: '',
  syncing: 'syncing…',
  synced: 'everything is backed up',
  error: 'could not sync',
} as const;

export function AccountSection() {
  const { status, displayName, error, signIn, createAccount, signOut, clearError } =
    useAuthStore();
  const sync = useSyncExternalStore(onSyncChange, syncState, syncState);
  const [mode, setMode] = useState<'sign-in' | 'create'>('sign-in');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  // Opening settings is a good moment to find out whether a session exists.
  useEffect(() => {
    if (syncConfigured) void attachSession();
  }, []);

  useEffect(() => {
    if (status === 'signed-in') {
      setName('');
      setPin('');
    }
  }, [status]);

  if (!syncConfigured) {
    return (
      <section className="mb-10">
        <h2 className="mb-3 text-sm lowercase text-ink-soft">account</h2>
        <p className="measure text-sm leading-relaxed text-ink-soft">
          This build has no sync credentials, so everything stays on this device. That is a
          complete, working app — an account only adds a backup you can reach from another
          phone.
        </p>
      </section>
    );
  }

  if (status === 'signed-in') {
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
          Signing out leaves your history on this device untouched.
        </p>
      </section>
    );
  }

  const ready = isValidName(name) && isValidPin(pin);
  const busy = status === 'loading';

  function submit() {
    if (!ready || busy) return;
    void (mode === 'create' ? createAccount(name, pin) : signIn(name, pin));
  }

  function switchMode(next: 'sign-in' | 'create') {
    setMode(next);
    clearError();
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm lowercase text-ink-soft">account</h2>
      <p className="measure text-sm leading-relaxed text-ink-soft">
        Optional. A name and a {PIN_LENGTH}-digit code, so your history is backed up and follows
        you to another device.
      </p>

      <div className="mt-5 flex border-b border-line">
        {(['sign-in', 'create'] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`-mb-px border-b pb-3 pr-8 text-sm lowercase ${
              mode === m ? 'border-pine text-ink' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {m === 'sign-in' ? 'sign in' : 'create account'}
          </button>
        ))}
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="username"
        placeholder="your name"
        maxLength={40}
        className="mt-6 w-full border-b border-line bg-transparent pb-3 lowercase placeholder:text-ink-soft/60 focus:border-pine focus:outline-none"
      />
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        inputMode="numeric"
        autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
        placeholder="0000"
        className="mt-6 w-full border-b border-line bg-transparent pb-3 text-2xl tabular-nums tracking-[0.4em] placeholder:text-ink-soft/40 focus:border-pine focus:outline-none"
      />

      {error && <p className="measure mt-4 text-xs leading-relaxed text-clay">{error}</p>}

      <button
        onClick={submit}
        disabled={!ready || busy}
        className="mt-6 w-full bg-pine-deep py-3 text-sm lowercase tracking-wide text-paper hover:brightness-110 disabled:opacity-30"
      >
        {busy ? 'one moment…' : mode === 'create' ? 'create account' : 'sign in'}
      </button>

      {mode === 'create' && (
        <p className="measure mt-3 text-xs leading-relaxed text-ink-soft">
          Four digits is not real security — anyone who knows your name could guess their way in.
          Fine for stretching history; don't reuse a code that protects anything else.
        </p>
      )}
    </section>
  );
}
