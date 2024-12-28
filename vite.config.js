import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  optimizeDeps: {
    include: ['mapbox-gl', '@mapbox/mapbox-gl-draw']
  },
  server: {
    host: true,
    port: 3000
  }
}) 