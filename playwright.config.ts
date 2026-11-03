import { defineConfig } from '@playwright/test';

const preview = process.env.PLAYWRIGHT_PREVIEW === '1';
const baseURL = preview ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './tests',
  use: { baseURL, viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 },
  webServer: { command: preview ? 'npm run preview -- --port 4173 --strictPort' : 'npm run dev -- --port 5173', url: baseURL, reuseExistingServer: !preview },
});
