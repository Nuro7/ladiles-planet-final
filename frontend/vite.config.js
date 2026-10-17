import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import axios from 'axios'
import { URL } from 'url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'video-proxy',
      configureServer(server) {
        server.middlewares.use('/api/video', async (req, res) => {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const id = url.searchParams.get('id');
          if (!id) {
            res.statusCode = 400;
            res.end('Missing file id');
            return;
          }

          const driveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download`;

          res.setHeader('Access-Control-Allow-Origin', '*');
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