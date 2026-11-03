import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localDataPlugin } from './server/data-plugin'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss(), localDataPlugin(fileURLToPath(new URL('.', import.meta.url)))],
  server: { host: '127.0.0.1', fs: { deny: ['.env', '.env.*', '**/.git/**', '**/data/local/**', '**/.mcp.json'] } },
  preview: { host: '127.0.0.1' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'] },
})
