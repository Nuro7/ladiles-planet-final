import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import axios from 'axios'
import { URL } from 'url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable tablet app. The service worker caches only the app shell:
    // every /api request (data, login, private media) always goes to the network.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // registered by src/pwa/PwaStatus.jsx (hourly update checks)
      includeManifestIcons: false, // already matched by workbox.globPatterns
      manifest: {
        id: '/studio',
        name: 'Ladies Planet Studio',
        short_name: 'LP Studio',
        description: 'Ladies Planet bridal creation studio.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#4A0008',
        background_color: '#4A0008',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // iPad fetches its splash screens itself; no need to precache them.
        globIgnores: ['splash/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api(\/|$)/],
        cleanupOutdatedCaches: true,
        // New deploys take over open windows straight away.
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-font-styles' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-font-files',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
    {
      name: 'video-proxy',
      configureServer(server) {
        server.middlewares.use('/api/video', async (req, res) => {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const id = url.searchParams.get('id');
          const allowed = new Set(['1eF-lRp7i1bfLAUXSus89I_AkwUEUifD1','1pgD5n8c-WMb1ujBrTsanncQaTPzY8Ifk','1L582RHeSPVYg13LrGS149e-rpU5LvAEk','1dOInq0yUq9TOnny82NWNztNwVuy6KOrW','14pV_NRMlsjBB_QSG32QUGSeTd9iv4Td-','17engzF5_ScEQuvNWi5lApGletLONR19t']);
          if (!['GET','HEAD'].includes(req.method) || !allowed.has(id)) { res.statusCode = 404; res.end(); return; }
          if (!id) {
            res.statusCode = 400;
            res.end('Missing file id');
            return;
          }

          const driveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download`;

          res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }

          const headers = {};
          if (req.headers.range) {
            headers['range'] = req.headers.range;
          }

          try {
            const response = await axios({
              method: 'get',
              url: driveUrl,
              headers: headers,
              responseType: 'stream',
              timeout: 15000,
              maxRedirects: 0,
              validateStatus: () => true,
            });

            res.statusCode = response.status;

            const forwardHeaders = [
              'content-range',
              'accept-ranges',
              'content-length',
              'content-type',
            ];

            forwardHeaders.forEach((header) => {
              const value = response.headers[header];
              if (value) {
                res.setHeader(header, value);
              }
            });

            response.data.pipe(res);
          } catch (error) {
            console.error('Error proxying Google Drive video:', error);
            res.statusCode = 500;
            res.end('Error fetching video');
          }
        });
      }
    }
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split heavy libraries into cacheable vendor chunks. Three.js is only
        // pulled by the lazily-loaded 3D atelier, so it stays out of the
        // initial download entirely.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/three|@react-three|maath|meshline/.test(id)) return 'three';
          if (/gsap/.test(id)) return 'gsap';
          if (/framer-motion|motion-dom|motion-utils/.test(id)) return 'motion';
          if (/react-dom|react-router|scheduler|\breact\b/.test(id)) return 'react';
        },
      },
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
      }
    }
  }
})
