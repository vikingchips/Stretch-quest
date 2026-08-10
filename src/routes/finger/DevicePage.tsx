import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RETEST_MAX_DAYS, RETEST_MIN_DAYS } from '../../finger/constants';
import { isGradableEdge } from '../../finger/grades';
import {
  coverageWarning,
  fitCalibration,
  fitQuality,
} from '../../finger/calibration';
import { maxByHand } from '../../finger/maxTest';
import { MAX_HANGS_BAND } from '../../finger/constants';
import {
  activeSource,
  disconnectSource,
  mockSource,
  onForceSample,
} from '../../finger/sourceManager';
import { useSource } from '../../finger/useSource';
import { useFingerStore } from '../../store/fingerStore';
import { DevicePicker } from '../../components/DevicePicker';
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
  const [edgeDraft, setEdgeDraft] = useState('');
  const [mockLevel, setMockLevel] = useState(0);
  const [calWeight, setCalWeight] = useState('');
  const [calibrating, setCalibrating] = useState(false);
  const [calResult, setCalResult] = useState<string | null>(null);

  const connected = source.status === 'connected';

  const fit = fitCalibration(finger.calibrationPoints);
  // Compared against the heaviest load the protocol will ask for: max hangs
  // sit at the top of the band, and that is the number the reference weights
  // have to reach before the fit means anything up there.
  const maxes = maxByHand(finger.maxes, 'half-crimp', finger.activeEdgeMm);
  const heaviestTrainingKg =
    Math.max(maxes.left ?? 0, maxes.right ?? 0) * MAX_HANGS_BAND.hi;
  const coverage = coverageWarning(fit, heaviestTrainingKg);

  /**
   * Capture one reference point, then refit and push the new factor.
   *
   * The fit is done here rather than on the device so it can be shown with
   * its residuals — the number alone was never the useful part.
   */
  async function addPoint() {
    const kg = Number(calWeight);
    if (!Number.isFinite(kg) || kg <= 0) {
      setCalResult('Type the weight that is hanging right now, in kilograms.');
      return;
    }
    setCalibrating(true);
    setCalResult(null);
    try {
      const counts = await activeSource()?.readCounts();
      if (counts === null || counts === undefined) {
        setCalResult('The device did not answer. Still connected?');
        return;
      }
      // The same guard the firmware applies to its own one-shot calibration:
      // a real weight moves the reading by thousands of counts.
      if (Math.abs(counts) < 100) {
        setCalResult(
          'The reading barely moved. Is the weight actually hanging, and did you tare before putting it on?',
        );
        return;
      }

      const points = [...finger.calibrationPoints, { kg, counts, at: new Date().toISOString() }];
      const next = fitCalibration(points);
      if (!next) {
        setCalResult('Those points do not make a line.');
        return;
      }
      finger.addCalibrationPoint({ kg, counts, at: new Date().toISOString() });
      await activeSource()?.setFactor(next.countsPerKg);
      setCalWeight('');
      setCalResult(
        `calibrated · ${next.countsPerKg.toFixed(0)} counts per kg · ` +
          `${(1 / next.countsPerKg).toFixed(4)} kg per count`,
      );
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

        {/* The same list the session gate shows, so there is one way to pick a
            board rather than two that drift apart. */}
        <div className="mt-4">
          <DevicePicker />
        </div>

        {connected && (
          <div className="mt-4 flex gap-3">
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
            <li>3 · type that weight here and add it as a point.</li>
            <li>4 · repeat with heavier weights, as far up as you can reach.</li>
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
              onClick={addPoint}
              disabled={calibrating}
              className="border border-line px-6 text-sm lowercase text-ink hover:bg-surface disabled:text-line"
            >
              {calibrating ? '…' : 'add point'}
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

          {fit && (
            <div className="mt-6">
              <ul className="border-t border-line-soft">
                {finger.calibrationPoints.map((point, i) => {
                  const residual = fit.residualsPct[i] ?? 0;
                  return (
                    <li
                      key={`${point.kg}-${point.at}`}
                      className="flex items-center justify-between border-b border-line-soft py-2.5"
                    >
                      <span className="text-sm tabular-nums lowercase">
                        {point.kg.toFixed(1)} kg
                      </span>
                      <span className="flex items-center gap-4">
                        <span
                          className={`text-xs tabular-nums ${
                            Math.abs(residual) > 2 ? 'text-clay' : 'text-ink-soft'
                          }`}
                        >
                          {residual >= 0 ? '+' : ''}
                          {residual.toFixed(2)}%
                        </span>
                        <button
                          onClick={() => finger.removeCalibrationPoint(i)}
                          className="text-ink-soft hover:text-clay"
                          aria-label={`Remove the ${point.kg} kg point`}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-3 text-xs lowercase tabular-nums text-ink-soft">
                {fit.countsPerKg.toFixed(0)} counts per kg · {fit.points} point
                {fit.points === 1 ? '' : 's'} · worst {fit.worstResidualPct.toFixed(2)}% ·{' '}
                <span
                  className={
                    fitQuality(fit) === 'suspect' ? 'text-clay' : 'text-pine-deep'
                  }
                >
                  {fitQuality(fit)}
                </span>
              </p>

              {coverage && (
                <p className="measure mt-3 text-xs leading-relaxed text-clay">{coverage}</p>
              )}

              <button
                onClick={() => void finger.clearCalibrationPoints()}
                className="mt-4 text-xs lowercase text-ink-soft hover:text-clay"
              >
                clear all points
              </button>
            </div>
          )}

          <p className="measure mt-4 text-xs leading-relaxed text-ink-soft">
            More points do not make the number better — a bridge is linear, so one weight and a
            tare already fix the line. What they give you is evidence: a residual column that
            agrees to within a percent says the cell and your weights are both honest. What they
            cannot give you is anything about loads heavier than your heaviest weight.
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
