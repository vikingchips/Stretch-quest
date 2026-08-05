import { useEffect, useRef } from 'react';
import { classify } from '../finger/engine';
import { onForceSample } from '../finger/sourceManager';

/**
 * The live force trace, with the target band behind it.
 *
 * Nothing here goes through React state. Samples arrive eighty times a second
 * and a rAF loop writes the path's `d` attribute straight onto the DOM node —
 * one animation frame's work, no reconciliation, no garbage. The big number
 * beside it is written the same way, through a text node ref.
 *
 * The band is the point of the whole screen: the coaching is "be inside it",
 * so it is drawn as a filled region rather than a pair of lines, and the
 * trace is coloured by where it currently sits relative to it.
 */

const CAPACITY = 1600; // 20 s at 80 Hz, with room to spare

interface Props {
  targetLoKg: number;
  targetHiKg: number;
  /** How much time the graph spans. Match it to the hang so the trace sweeps
   *  once, left to right, instead of scrolling under itself. */
  windowMs?: number;
  /** Fixes the vertical scale. Defaults to a little above the band. */
  ceilingKg?: number;
  height?: number;
  /** Show the coaching line when the pull sits outside the band. */
  coach?: boolean;
}

const ZONE_COLOR = {
  under: 'var(--color-fjord)',
  in: 'var(--color-pine)',
  over: 'var(--color-clay)',
} as const;

export function ForceGraph({
  targetLoKg,
  targetHiKg,
  windowMs = 12_000,
  ceilingKg,
  height = 180,
  coach = true,
}: Props) {
  const pathRef = useRef<SVGPathElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const coachRef = useRef<HTMLParagraphElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Ring buffer. Two typed arrays rather than an array of objects: this is
  // written eighty times a second for as long as the screen is open.
  const times = useRef(new Float64Array(CAPACITY));
  const values = useRef(new Float32Array(CAPACITY));
  const count = useRef(0);
  const head = useRef(0);
  const outsideSince = useRef<number | null>(null);
  /** Timestamp of the first sample, so the trace starts at the left edge. */
  const startT = useRef<number | null>(null);

  // A little headroom above the ceiling so a pull at full value still draws
  // inside the frame instead of flattening against its edge.
  const ceiling = Math.max((ceilingKg ?? targetHiKg * 1.4) * 1.08, 5);

  useEffect(() => {
    const off = onForceSample((sample) => {
      startT.current ??= sample.t;
      times.current[head.current] = sample.t;
      values.current[head.current] = sample.kg;
      head.current = (head.current + 1) % CAPACITY;
      if (count.current < CAPACITY) count.current++;
    });

    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const path = pathRef.current;
      const box = boxRef.current;
      if (!path || !box || count.current === 0) return;

      const width = box.clientWidth || 320;
      const newestIndex = (head.current - 1 + CAPACITY) % CAPACITY;
      const newestT = times.current[newestIndex];
      const newestKg = values.current[newestIndex];

      // Anchored at the first sample, so a ten-second hang sweeps once across
      // the width rather than piling up against the right edge. Once the
      // window is full it scrolls, which only happens if a hang overruns.
      const base = startT.current ?? newestT;
      const overrun = Math.max(0, newestT - base - windowMs);
      let d = '';
      let drawn = 0;
      for (let i = count.current - 1; i >= 0; i--) {
        const index = (newestIndex - i + CAPACITY) % CAPACITY;
        const elapsed = times.current[index] - base - overrun;
        if (elapsed < 0) continue;
        const x = width * Math.min(1, elapsed / windowMs);
        const y = height * (1 - Math.max(0, Math.min(1, values.current[index] / ceiling)));
        d += `${drawn === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
        drawn++;
      }
      path.setAttribute('d', d);

      const zone = classify(newestKg, targetLoKg, targetHiKg);
      path.setAttribute('stroke', ZONE_COLOR[zone]);

      if (valueRef.current) {
        valueRef.current.textContent = newestKg.toFixed(1);
        valueRef.current.style.color =
          zone === 'in' ? 'var(--color-pine-deep)' : 'var(--color-ink)';
      }

      if (coachRef.current) {
        if (zone === 'in') outsideSince.current = null;
        else outsideSince.current ??= newestT;
        const drifted =
          outsideSince.current !== null && newestT - outsideSince.current > 1500;
        coachRef.current.style.opacity = drifted ? '1' : '0';
        coachRef.current.textContent =
          zone === 'over' ? 'ease off toward the middle of the band' : 'aim for the middle of the band';
      }
    };
    frame = requestAnimationFrame(draw);

    return () => {
      off();
      cancelAnimationFrame(frame);
    };
  }, [targetLoKg, targetHiKg, ceiling, height, windowMs]);

  const bandTop = height * (1 - Math.min(1, targetHiKg / ceiling));
  const bandBottom = height * (1 - Math.min(1, targetLoKg / ceiling));

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-center gap-2">
        <span ref={valueRef} className="display text-6xl tabular-nums leading-none">
          0.0
        </span>
        <span className="text-sm lowercase text-ink-soft">kg</span>
      </div>

      <div ref={boxRef} className="mt-6 w-full" style={{ height }}>
        <svg
          width="100%"
          height={height}
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="0"
            y={bandTop}
            width="100%"
            height={Math.max(1, bandBottom - bandTop)}
            fill="var(--color-line-soft)"
          />
          <line
            x1="0"
            y1={height - 0.5}
            x2="100%"
            y2={height - 0.5}
            stroke="var(--color-line)"
            strokeWidth={1}
          />
          <path
            ref={pathRef}
            d=""
            stroke="var(--color-pine)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="mt-2 flex justify-between text-[11px] tabular-nums lowercase text-ink-soft">
        <span>target {targetLoKg.toFixed(1)}–{targetHiKg.toFixed(1)} kg</span>
        <span>{(windowMs / 1000).toFixed(0)}s</span>
      </div>

      {coach && (
        <p
          ref={coachRef}
          className="mt-3 text-center text-xs lowercase text-ink-soft transition-opacity duration-700 ease-in-out"
          style={{ opacity: 0 }}
        >
          aim for the middle of the band
        </p>
      )}
    </div>
  );
}
