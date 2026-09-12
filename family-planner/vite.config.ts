import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Assets are referenced relatively by default, which keeps `npm run preview`
 * and a plain file server working. A host that serves the app from a
 * subdirectory (GitHub Pages serves a project at /<repo>/) sets an absolute
 * BASE_PATH instead, because the service worker and manifest need to know the
 * real scope they are being served under.
 */
const base = process.env.BASE_PATH || './'

export default defineConfig({
  base,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Covers the icons and favicon in public/ as well as the built assets.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The planner is offline-first; never fall back to the network for navigations.
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Family Planner',
        short_name: 'Planner',
        description:
          'Wall-mounted family planner: calendar, chores, meals and photos at a glance.',
        // standalone keeps Safari chrome off the screen once added to the Home Screen.
        display: 'standalone',
        orientation: 'landscape',
        start_url: base,
        scope: base,
        background_color: '#0b1020',
        theme_color: '#0b1020',
        categories: ['productivity', 'lifestyle'],
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          {
            src: `${base}icons/maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
