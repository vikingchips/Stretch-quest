import { useEffect, useState, useSyncExternalStore } from 'react';
import { syncConfigured } from '../sync/client';
import { attachSession, useAuthStore } from '../sync/authStore';
import { onSyncChange, syncNow, syncState } from '../sync/cloudSync';
import { Icon } from './Icon';

const SYNC_LABEL = {
  idle: '',
  syncing: 'syncing…',
  synced: 'everything is backed up',
  error: 'could not sync',
} as const;

export function AccountSection() {
  const { status, email, error, requestCode, verifyCode, signOut, cancel } = useAuthStore();
  const sync = useSyncExternalStore(onSyncChange, syncState, syncState);
  const [emailInput, setEmailInput] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (status === 'signed-out') setCode('');
  }, [status]);

  // Opening settings is a good moment to find out whether a session exists.
  useEffect(() => {
    if (syncConfigured) void attachSession();
  }, []);

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
          <p className="text-sm">{email}</p>
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

  if (status === 'code-sent') {
    return (
      <section className="mb-10">
        <h2 className="mb-3 text-sm lowercase text-ink-soft">account</h2>
        <p className="measure text-sm leading-relaxed text-ink-soft">
          We sent a six-digit code to {email}.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={8}
          className="mt-5 w-full border-b border-line bg-transparent pb-3 text-2xl tabular-nums tracking-[0.3em] placeholder:text-ink-soft/40 focus:border-pine focus:outline-none"
        />
        {error && <p className="mt-3 text-xs text-clay">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => void verifyCode(code)}
            disabled={code.trim().length < 6}
            className="flex-1 bg-pine-deep py-3 text-sm lowercase tracking-wide text-paper hover:brightness-110 disabled:opacity-30"
          >
            sign in
          </button>
          <button
            onClick={cancel}
            className="flex-1 border border-line py-3 text-sm lowercase text-ink-soft hover:bg-surface hover:text-ink"
          >
            cancel
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm lowercase text-ink-soft">account</h2>
      <p className="measure text-sm leading-relaxed text-ink-soft">
        Optional. Sign in to back your history up and pick it up on another device. No password
        — you get a six-digit code by email.
      </p>
      <input
        value={emailInput}
        onChange={(e) => setEmailInput(e.target.value)}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        className="mt-5 w-full border-b border-line bg-transparent pb-3 placeholder:text-ink-soft/60 focus:border-pine focus:outline-none"
      />
      {error && <p className="mt-3 text-xs text-clay">{error}</p>}
      <button
        onClick={() => void requestCode(emailInput.trim())}
        disabled={!emailInput.includes('@') || status === 'loading'}
        className="mt-5 w-full bg-pine-deep py-3 text-sm lowercase tracking-wide text-paper hover:brightness-110 disabled:opacity-30"
      >
        {status === 'loading' ? 'sending…' : 'email me a code'}
      </button>
    </section>
  );
}
