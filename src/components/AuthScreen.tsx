import { useState } from 'react';
import { useAuthStore } from '../sync/authStore';
import { isValidName, isValidPin, PIN_LENGTH } from '../sync/identity';

/**
 * The gate. Sign-in is required, so this stands in front of the app rather
 * than living in settings.
 *
 * It does not navigate — it replaces the content while the URL stays put, so
 * someone who arrives on a shared friend link lands on that link once they
 * are through.
 */
export function AuthScreen() {
  const { status, error, signIn, createAccount, clearError } = useAuthStore();
  const [mode, setMode] = useState<'sign-in' | 'create'>('sign-in');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  const ready = isValidName(name) && isValidPin(pin);
  const busy = status === 'loading';

  function submit() {
    if (!ready || busy) return;
    void (mode === 'create' ? createAccount(name, pin) : signIn(name, pin));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12 safe-top">
      <h1 className="text-2xl lowercase tracking-wide">stretchquest</h1>
      <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
        Your history lives on your account, so it survives a lost phone and lets you follow
        friends. A name and {PIN_LENGTH} digits is all it takes.
      </p>

      <div className="mt-10 flex border-b border-line">
        {(['sign-in', 'create'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              clearError();
            }}
            className={`-mb-px border-b pb-3 pr-8 text-sm lowercase ${
              mode === m
                ? 'border-pine text-ink'
                : 'border-transparent text-ink-soft hover:text-ink'
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
        className="mt-8 w-full border-b border-line bg-transparent pb-3 text-lg lowercase placeholder:text-ink-soft/60 focus:border-pine focus:outline-none"
      />
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        inputMode="numeric"
        autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
        placeholder="0000"
        className="mt-8 w-full border-b border-line bg-transparent pb-3 text-3xl tabular-nums tracking-[0.4em] placeholder:text-ink-soft/40 focus:border-pine focus:outline-none"
      />

      {error && <p className="measure mt-5 text-xs leading-relaxed text-clay">{error}</p>}

      <button
        onClick={submit}
        disabled={!ready || busy}
        className="mt-10 w-full bg-pine-deep py-4 text-sm lowercase tracking-wide text-paper hover:brightness-110 disabled:opacity-30"
      >
        {busy ? 'one moment…' : mode === 'create' ? 'create account' : 'sign in'}
      </button>

      {mode === 'create' && (
        <p className="measure mt-4 text-xs leading-relaxed text-ink-soft">
          Four digits is not real security — anyone who knows your name could guess their way
          in. Fine for stretching history; don't reuse a code that protects anything else.
        </p>
      )}
    </main>
  );
}
