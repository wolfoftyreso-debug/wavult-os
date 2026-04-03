import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'https://19225d08.wavult-os.pages.dev';
const OUT = '/mnt/c/Users/erik/Desktop/Wavult/ux-audit/screenshots';
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { id: 'dashboard', path: '/' },
  { id: 'thailand', path: '/thailand' },
  { id: 'finance-flow', path: '/finance-flow' },
  { id: 'team', path: '/team' },
  { id: 'intelligence', path: '/intelligence' },
  { id: 'apifly', path: '/apifly' },
  { id: 'dissg', path: '/dissg' },
  { id: 'exports', path: '/exports' },
  { id: 'uapix', path: '/uapix' },
  { id: 'mlcs-platform', path: '/mlcs' },
  { id: 'infrastructure', path: '/infrastructure' },
  { id: 'quixzoom-app', path: '/quixzoom' },
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const results = [];

for (const route of ROUTES) {
  try {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000); // wait for animations
    
    const file = `${OUT}/${route.id}_latest.png`;
    await page.screenshot({ path: file, fullPage: false });
    
    // Check for animation classes
    const animClasses = await page.evaluate(() => {
      const els = document.querySelectorAll('[class*="wv-"]');
      return [...els].map(e => e.className).filter(Boolean).slice(0, 5);
    });
    
    // Check for illustrations
    const illust = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src*="brief-characters"]');
      return imgs.length;
    });
    
    results.push({ id: route.id, path: route.path, animations: animClasses.length, illustrations: illust, screenshot: file });
    console.log(`✅ ${route.id}: ${animClasses.length} animated els, ${illust} illustrations`);
  } catch(e) {
    results.push({ id: route.id, error: e.message });
    console.log(`❌ ${route.id}: ${e.message}`);
  }
}

await browser.close();

writeFileSync(`${OUT}/animation-report.json`, JSON.stringify(results, null, 2));
console.log(`\nReport: ${OUT}/animation-report.json`);
