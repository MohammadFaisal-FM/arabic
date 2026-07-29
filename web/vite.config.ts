import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** GitHub Pages serves the app under /arabic/ — PWA start_url must match or install opens 404. */
const base = process.env.GITHUB_PAGES === 'true' ? '/arabic/' : '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Mohammad Faisal — Arabic',
        short_name: 'Arabic',
        description: 'Arabic course — lessons and lyrics library',
        theme_color: '#05060a',
        background_color: '#05060a',
        display: 'standalone',
        orientation: 'portrait',
        // Must be under /arabic/ on Pages — '/' hits the repo root and 404s when installed
        start_url: base,
        scope: base,
        id: base,
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,md,txt,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/lyrics-manifest\.json$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lyrics-manifest',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 },
            },
          },
          {
            urlPattern: /\/harf-manifest\.json$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'harf-manifest',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 },
            },
          },
          {
            urlPattern: /\/ism-manifest\.json$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ism-manifest',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 },
            },
          },
          {
            urlPattern: /\/fil-manifest\.json$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fil-manifest',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 },
            },
          },
          {
            urlPattern: /\/roots-manifest\.json$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'roots-manifest',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 },
            },
          },
          {
            urlPattern: /\/course-manifest\.json$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'course-manifest',
              expiration: { maxEntries: 1, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
});
