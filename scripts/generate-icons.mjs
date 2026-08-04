// One-off: renders public/icons/icon.svg to the PNG sizes the manifest needs.
// PNGs are committed, so CI never needs to run this. Requires: npm i -D sharp
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const svg = await readFile(path.join(dir, 'icon.svg'));

await sharp(svg).resize(192, 192).png().toFile(path.join(dir, 'icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(path.join(dir, 'icon-512.png'));

// Maskable: same art scaled to 80% inside a solid birch-white safe zone.
const inner = await sharp(svg).resize(410, 410).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#f5f0eb' },
})
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(path.join(dir, 'icon-maskable-512.png'));

console.log('Icons generated.');
