import { useEffect, useState } from 'react';
import {
  BLE_UNSUPPORTED_MESSAGE,
  bleSupported,
  knownDevices,
} from '../finger/bleSource';
import { useBleDevice, useMockDevice } from '../finger/sourceManager';
import { useSource } from '../finger/useSource';
import { Icon } from './Icon';

/**
 * The list of boards you can train on right now.
 *
 * A web page cannot scan for bluetooth devices itself — that is the browser's
 * job, behind its own chooser, and no amount of wanting changes it. So this
 * list is everything the page genuinely knows about: boards this browser has
 * already been paired with, which connect on a tap with no dialog at all, plus
 * the two ways to reach one it has not seen before.
 */
export function DevicePicker({ onConnected }: { onConnected?: () => void }) {
  const source = useSource();
  const supported = bleSupported();
  const [remembered, setRemembered] = useState<BluetoothDevice[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void knownDevices().then((devices) => {
      if (live) setRemembered(devices);
    });
    return () => {
      live = false;
    };
  }, []);

  async function run(key: string, connect: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await connect();
      onConnected?.();
    } catch (e) {
      // A cancelled chooser is a decision, not a failure worth shouting about.
      const message = e instanceof Error ? e.message : String(e);
      setError(/cancel|user gesture|chooser/i.test(message) ? null : message);
    } finally {
      setBusy(null);
    }
  }

  const rows: Array<{ key: string; label: string; note: string; go: () => Promise<void> }> = [
    ...remembered.map((device, i) => ({
      key: device.id ?? `known-${i}`,
      label: (device.name ?? 'hangboard').toLowerCase(),
      note: 'paired · connects without asking',
      go: () => useBleDevice(device),
    })),
    ...(supported
      ? [
          {
            key: 'scan',
            label: remembered.length > 0 ? 'another hangboard' : 'find a hangboard',
            note: 'opens the browser bluetooth chooser',
            go: () => useBleDevice(),
          },
        ]
      : []),
    {
      key: 'mock',
      label: 'simulated hangboard',
      note: 'no hardware — a slider stands in for the pull',
      go: () => useMockDevice(),
    },
  ];

  return (
    <div className="w-full max-w-sm text-left">
      <div className="border-t border-line-soft">
        {rows.map((row) => (
          <button
            key={row.key}
            onClick={() => void run(row.key, row.go)}
            disabled={busy !== null}
            className="flex w-full items-center gap-4 border-b border-line-soft py-4 text-left hover:bg-surface disabled:opacity-50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base lowercase">{row.label}</span>
              <span className="mt-0.5 block text-xs lowercase text-ink-soft">
                {busy === row.key ? 'connecting…' : row.note}
              </span>
            </span>
            <span className="text-line">
              <Icon name="chevronRight" size={18} />
            </span>
          </button>
        ))}
      </div>

      {!supported && (
        <p className="measure mt-4 text-xs leading-relaxed text-ink-soft">
          {BLE_UNSUPPORTED_MESSAGE}
        </p>
      )}
      {error && <p className="measure mt-4 text-xs leading-relaxed text-clay">{error}</p>}
      {source.status === 'connecting' && (
        <p className="mt-4 text-xs lowercase text-ink-soft">waiting for the board…</p>
      )}
    </div>
  );
}
