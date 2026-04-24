import { test, expect } from '@playwright/test';

test('home redirects to knowledge-qa', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/knowledge-qa/);
});

test('knowledge-qa page has query input', async ({ page }) => {
  await page.goto('/knowledge-qa');
  await expect(page.getByRole('textbox')).toBeVisible();
});

test('page title is set', async ({ page }) => {
  await page.goto('/knowledge-qa');
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});
