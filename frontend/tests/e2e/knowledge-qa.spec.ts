import { test, expect } from '@playwright/test';
import { deleteTestSession } from './helpers/cleanup';

test.beforeEach(async ({ page }) => {
  await page.goto('/knowledge-qa');
});

test.afterEach(async ({ page }) => {
  await deleteTestSession(page);
});

test('empty state renders on first load', async ({ page }) => {
  // Session fetch + hydration in mock mode takes ~5s — wait generously
  await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: 10000 });
});

test('session badge appears in header', async ({ page }) => {
  await expect(page.getByTestId('session-badge')).toBeVisible({ timeout: 10000 });
});

test('submit query shows turn view', async ({ page }) => {
  // Wait for session to load before submitting (mock takes ~5s)
  await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: 10000 });

  const input = page.getByRole('textbox');
  await input.fill('What is RAG?');
  // Submit via the "Ask" button — keyboard shortcut is Cmd+Enter, not plain Enter
  await page.getByRole('button', { name: /ask/i }).click();

  // TurnView (skeleton or response) should appear
  await expect(page.getByTestId('turn-view')).toBeVisible({ timeout: 15000 });
});

test('command palette opens with Cmd+K', async ({ page }) => {
  await page.keyboard.press('Meta+k');
  // Command palette should be visible — look for common palette text
  await expect(page.getByText(/new chat|upload|actions/i).first()).toBeVisible({ timeout: 3000 });
});
