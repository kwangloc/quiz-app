import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use relative asset paths in production so Electron loadFile() can resolve them.
const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  base: isProd ? './' : '/'
})
