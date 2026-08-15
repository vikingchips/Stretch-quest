/**
 * Pixel rendering, kept deliberately small.
 *
 * The games draw at a low logical resolution and the browser scales them up
 * with smoothing off, which is the whole pixel-art trick. Sprites are rows of
 * characters mapped to palette colors — defined in code like everything else
 * in this repo, so there is no asset pipeline and nothing to load offline.
 */

export interface Palette {
  paper: string;
  surface: string;
  ink: string;
  inkSoft: string;
  line: string;
  lineSoft: string;
  pine: string;
  pineDeep: string;
  fjord: string;
  fjordDeep: string;
  clay: string;
  bark: string;
}

/** Matches the @theme tokens; the fallbacks only exist for non-browser runs. */
const TOKEN_FALLBACK: Palette = {
  paper: '#f4f1ea',
  surface: '#ece8df',
  ink: '#2b2b28',
  inkSoft: '#6b6a63',
  line: '#c9c4b8',
  lineSoft: '#dedacf',
  pine: '#4a6b57',
  pineDeep: '#33503f',
  fjord: '#5b7d8c',
  fjordDeep: '#3f5d6b',
  clay: '#a8654f',
  bark: '#6e5a49',
};

export function paletteFromTokens(): Palette {
  if (typeof document === 'undefined') return TOKEN_FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const value = style.getPropertyValue(name).trim();
    return value === '' ? fallback : value;
  };
  return {
    paper: read('--color-paper', TOKEN_FALLBACK.paper),
    surface: read('--color-surface', TOKEN_FALLBACK.surface),
    ink: read('--color-ink', TOKEN_FALLBACK.ink),
    inkSoft: read('--color-ink-soft', TOKEN_FALLBACK.inkSoft),
    line: read('--color-line', TOKEN_FALLBACK.line),
    lineSoft: read('--color-line-soft', TOKEN_FALLBACK.lineSoft),
    pine: read('--color-pine', TOKEN_FALLBACK.pine),
    pineDeep: read('--color-pine-deep', TOKEN_FALLBACK.pineDeep),
    fjord: read('--color-fjord', TOKEN_FALLBACK.fjord),
    fjordDeep: read('--color-fjord-deep', TOKEN_FALLBACK.fjordDeep),
    clay: read('--color-clay', TOKEN_FALLBACK.clay),
    bark: read('--color-bark', TOKEN_FALLBACK.bark),
  };
}

/**
 * Size a canvas for crisp pixels: internal resolution stays logical, CSS
 * scales it by a whole number so every logical pixel is a uniform square.
 */
export function fitPixelCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D {
  canvas.width = width;
  canvas.height = height;
  const available = canvas.parentElement?.clientWidth ?? 320;
  const scale = Math.max(2, Math.floor(available / width));
  canvas.style.width = `${width * scale}px`;
  canvas.style.height = `${height * scale}px`;
  canvas.style.imageRendering = 'pixelated';
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/**
 * Draw a character-grid sprite at (x, y), one character per logical pixel.
 * '.' and ' ' are transparent; anything else looks itself up in `colors`.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  colors: Record<string, string>,
  x: number,
  y: number,
): void {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      const color = colors[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
    }
  }
}

/** Deterministic 0..1 hash for scattering stars without storing them. */
export function hash2(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
