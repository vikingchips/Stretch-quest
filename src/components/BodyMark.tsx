import { useMemo } from 'react';
import type { BodyArea } from '../types';

/**
 * An abstract figure that dims to wool gray everywhere except the region the
 * stretch actually targets. Replaces the old per-exercise pictogram: it says
 * something true about the exercise instead of just filling the slot.
 */

type Segment =
  | 'head'
  | 'neck'
  | 'shoulders'
  | 'torso'
  | 'upperArms'
  | 'forearms'
  | 'hands'
  | 'hips'
  | 'thighs'
  | 'shins'
  | 'feet';

const AREA_SEGMENTS: Record<BodyArea, Segment[]> = {
  neck: ['head', 'neck'],
  shoulders: ['shoulders', 'upperArms'],
  chest: ['shoulders', 'torso'],
  back: ['shoulders', 'torso'],
  arms: ['upperArms', 'forearms'],
  wrists: ['forearms', 'hands'],
  fingers: ['hands'],
  core: ['torso'],
  hips: ['hips'],
  glutes: ['hips'],
  adductors: ['hips', 'thighs'],
  hamstrings: ['thighs'],
  quads: ['thighs'],
  calves: ['shins'],
  ankles: ['shins', 'feet'],
  feet: ['feet'],
};

// Stroke weights are tuned per size so the figure keeps the same optical
// weight whether it's a 30px list mark or the 128px session illustration.
const SIZES = {
  sm: { width: 30, base: 1.6, active: 2.8 },
  lg: { width: 52, base: 1.4, active: 2.4 },
  xl: { width: 128, base: 1, active: 1.9 },
} as const;

interface Props {
  areas: BodyArea[];
  size?: keyof typeof SIZES;
}

export function BodyMark({ areas, size = 'sm' }: Props) {
  const active = useMemo(() => {
    const set = new Set<Segment>();
    for (const area of areas) for (const seg of AREA_SEGMENTS[area]) set.add(seg);
    return set;
  }, [areas]);

  const { width, base, active: activeWidth } = SIZES[size];
  const on = (seg: Segment) => active.has(seg);

  // Highlighted strokes sit a touch heavier so the region reads at 30px too.
  const props = (seg: Segment) => ({
    stroke: on(seg) ? 'var(--color-pine)' : 'var(--color-line)',
    strokeWidth: on(seg) ? activeWidth : base,
  });

  return (
    <svg
      width={width}
      height={width * 1.5}
      viewBox="0 0 48 72"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="24" cy="10" r="6" {...props('head')} />
      <path d="M24 16v4" {...props('neck')} />
      <path d="M13 21h22" {...props('shoulders')} />
      <path d="M24 21v19" {...props('torso')} />
      <path d="M13 21 8 31M35 21l5 10" {...props('upperArms')} />
      <path d="M8 31l2 10M40 31l-2 10" {...props('forearms')} />
      <circle cx="10" cy="43.5" r="1.9" {...props('hands')} />
      <circle cx="38" cy="43.5" r="1.9" {...props('hands')} />
      <path d="M16 40h16" {...props('hips')} />
      <path d="M18 40l-2 14M30 40l2 14" {...props('thighs')} />
      <path d="M16 54l1 12M32 54l-1 12" {...props('shins')} />
      <path d="M17 66h-6M31 66h6" {...props('feet')} />
    </svg>
  );
}
