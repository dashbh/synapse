import { test, expect } from '@playwright/test';
import { deleteTestSession } from './helpers/cleanup';

test.beforeEach(async ({ page }) => {
  await page.goto('/knowledge-qa');
});

test.afterEach(async ({ page }) => {
  await deleteTestSession(page);
});

test('session badge shows a session ID on load', async ({ page }) => {
  const badge = page.getByTestId('session-badge');
  await expect(badge).toBeVisible({ timeout: 10000 });
  // Badge shows truncated session ID starting with "sid:"
  await expect(badge).toContainText('sid:');
});

test('new chat via command palette creates fresh session', async ({ page }) => {
  // Wait for initial session to load
  const badge = page.getByTestId('session-badge');
  await expect(badge).toBeVisible({ timeout: 5000 });

  // Open command palette and click New Chat
  await page.keyboard.press('Meta+k');
  await page.getByText(/new chat/i).first().click();

  // Empty state should reappear and session badge remain
  await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('session-badge')).toBeVisible({ timeout: 5000 });
});

test('document drawer can be opened', async ({ page }) => {
  // If the sidebar is collapsed it shows an "Expand sidebar" button
  const expandBtn = page.getByRole('button', { name: /expand sidebar/i });
  if (await expandBtn.count() > 0) {
    await expandBtn.click();
  }
  // "Docs" tab is visible once the drawer is open
  await expect(page.getByText('Docs').first()).toBeVisible({ timeout: 3000 });
});
