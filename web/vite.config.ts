import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/najdi-arabic/' : '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Mohammad Faisal — Najdi Arabic',
        short_name: 'Najdi',
        description: 'Mohammad Faisal’s Najdi Arabic course — drills, tracker, lyrics, passages',
        theme_color: '#1a4d3e',
        background_color: '#0f1419',
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
            urlPattern: /^https:\/\/cursor\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
