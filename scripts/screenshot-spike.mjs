import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'docs', 'm0-screenshots');

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: [
    '--enable-webgl',
    '--enable-webgl2',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
  ],
});

const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });

const messages = [];
page.on('console', msg => messages.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => messages.push(`[pageerror] ${err.message}`));

const url = process.argv[2] ?? 'http://localhost:5174/spike/sphere/';
const out = process.argv[3] ?? join(OUT_DIR, 'sphere.png');

await page.goto(url, { waitUntil: 'networkidle' });

// Check WebGL support
const webglInfo = await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return { supported: false };
  const dbgInfo = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    supported: true,
    renderer: dbgInfo ? gl.getParameter(dbgInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
    vendor: dbgInfo ? gl.getParameter(dbgInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
  };
});
console.log('WebGL info:', JSON.stringify(webglInfo));

await page.waitForTimeout(3000);

if (messages.length) {
  console.log('\nConsole/errors:');
  messages.forEach(m => console.log(' ', m));
}

await page.screenshot({ path: out, fullPage: false });
console.log(`\nScreenshot saved: ${out}`);

await browser.close();
