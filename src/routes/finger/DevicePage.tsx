import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BLE_UNSUPPORTED_MESSAGE, bleSupported } from '../../finger/bleSource';
import { RETEST_MAX_DAYS, RETEST_MIN_DAYS } from '../../finger/constants';
import { isGradableEdge } from '../../finger/grades';
import {
  activeSource,
  disconnectSource,
  mockSource,
  onForceSample,
  useBleDevice,
  useMockDevice,
} from '../../finger/sourceManager';
import { useSource } from '../../finger/useSource';
import { useFingerStore } from '../../store/fingerStore';
import { Icon } from '../../components/Icon';

const RETEST_OPTIONS = [28, 35, 42, 56];

function optionClass(selected: boolean): string {
  return `flex-1 border py-3 text-sm lowercase ${
    selected ? 'border-pine text-pine-deep' : 'border-line-soft text-ink-soft hover:text-ink'
  }`;
}

/** Live reading, written straight to the DOM rather than through state. */
function LiveReading() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let latest = 0;
    const off = onForceSample((s) => {
      latest = s.kg;
    });
    const id = setInterval(() => {
      if (ref.current) ref.current.textContent = latest.toFixed(1);
    }, 100);
    return () => {
      off();
      clearInterval(id);
    };
  }, []);
  return (
    <span className="tabular-nums">
      <span ref={ref}>0.0</span> kg
    </span>
  );
}

