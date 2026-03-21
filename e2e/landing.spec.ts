import { test, expect } from '@playwright/test';

test.describe('pixdrift.com', () => {
  test('Landing page loads and shows hero', async ({ page }) => {
    await page.goto('https://pixdrift.com');
    await expect(page).toHaveTitle(/pixdrift/i);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('Navigation links work', async ({ page }) => {
    await page.goto('https://pixdrift.com');
    // Kolla att changelog-länk fungerar om den finns
    const changelogLink = page.locator('a[href*="changelog"]').first();
    if (await changelogLink.isVisible()) {
      await changelogLink.click();
      await expect(page).toHaveURL(/changelog/);
    }
  });

  test('Mobile hamburger menu works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('https://pixdrift.com');
    const hamburger = page.locator('button[aria-label*="meny"], .hamburger, #hamburger, [class*="hamburger"], [class*="menu-toggle"]').first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      // Drawer ska vara synlig
      const drawer = page.locator('.nav-drawer, .mobile-menu, nav.open, [class*="drawer"], [class*="mobile"]').first();
      await expect(drawer).toBeVisible();
    }
  });

  test('API health check', async ({ request }) => {
    const response = await request.get('https://api.bc.pixdrift.com/health');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data).toHaveProperty('timestamp');
  });

  test('Page has meta description', async ({ page }) => {
    await page.goto('https://pixdrift.com');
    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDesc).toBeTruthy();
    expect(metaDesc!.length).toBeGreaterThan(10);
  });

  test('Page loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('https://pixdrift.com', { waitUntil: 'domcontentloaded' });
    const ms = Date.now() - start;
    console.log(`Page load: ${ms}ms`);
    expect(ms).toBeLessThan(3000);
  });
});
