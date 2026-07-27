import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/arabic/' : '/',
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
        start_url: '/',
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
