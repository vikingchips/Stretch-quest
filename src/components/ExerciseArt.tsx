import type { ExerciseArt as Art } from '../types';

interface Props {
  art: Art;
  size?: 'sm' | 'lg' | 'xl';
}

const SIZES = {
  sm: 'h-12 w-12 text-2xl rounded-xl',
  lg: 'h-20 w-20 text-4xl rounded-2xl',
  xl: 'h-40 w-40 text-8xl rounded-[2rem]',
};

export function ExerciseArt({ art, size = 'sm' }: Props) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${SIZES[size]}`}
      style={{ backgroundColor: `${art.accent}26` }}
    >
      <span role="img">{art.value}</span>
    </div>
  );
}
