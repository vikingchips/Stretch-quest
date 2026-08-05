import { useEffect, useRef, useState } from 'react';
import {
  BONES,
  blend,
  fit,
  projectSkeleton,
  type Camera,
  type JointName,
  type Projected,
  type Skeleton,
} from '../anim/skeleton';
import { animationFor } from '../anim/poses';

interface Props {
  exerciseId: string;
  size?: number;
  azimuth?: number;
  /** Freeze on the first keyframe. Also forced by prefers-reduced-motion. */
  still?: boolean;
}

const ELEVATION = 8;

/** Ease in and out of each end, so a stretch settles rather than snaps. */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Two tones only. A third, lighter tier made the far arm read as faded out
 * rather than behind — depth cueing should whisper, and a limb that has
 * nearly vanished is not whispering.
 */
function depthColor(depth: number, spread: number): string {
  const t = spread === 0 ? 0.5 : (depth + spread) / (spread * 2);
  return t < 0.42 ? 'var(--color-pine)' : 'var(--color-pine-deep)';
}

export function PoseFigure({ exerciseId, size = 128, azimuth, still }: Props) {
  const animation = animationFor(exerciseId);
  const [phase, setPhase] = useState(0);
  const frameRef = useRef<number>(0);

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const frozen = still || reduced || !animation;

  useEffect(() => {
    if (frozen || !animation) return;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const elapsed = (now - start) % animation.cycleMs;
      setPhase(elapsed / animation.cycleMs);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [frozen, animation]);

  if (!animation) return null;

  const [a, b] = animation.keyframes;
  // A cycle runs there and back, so the movement loops without a jump cut.
  const t = phase < 0.5 ? easeInOut(phase * 2) : easeInOut((1 - phase) * 2);
  const skeleton: Skeleton = frozen ? a : blend(a, b, t);

  const camera: Camera = {
    azimuth: azimuth ?? animation.bestAzimuth,
    elevation: animation.bestElevation ?? ELEVATION,
  };
  const height = size * 1.35;
  // Sized from the figure, not from the neck-to-head segment: that segment
  // foreshortens as the camera turns, which made the head balloon side-on
  // and vanish when the figure lies down.
  const headRadius = size * 0.075;
  // fit() only knows about joint positions, so without this the head circle
  // is drawn outside the box and clipped.
  const joints = fit(projectSkeleton(skeleton, camera), size, height, headRadius + 3);

  const depths = Object.values(joints).map((p: Projected) => p.depth);
  const spread = Math.max(...depths.map(Math.abs), 1);

  const head = joints.head;

  return (
    <svg
      width={size}
      height={height}
      viewBox={`0 0 ${size} ${height}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      {BONES.map(([from, to]) => {
        const p = joints[from as JointName];
        const q = joints[to as JointName];
        return (
          <line
            key={`${from}-${to}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke={depthColor((p.depth + q.depth) / 2, spread)}
            strokeWidth={size > 80 ? 2.4 : 1.9}
          />
        );
      })}
      <circle
        cx={head.x}
        cy={head.y}
        r={headRadius}
        stroke={depthColor(head.depth, spread)}
        strokeWidth={size > 80 ? 2.4 : 1.9}
      />
    </svg>
  );
}
