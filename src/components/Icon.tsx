import type { ReactNode } from 'react';

/**
 * Hairline line-art icon set. Everything is drawn on a 24x24 grid with a
 * single stroke weight and no fills, so icons read as part of the type
 * rather than as decoration.
 */
export type IconName = keyof typeof PATHS;

const PATHS = {
  // ── Navigation & chrome ────────────────────────────────────────────────
  home: (
    <path d="M4 10.5 12 4.5l8 6V20H4Z" />
  ),
  routines: (
    <>
      <circle cx="5.5" cy="7" r="1.1" />
      <circle cx="5.5" cy="12" r="1.1" />
      <circle cx="5.5" cy="17" r="1.1" />
      <path d="M10 7h10M10 12h10M10 17h10" />
    </>
  ),
  stats: (
    <>
      <path d="M4 20h16" />
      <path d="M7.5 20v-5M12 20v-9M16.5 20v-3.5" />
    </>
  ),
  // An edge with four fingers over it. Abstract on purpose: a drawn hand
  // would be the only pictogram in the set.
  grip: (
    <>
      <path d="M4 13.5h16" />
      <path d="M7 13.5V8M11 13.5V6.5M15 13.5V7M18.5 13.5v-3" />
    </>
  ),
  awards: (
    <>
      <circle cx="12" cy="9.5" r="5" />
      <path d="M9 13.8 8 21l4-2.2 4 2.2-1-7.2" />
    </>
  ),
  friends: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3.2 3.2 0 0 1 0 4.6" />
      <path d="M17.5 15a5.5 5.5 0 0 1 3 4.5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8h16M4 16h16" />
      <circle cx="14.5" cy="8" r="2.1" />
      <circle cx="9.5" cy="16" r="2.1" />
    </>
  ),

  // ── Controls ───────────────────────────────────────────────────────────
  chevronRight: <path d="m10 6 6 6-6 6" />,
  chevronLeft: <path d="m14 6-6 6 6 6" />,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  play: <path d="M8.5 5.5 18 12l-9.5 6.5Z" />,
  pause: <path d="M9.5 5.5v13M14.5 5.5v13" />,
  prev: (
    <>
      <path d="M6 5.5v13" />
      <path d="M18 5.5 9.5 12 18 18.5Z" />
    </>
  ),
  next: (
    <>
      <path d="M18 5.5v13" />
      <path d="M6 5.5 14.5 12 6 18.5Z" />
    </>
  ),
  arrowUp: <path d="M12 19V6m0 0-5 5m5-5 5 5" />,
  arrowDown: <path d="M12 5v13m0 0 5-5m-5 5-5-5" />,
  check: <path d="m5 12.5 5 5 9-10" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m15.5 15.5 4.5 4.5" />
    </>
  ),
  trash: <path d="M6 7h12M9.5 7V4.5h5V7M7.6 7l.8 13h7.2l.8-13" />,
  pencil: <path d="M4 20l1-4.2L16.6 4.2a2 2 0 0 1 2.8 2.8L7.8 18.6Z" />,
  sound: (
    <>
      <path d="M5 9.5h3L12 6v12L8 14.5H5Z" />
      <path d="M15.5 9.5a4 4 0 0 1 0 5" />
    </>
  ),

  // ── Achievement emblems ────────────────────────────────────────────────
  // Deliberately abstract: a shared vocabulary of dots, rings, arcs and
  // polygons rather than fourteen little pictures.
  dot: <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />,
  ring: <circle cx="12" cy="12" r="6.4" />,
  ringDouble: (
    <>
      <circle cx="12" cy="12" r="6.8" />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  ringTriple: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="5.2" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
  // Seven ticks — one per day of the week.
  dotRow: <path d="M3.5 8v8M6.3 8v8M9.1 8v8M12 8v8M14.9 8v8M17.7 8v8M20.5 8v8" />,
  // A month of weeks: a ring broken into four arcs.
  arcs: <circle cx="12" cy="12" r="7.5" strokeDasharray="9.4 2.4" />,
  asterisk: <path d="M12 4v16M5 8l14 8M19 8 5 16" />,
  sunrise: (
    <>
      <path d="M4 17h16" />
      <path d="M7 17a5 5 0 0 1 10 0" />
      <path d="M12 4.5v2.5" />
    </>
  ),
  crescent: <path d="M16.5 5.5a7 7 0 1 0 2.2 10.4A7.5 7.5 0 0 1 16.5 5.5Z" />,
  zigzag: <path d="M4 18.5 8.5 12 12 15 16 7l3.5 4" />,
  chevrons: <path d="m6 7 5 5-5 5M13 7l5 5-5 5" />,
  grid: (
    <>
      <rect x="4.5" y="4.5" width="6" height="6" rx="0.6" />
      <rect x="13.5" y="4.5" width="6" height="6" rx="0.6" />
      <rect x="4.5" y="13.5" width="6" height="6" rx="0.6" />
      <rect x="13.5" y="13.5" width="6" height="6" rx="0.6" />
    </>
  ),
  venn: (
    <>
      <circle cx="9" cy="10" r="5" />
      <circle cx="15" cy="10" r="5" />
      <circle cx="12" cy="15" r="5" />
    </>
  ),
  diamond: <path d="M12 3.5 20 12l-8 8.5L4 12Z" />,
} satisfies Record<string, ReactNode>;

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, className, strokeWidth = 1.25 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
