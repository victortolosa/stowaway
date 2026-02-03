import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // Compression plugin for gzip
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240 // Only compress files larger than 10kb
    }),
    // Compression plugin for brotli
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240
    }),
    // Bundle analyzer (generates stats.html after build)
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true
    }),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Stowaway',
        short_name: 'Stowaway',
        description: 'Personal Storage & Inventory Tracking Application',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },

        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    open: true,
    host: true, // Allow access from network IP addresses
    https: (fs.existsSync('./localhost-key.pem') && fs.existsSync('./localhost.pem')) ? {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    } : undefined,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core Firebase services
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/storage', 'firebase/auth'],
          // Heavy feature libraries - split into separate chunks
          'pdf-tools': ['jspdf'],
          'image-tools': ['html2canvas', 'browser-image-compression', 'react-image-crop'],
          'media-tools': ['html5-qrcode'],
          // UI libraries
          'ui-libs': ['framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          // Vendor chunk for other dependencies
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
