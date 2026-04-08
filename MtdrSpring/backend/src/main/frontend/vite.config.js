import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/auth':      'http://localhost:8080',
      '/employees': 'http://localhost:8080',
      '/projects':  'http://localhost:8080',
      '/sprints':   'http://localhost:8080',
      '/tasks':     'http://localhost:8080',
      '/comments':  'http://localhost:8080',
      '/teams':     'http://localhost:8080',
    },
  },
})
