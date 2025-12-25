import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [
          {
            // Cache Chibisafe images
            urlPattern: /^https?:\/\/.*(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'chibisafe-images',
              expiration: {
                maxEntries: 500, // Max 500 images
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200], // Cache successful responses
              },
            },
          },
        ],
      },
    }),
  ],
})
