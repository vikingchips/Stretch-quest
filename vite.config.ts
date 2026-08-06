/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * The commit this bundle was built from, shown in Settings.
 *
 * A hardcoded version string cannot answer the only question anyone actually
 * asks it — "is this the new build, or is the service worker still serving
 * me the old one?" — so it is read from the build instead.
 */
function buildId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

// The site is served from https://<user>.github.io/<repo>/, so the base path
// must match the repo name. CI derives it from the repo and passes it in here;
// locally we serve from the root.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'StretchQuest',
        short_name: 'StretchQuest',
        description: 'Gamified stretching for climbers & runners',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f5f0eb',
        theme_color: '#f5f0eb',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
