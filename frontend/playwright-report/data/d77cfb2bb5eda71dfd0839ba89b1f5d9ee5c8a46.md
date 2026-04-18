# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: knowledge-qa.spec.ts >> session badge appears in header
- Location: tests/e2e/knowledge-qa.spec.ts:12:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('session-badge')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('session-badge')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e6]: Synapse
          - navigation "App navigation" [ref=e7]:
            - generic [ref=e8]: /
            - generic [ref=e9]: Knowledge Q&A
        - generic [ref=e10]:
          - generic [ref=e15]: Connected
          - generic [ref=e16]: AI
    - main [ref=e17]:
      - generic [ref=e18]:
        - complementary "Document drawer" [ref=e19]:
          - generic:
            - button "Expand sidebar":
              - img
            - button "New chat":
              - img
          - generic [ref=e20]:
            - generic [ref=e21]:
              - button "Collapse sidebar" [ref=e22] [cursor=pointer]:
                - img [ref=e23]
              - button "New chat" [ref=e24] [cursor=pointer]:
                - img [ref=e25]
            - generic [ref=e29]:
              - button "Sessions" [ref=e30] [cursor=pointer]:
                - img [ref=e31]
                - generic [ref=e35]: Sessions
              - button "Docs" [ref=e36] [cursor=pointer]:
                - img [ref=e37]
                - generic [ref=e41]: Docs
              - button "Sources" [ref=e42] [cursor=pointer]:
                - img [ref=e43]
                - generic [ref=e45]: Sources
            - generic [ref=e47]:
              - paragraph [ref=e48]: 8 sessions
              - button "How does the A2UI protocol handle streaming? 3d ago · 1 turn Delete session" [ref=e49] [cursor=pointer]:
                - img [ref=e51]
                - generic [ref=e53]:
                  - paragraph [ref=e54]: How does the A2UI protocol handle streaming?
                  - generic [ref=e55]:
                    - generic [ref=e56]: 3d ago
                    - generic [ref=e57]: · 1 turn
                - button "Delete session" [ref=e58]:
                  - img [ref=e59]
              - button "Summarize the latest architecture decisions 3d ago · 1 turn Delete session" [ref=e62] [cursor=pointer]:
                - img [ref=e64]
                - generic [ref=e66]:
                  - paragraph [ref=e67]: Summarize the latest architecture decisions
                  - generic [ref=e68]:
                    - generic [ref=e69]: 3d ago
                    - generic [ref=e70]: · 1 turn
                - button "Delete session" [ref=e71]:
                  - img [ref=e72]
              - button "Summarize the latest architecture decisions 3d ago · 1 turn Delete session" [ref=e75] [cursor=pointer]:
                - img [ref=e77]
                - generic [ref=e79]:
                  - paragraph [ref=e80]: Summarize the latest architecture decisions
                  - generic [ref=e81]:
                    - generic [ref=e82]: 3d ago
                    - generic [ref=e83]: · 1 turn
                - button "Delete session" [ref=e84]:
                  - img [ref=e85]
              - button "How does the A2UI protocol handle streaming? 3d ago · 1 turn Delete session" [ref=e88] [cursor=pointer]:
                - img [ref=e90]
                - generic [ref=e92]:
                  - paragraph [ref=e93]: How does the A2UI protocol handle streaming?
                  - generic [ref=e94]:
                    - generic [ref=e95]: 3d ago
                    - generic [ref=e96]: · 1 turn
                - button "Delete session" [ref=e97]:
                  - img [ref=e98]
              - button "Summarize the latest architecture decisions 3d ago · 1 turn Delete session" [ref=e101] [cursor=pointer]:
                - img [ref=e103]
                - generic [ref=e105]:
                  - paragraph [ref=e106]: Summarize the latest architecture decisions
                  - generic [ref=e107]:
                    - generic [ref=e108]: 3d ago
                    - generic [ref=e109]: · 1 turn
                - button "Delete session" [ref=e110]:
                  - img [ref=e111]
              - button "What documents have been ingested into the knowledge base? 3d ago · 1 turn Delete session" [ref=e114] [cursor=pointer]:
                - img [ref=e116]
                - generic [ref=e118]:
                  - paragraph [ref=e119]: What documents have been ingested into the knowledge base?
                  - generic [ref=e120]:
                    - generic [ref=e121]: 3d ago
                    - generic [ref=e122]: · 1 turn
                - button "Delete session" [ref=e123]:
                  - img [ref=e124]
              - button "How does the A2UI protocol handle streaming? 3d ago · 1 turn Delete session" [ref=e127] [cursor=pointer]:
                - img [ref=e129]
                - generic [ref=e131]:
                  - paragraph [ref=e132]: How does the A2UI protocol handle streaming?
                  - generic [ref=e133]:
                    - generic [ref=e134]: 3d ago
                    - generic [ref=e135]: · 1 turn
                - button "Delete session" [ref=e136]:
                  - img [ref=e137]
              - button "Summarize the latest architecture decisions 3d ago · 1 turn Delete session" [ref=e140] [cursor=pointer]:
                - img [ref=e142]
                - generic [ref=e144]:
                  - paragraph [ref=e145]: Summarize the latest architecture decisions
                  - generic [ref=e146]:
                    - generic [ref=e147]: 3d ago
                    - generic [ref=e148]: · 1 turn
                - button "Delete session" [ref=e149]:
                  - img [ref=e150]
        - generic [ref=e154]:
          - generic [ref=e155]:
            - heading "Knowledge Q&A" [level=1] [ref=e157]
            - button "⌘K Actions" [ref=e159] [cursor=pointer]:
              - generic [ref=e160]: ⌘K
              - generic [ref=e161]: Actions
          - generic [ref=e162]:
            - textbox "Ask anything about your knowledge base…" [active] [ref=e163]
            - button "Ask" [disabled] [ref=e165]:
              - img [ref=e166]
              - generic [ref=e168]: Ask
            - paragraph: ⌘↵
  - button "Open Next.js Dev Tools" [ref=e179] [cursor=pointer]:
    - img [ref=e180]
  - alert [ref=e183]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.beforeEach(async ({ page }) => {
  4  |   await page.goto('/knowledge-qa');
  5  | });
  6  | 
  7  | test('empty state renders on first load', async ({ page }) => {
  8  |   // Wait past the session/hydration loading state
  9  |   await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: 5000 });
  10 | });
  11 | 
  12 | test('session badge appears in header', async ({ page }) => {
> 13 |   await expect(page.getByTestId('session-badge')).toBeVisible({ timeout: 5000 });
     |                                                   ^ Error: expect(locator).toBeVisible() failed
  14 | });
  15 | 
  16 | test('submit query shows turn view', async ({ page }) => {
  17 |   const input = page.getByRole('textbox');
  18 |   await input.fill('What is RAG?');
  19 |   await input.press('Enter');
  20 | 
  21 |   // TurnView should appear (skeleton or response)
  22 |   await expect(page.getByTestId('turn-view')).toBeVisible({ timeout: 15000 });
  23 | });
  24 | 
  25 | test('command palette opens with Cmd+K', async ({ page }) => {
  26 |   await page.keyboard.press('Meta+k');
  27 |   // Command palette should be visible — look for common palette text
  28 |   await expect(page.getByText(/new chat|upload|actions/i).first()).toBeVisible({ timeout: 3000 });
  29 | });
  30 | 
```