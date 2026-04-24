import { Page } from '@playwright/test';

/**
 * Reads the current session ID from the header badge and deletes it via the API.
 * Call this in test.afterEach to prevent test runs from polluting the database.
 */
export async function deleteTestSession(page: Page) {
  try {
    const badge = page.getByTestId('session-badge');
    const visible = await badge.isVisible();
    if (!visible) return;

    const text = await badge.textContent();
    // Badge shows "sid:<first-8-chars>" — extract just those 8 chars
    const shortId = text?.replace('sid:', '').trim();
    if (!shortId) return;

    // The full session UUID is in the title attribute on the badge button
    const fullId = await badge.getAttribute('title');
    const uuid = fullId?.match(/([0-9a-f-]{36})/i)?.[1];
    if (!uuid) return;

    await page.request.delete(`/api/sessions/${uuid}`);
  } catch {
    // Best-effort — never fail a test due to cleanup
  }
}
