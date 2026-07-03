import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import type { Plugin } from 'vite'

/**
 * 本地开发代理插件
 * 模拟 Cloudflare Pages Function 的 /_proxy 行为
 * 解决本地开发时插件安装的 CORS 问题
 */
function localProxyPlugin(): Plugin {
  return {
    name: 'local-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/_proxy', async (req, res) => {
        // 处理 CORS preflight
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', '*')
          res.setHeader('Access-Control-Max-Age', '86400')
          res.end()
          return
        }

        try {
          // 当使用路径前缀挂载时，req.url 是去掉前缀后的部分（如 "?url=xxx"）
          const rawUrl = req.url?.startsWith('/') ? req.url : `/${req.url || ''}`
          const fullUrl = new URL(rawUrl, `http://${req.headers.host}`)
          const targetUrl = fullUrl.searchParams.get('url')

          if (!targetUrl) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(JSON.stringify({ error: 'Missing url parameter' }))
            return
          }

          // 解析自定义 headers
          let customHeaders: Record<string, string> = {}
          const headersParam = fullUrl.searchParams.get('headers')
          if (headersParam) {
            try { customHeaders = JSON.parse(headersParam) } catch {}
          }

          const headers: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...customHeaders,
          }

          // 读取请求体（用于 POST/PUT 等）
          let body: Buffer | undefined
          if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
            body = await new Promise<Buffer>((resolve) => {
              const chunks: Buffer[] = []
              req.on('data', (chunk: Buffer) => chunks.push(chunk))
              req.on('end', () => resolve(Buffer.concat(chunks)))
            })

            // 转发 content-type
            if (req.headers['content-type']) {
              headers['Content-Type'] = req.headers['content-type']
            }
          }

          const response = await fetch(targetUrl, {
            method: req.method || 'GET',
            headers,
            body,
            redirect: 'follow',
          })

          res.statusCode = response.status

          // 转发响应头（跳过问题头）
          const skipHeaders = new Set(['content-encoding', 'transfer-encoding', 'connection', 'keep-alive'])
          response.headers.forEach((value, key) => {
            if (!skipHeaders.has(key.toLowerCase())) {
              res.setHeader(key, value)
            }
          })
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', '*')

          // 流式写入响应体
          if (response.body) {
            const reader = response.body.getReader()
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              res.write(value)
            }
          }
          res.end()
        } catch (e: any) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    localProxyPlugin(),
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