export function DevicePage() {
  const navigate = useNavigate();
  const source = useSource();
  const finger = useFingerStore();
  const [error, setError] = useState<string | null>(null);
  const [edgeDraft, setEdgeDraft] = useState('');
  const [mockLevel, setMockLevel] = useState(0);
  const [calWeight, setCalWeight] = useState('');
  const [calibrating, setCalibrating] = useState(false);
  const [calResult, setCalResult] = useState<string | null>(null);

  const connected = source.status === 'connected';
  const supported = bleSupported();

  async function connectBle() {
    setError(null);
    try {
      await useBleDevice();
    } catch (e) {
      // A cancelled chooser is not a failure worth shouting about.
      const message = e instanceof Error ? e.message : String(e);
      setError(/cancel|user gesture|chooser/i.test(message) ? null : message);
    }
  }

  async function runCalibration() {
    const kg = Number(calWeight);
    if (!Number.isFinite(kg) || kg <= 0) {
      setCalResult('Type the weight that is hanging right now, in kilograms.');
      return;
    }
    setCalibrating(true);
    setCalResult(null);
    try {
      const result = await activeSource()?.calibrate(kg);
      if (!result) {
        setCalResult('The device did not answer. Still connected?');
      } else if (!result.ok) {
        // The device's own guard: a real weight moves the reading by
        // thousands of counts, so a small swing means it is not actually on,
        // or the tare was taken with it already hanging.
        setCalResult(
          'The reading barely moved. Is the weight actually hanging, and did you tare before putting it on?',
        );
      } else {
        setCalResult(
          `calibrated · ${result.countsPerKg.toFixed(0)} counts per kg · ` +
            `${(1 / result.countsPerKg).toFixed(4)} kg per count`,
        );
      }
    } catch (e) {
      setCalResult(e instanceof Error ? e.message : String(e));
    } finally {
      setCalibrating(false);
    }
  }

  function addEdge() {
    const mm = Number(edgeDraft);
    if (!Number.isFinite(mm) || mm <= 0) return;
    finger.setEdges([...finger.edges, Math.round(mm)]);
    setEdgeDraft('');
  }

  return (
    <main className="px-6 pb-28 pt-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-1 text-sm lowercase text-ink-soft hover:text-ink"
      >
        <Icon name="chevronLeft" size={16} />
        back
      </button>
      <h1 className="mb-12 text-2xl lowercase tracking-wide">device</h1>

      <section className="mb-12">
        <h2 className="mb-3 text-sm lowercase text-ink-soft">connection</h2>
        <div className="border-y border-line-soft py-4">
          <div className="flex items-center justify-between text-sm lowercase">
            <span>
              {source.kind === 'ble'
                ? 'progressor device'
                : source.kind === 'mock'
                  ? 'simulated device'
                  : 'nothing connected'}
            </span>
            <span className={connected ? 'text-pine-deep' : 'text-ink-soft'}>
              {connected ? <LiveReading /> : source.status}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <button
            onClick={connectBle}
            disabled={!supported}
            className="border border-line py-3 text-sm lowercase text-ink hover:bg-surface disabled:text-line"
          >
            connect a real device
          </button>
          <button
            onClick={() => void useMockDevice()}
            className="border border-line py-3 text-sm lowercase text-ink hover:bg-surface"
          >
            use a simulated device
          </button>
          {connected && (
            <div className="flex gap-3">
              {/* Tares whatever is connected. This used to be wired to the
                  simulated source only, and hidden for everything else —
                  exactly backwards, since a real cell is the one that drifts
                  and the one you cannot reach without walking to the board. */}
              <button
                onClick={() => void activeSource()?.tare()}
                className="flex-1 border border-line-soft py-3 text-sm lowercase text-ink-soft hover:text-ink"
              >
                tare
              </button>
              <button
                onClick={disconnectSource}
                className="flex-1 border border-line-soft py-3 text-sm lowercase text-ink-soft hover:text-ink"
              >
                disconnect
              </button>
            </div>
          )}
        </div>

        {!supported && (
          <p className="measure mt-4 text-xs leading-relaxed text-ink-soft">
            {BLE_UNSUPPORTED_MESSAGE}
          </p>
        )}
        {error && <p className="measure mt-4 text-xs leading-relaxed text-clay">{error}</p>}

        {source.kind === 'mock' && connected && (
          <div className="mt-6">
            <label className="text-xs lowercase text-ink-soft" htmlFor="mock-level">
              simulated pull · {mockLevel} kg
            </label>
            <input
              id="mock-level"
              type="range"
              min={0}
              max={80}
              value={mockLevel}
              onChange={(e) => {
                const kg = Number(e.target.value);
                setMockLevel(kg);
                mockSource().setLevel(kg);
              }}
              className="mt-2 w-full accent-pine-deep"
            />
          </div>
        )}
      </section>

      {connected && (
        <section className="mb-12">
          <h2 className="mb-3 text-sm lowercase text-ink-soft">calibration</h2>
          <ol className="measure mb-4 space-y-1 text-xs leading-relaxed text-ink-soft">
            <li>1 · hang the board with nothing pulling on it, then tare above.</li>
            <li>2 · hang a weight you know, gently — never drop it on.</li>
            <li>3 · type that weight here and calibrate.</li>
            <li>4 · swap in a different known weight and check what it reads.</li>
          </ol>
          <div className="flex gap-3">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={calWeight}
              onChange={(e) => setCalWeight(e.target.value)}
              placeholder="known weight, kg"
              className="flex-1 border border-line-soft bg-surface px-4 py-3 text-sm tabular-nums lowercase text-ink placeholder:text-ink-soft"
            />
            <button
              onClick={runCalibration}
              disabled={calibrating}
              className="border border-line px-6 text-sm lowercase text-ink hover:bg-surface disabled:text-line"
            >
              {calibrating ? '…' : 'calibrate'}
            </button>
          </div>
          {calResult && (
            <p
              className={`measure mt-3 text-xs leading-relaxed ${
                calResult.startsWith('calibrated') ? 'text-pine-deep' : 'text-clay'
              }`}
            >
              {calResult}
            </p>
          )}
          <p className="measure mt-3 text-xs leading-relaxed text-ink-soft">
            Calibrate on the heaviest weight you have — the fit is most accurate there, and your
            training loads sit above it either way. Step 4 is the one that matters: a weight that
            was not used to fit is the only thing that shows whether the cell is linear.
          </p>
        </section>
      )}

      <section className="mb-12">
        <h2 className="mb-3 text-sm lowercase text-ink-soft">bodyweight</h2>
        <input
          type="number"
          inputMode="decimal"
          value={finger.bodyweightKg ?? ''}
          onChange={(e) =>
            finger.setBodyweight(e.target.value === '' ? null : Number(e.target.value))
          }
          placeholder="kg"
          className="w-full border border-line-soft bg-surface px-4 py-3 text-sm tabular-nums lowercase text-ink placeholder:text-ink-soft"
        />
        <p className="measure mt-3 text-xs leading-relaxed text-ink-soft">
          Everything about grades is a percentage of this, so a grade estimate needs it. Training
          does not.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-3 text-sm lowercase text-ink-soft">edge depths</h2>
        {finger.edges.length > 0 && (
          <ul className="mb-4 border-t border-line-soft">
            {finger.edges.map((mm) => (
              <li
                key={mm}
                className="flex items-center justify-between border-b border-line-soft py-3"
              >
                <button
                  onClick={() => finger.setActiveEdge(mm)}
                  className={`flex items-center gap-3 text-sm lowercase ${
                    finger.activeEdgeMm === mm ? 'text-pine-deep' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  <span className="tabular-nums">{mm} mm</span>
                  {isGradableEdge(mm) && (
                    <span className="text-[11px] text-ink-soft">gradeable</span>
                  )}
                  {finger.activeEdgeMm === mm && <Icon name="check" size={14} />}
                </button>
                <button
                  onClick={() => finger.setEdges(finger.edges.filter((e) => e !== mm))}
                  className="text-ink-soft hover:text-clay"
                  aria-label={`Remove ${mm} mm`}
                >
                  <Icon name="trash" size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3">
          <input
            type="number"
            inputMode="numeric"
            value={edgeDraft}
            onChange={(e) => setEdgeDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEdge()}
            placeholder="mm"
            className="flex-1 border border-line-soft bg-surface px-4 py-3 text-sm tabular-nums lowercase text-ink placeholder:text-ink-soft"
          />
          <button
            onClick={addEdge}
            className="border border-line px-6 text-sm lowercase text-ink hover:bg-surface"
          >
            add
          </button>
        </div>
        <p className="measure mt-3 text-xs leading-relaxed text-ink-soft">
          Measure your hangboard's steps and add them here. Grade estimates only ever come from
          the 20 mm step — smaller edges are fine to train on, there is just no data to grade
          them against.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm lowercase text-ink-soft">retest reminder</h2>
        <div className="flex gap-3">
          {RETEST_OPTIONS.map((days) => (
            <button
              key={days}
              onClick={() => finger.setRetestInterval(days)}
              className={optionClass(finger.retestIntervalDays === days)}
            >
              {days}d
            </button>
          ))}
        </div>
        <p className="measure mt-3 text-xs leading-relaxed text-ink-soft">
          Between {RETEST_MIN_DAYS} and {RETEST_MAX_DAYS} days. A new max recalculates every
          training band.
        </p>
      </section>
    </main>
  );
}
