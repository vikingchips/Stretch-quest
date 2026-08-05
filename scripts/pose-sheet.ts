// Dev-only: renders every animated pose at several camera angles into one
// PNG, so the figures can be judged by eye instead of by imagining numbers.
//   npx vite-node scripts/pose-sheet.ts
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import {
  BONES,
  applyFit,
  blend,
  fitTransform,
  groundY,
  place,
  projectSkeleton,
  type JointName,
} from '../src/anim/skeleton';
import { animationFor, ANIMATED_EXERCISE_IDS } from '../src/anim/poses';

const ANGLES = [0, 35, 80];
const SIZE = 110;
const H = Math.round(SIZE * 1.35);
const LABEL_W = 190;

// Mirrors PoseFigure: one transform for the whole cycle, plus the ground line.
function figure(id: string, azimuth: number, t: number): string {
  const anim = animationFor(id)!;
  const [a, b] = anim.keyframes;
  const camera = { azimuth, elevation: anim.bestElevation ?? 8 };
  const r = SIZE * 0.075;
  const ground = groundY(anim.keyframes, camera);
  const frames = anim.keyframes.map((k) => projectSkeleton(k, camera));
  const transform = fitTransform(
    frames.map((f) => [...Object.values(f), { x: 0, y: ground }]),
    SIZE,
    H,
    r + 3,
  );
  const joints = applyFit(projectSkeleton(blend(a, b, t), camera), transform);
  const groundLine = `<line x1="0" y1="${place({ x: 0, y: ground }, transform).y.toFixed(1)}" x2="${SIZE}" y2="${place({ x: 0, y: ground }, transform).y.toFixed(1)}" stroke="#d4cdc5" stroke-width="1"/>`;

  const bones = BONES.map(([from, to]) => {
    const p = joints[from as JointName];
    const q = joints[to as JointName];
    const near = (p.depth + q.depth) / 2 > 0;
    return `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}" stroke="${near ? '#3d5545' : '#5a7a6b'}" stroke-width="2.2" stroke-linecap="round"/>`;
  }).join('');

  const head = joints.head;
  return `${groundLine}${bones}<circle cx="${head.x.toFixed(1)}" cy="${head.y.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#3d5545" stroke-width="2.2"/>`;
}

const cellSpecs = [
  ...ANGLES.map((a) => [a, 0] as const),
  ...ANGLES.map((a) => [a, 1] as const),
];

const rows = ANIMATED_EXERCISE_IDS.map((id, row) => {
  const y = row * (H + 30) + 8;
  const cells = cellSpecs
    .map(([az, t], i) => {
      const x = LABEL_W + i * (SIZE + 14);
      return `<g transform="translate(${x},${y})">${figure(id, az, t)}<text x="${SIZE / 2}" y="${H + 12}" font-size="9" fill="#6b6560" text-anchor="middle">${az}° ${t ? 'end' : 'start'}</text></g>`;
    })
    .join('');
  return `<text x="8" y="${y + H / 2}" font-size="12" fill="#2e2c2a">${id}</text>${cells}<line x1="0" y1="${y + H + 20}" x2="${LABEL_W + 6 * (SIZE + 14)}" y2="${y + H + 20}" stroke="#e5dfd8"/>`;
}).join('');

const width = LABEL_W + 6 * (SIZE + 14) + 10;
const height = ANIMATED_EXERCISE_IDS.length * (H + 30) + 24;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#f5f0eb"/><style>text{font-family:sans-serif}</style>${rows}</svg>`;

writeFileSync('/tmp/pose-sheet.svg', svg);
await sharp(Buffer.from(svg)).png().toFile('/tmp/pose-sheet.png');
console.log(`${ANIMATED_EXERCISE_IDS.length} exercises rendered -> /tmp/pose-sheet.png`);
