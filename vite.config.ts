import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// JSX is compiled by the bundler with Preact's automatic runtime (see
// tsconfig.json), so no Preact preset dependency is needed.
export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'UteDesk',
        short_name: 'UteDesk',
        description: 'Size a job, check the takeoff, price an estimate and confirm a quote, on site and offline.',
        lang: 'en-NZ',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#1c2229',
        background_color: '#f1efea',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs is precached on first load. Nothing is fetched at runtime.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
