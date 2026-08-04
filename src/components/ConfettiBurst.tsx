import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface Props {
  /** 'big' for session completion, 'mini' for smaller wins. */
  variant?: 'big' | 'mini';
}

export function fireConfetti(variant: 'big' | 'mini' = 'big'): void {
  if (variant === 'mini') {
    confetti({ particleCount: 40, spread: 55, origin: { y: 0.7 } });
    return;
  }
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.65 } });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } }), 200);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } }), 350);
}

/** Fires once on mount — drop into any celebratory screen. */
export function ConfettiBurst({ variant = 'big' }: Props) {
  useEffect(() => {
    fireConfetti(variant);
  }, [variant]);
  return null;
}
