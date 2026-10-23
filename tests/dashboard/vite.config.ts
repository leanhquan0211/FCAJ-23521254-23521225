import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5174, strictPort: true, proxy: { '/runner': { target: 'http://127.0.0.1:3100', changeOrigin: true, rewrite: path => path.replace(/^\/runner/, '') } } },
  preview: { host: '127.0.0.1', port: 5174, strictPort: true, proxy: { '/runner': { target: 'http://127.0.0.1:3100', changeOrigin: true, rewrite: path => path.replace(/^\/runner/, '') } } },
})
