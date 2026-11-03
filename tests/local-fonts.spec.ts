import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('loads self-hosted Noto Sans SC and Inter without Google requests', async ({ page }, testInfo) => {
  const requests: string[] = [];
  const failedFonts: string[] = [];
  page.on('request', request => requests.push(request.url()));
  page.on('requestfailed', request => {
    if (request.resourceType() === 'font') failedFonts.push(request.url());
  });
  await page.route('**/api/data/*', route => route.fulfill({ json: { origin: 'example' } }));
  await page.goto('/#investment');
  await expect(page.getByRole('heading', { name: '触发 / 观察名单', exact: true })).toBeVisible();
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter(face => face.status === 'loaded').map(face => ({
      family: face.family, weight: face.weight, status: face.status, unicodeRange: face.unicodeRange,
    }));
  });
  expect(fonts.some(face => face.family.replaceAll('"', '') === 'Noto Sans SC')).toBe(true);
  expect(fonts.some(face => face.family.replaceAll('"', '') === 'Inter')).toBe(true);
  expect(requests.filter(url => /fonts\.(googleapis|gstatic)\.com/.test(url))).toEqual([]);
  const fontRequests = requests.filter(url => /\.woff2?(\?|$)/.test(url));
  expect(fontRequests.length).toBeGreaterThan(0);
  expect(fontRequests.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  expect(failedFonts).toEqual([]);
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("font-src 'self';");
  expect(csp).not.toMatch(/googleapis|gstatic/);
  const audit = JSON.stringify({ url: page.url(), fonts, fontRequests, failedFonts, googleRequests: requests.filter(url => /fonts\.(googleapis|gstatic)\.com/.test(url)) }, null, 2);
  await writeFile('test-results/font-audit.json', audit);
  await testInfo.attach('font-audit', { body: audit, contentType: 'application/json' });
});
