import type { HandIndicators } from '../finger/summary';
import { executionScore, scoreLabel } from '../finger/summary';

/**
 * The numbers a hang session produced, laid out per hand.
 *
 * Two hands side by side rather than averaged, because the protocol treats
 * them as separate limbs and an average would hide the asymmetry that is the
 * interesting part.
 */
export function HangIndicators({ indicators }: { indicators: HandIndicators[] }) {
  if (indicators.length === 0) return null;

  const score = executionScore(indicators);
  const rows: Array<[string, (h: HandIndicators) => string]> = [
    ['time in band', (h) => `${Math.round(h.inZoneSec)}s`],
    ['time in band', (h) => `${Math.round(h.inZoneFraction * 100)}%`],
    ['avg force', (h) => `${h.meanKg.toFixed(1)} kg`],
    [
      'avg of max',
      (h) => (h.meanOfMax === null ? '—' : `${Math.round(h.meanOfMax * 100)}%`),
    ],
    ['peak', (h) => `${h.peakKg.toFixed(1)} kg`],
    ['work', (h) => `${Math.round(h.impulseKgS)} kg·s`],
  ];

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-baseline justify-between border-b border-line-soft pb-3">
        <span className="text-sm lowercase text-ink-soft">execution</span>
        <span className="flex items-baseline gap-2">
          <span className="display text-2xl tabular-nums leading-none">
            {score.toFixed(1)}
          </span>
          <span className="text-xs lowercase text-ink-soft">{scoreLabel(score)}</span>
        </span>
      </div>

      {/* A hairline meter rather than a filled bar: five segments, lit as far
          as the score reaches. */}
      <div className="mt-3 flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-0.5 flex-1"
            style={{
              backgroundColor:
                score >= i + 1
                  ? 'var(--color-pine)'
                  : score > i
                    ? 'var(--color-pine-deep)'
                    : 'var(--color-line)',
              opacity: score > i && score < i + 1 ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="text-[11px] lowercase text-ink-soft">
            <th className="pb-2 text-left font-normal" />
            {indicators.map((h) => (
              <th key={h.hand} className="pb-2 text-right font-normal">
                {h.hand}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={`${label}-${i}`} className="border-t border-line-soft">
              <td className="py-2.5 text-left text-xs lowercase text-ink-soft">{label}</td>
              {indicators.map((h) => (
                <td key={h.hand} className="py-2.5 text-right tabular-nums">
                  {value(h)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
