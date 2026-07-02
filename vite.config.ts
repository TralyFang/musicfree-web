import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/logo.png', 'icons/svg/*.svg'],
      manifest: {
        name: 'MusicFree',
        short_name: 'MusicFree',
        description: '免费的音乐播放器',
        theme_color: '#7c3aed',
        background_color: '#0f0f14',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          {
            src: '/icons/logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // 音频资源缓存
            urlPattern: /\.(mp3|m4a|aac|ogg|flac|wav)(\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 天
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // 封面图片缓存
            urlPattern: /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'jotai'],
          plugins: ['cheerio', 'crypto-js', 'axios', 'dayjs', 'qs', 'he'],
        },
      },
    },
  },
})
