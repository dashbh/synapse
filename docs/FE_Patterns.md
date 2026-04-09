# Frontend Patterns & How-To Guides

**Last Updated:** April 7, 2026  
**Scope:** Step-by-step guides for common FE tasks  
**Audience:** Frontend developers (practical guide)

---

## Pattern: Add a New App

Want to add "ChatbotApp" alongside KnowledgeQAApp? Follow this pattern.

### Step 1: Create App Folder

```bash
mkdir -p frontend/src/apps/chatbot
touch frontend/src/apps/chatbot/index.ts
touch frontend/src/apps/chatbot/chatbot.tsx
touch frontend/src/apps/chatbot/config.ts
touch frontend/src/apps/chatbot/types.ts
mkdir -p frontend/src/apps/chatbot/components
```

### Step 2: Define App Component

**File:** `frontend/src/apps/chatbot/chatbot.tsx`

```typescript
'use client';

import { A2UISurface } from '@/a2ui/renderer';
import { useAgentStream } from '@/a2ui/transport/useAgentStream';
import { CHATBOT_CONFIG } from './config';

export function ChatbotApp() {
  const { status, start, stop } = useAgentStream(CHATBOT_CONFIG.endpoint);

  const handleSendMessage = (message: string) => {
    start(message);  // Initiates SSE stream
  };

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      <h1 className="text-2xl font-bold">Chatbot</h1>
      
      {/* Your UI components here */}
      <input 
        type="text" 
        placeholder="Type a message..." 
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSendMessage(e.currentTarget.value);
          }
        }}
      />
      
      <A2UISurface loading={status === 'IDLE'} />
      
      {status === 'ERROR' && (
        <button onClick={() => handleSendMessage(...)}>Retry</button>
      )}
    </div>
  );
}
```

### Step 3: Create Config File

**File:** `frontend/src/apps/chatbot/config.ts`

```typescript
export const CHATBOT_CONFIG = {
  id: 'chatbot',
  name: 'Chatbot',
  route: '/chatbot',
  endpoint: '/api/agents/chatbot',  // Backend endpoint
  surfaceId: 'chat-surface',
} as const;
```

### Step 4: Export App Definition

**File:** `frontend/src/apps/chatbot/index.ts`

```typescript
import { ChatbotApp } from './chatbot';

export const chatbotAppDef = {
  id: 'chatbot',
  name: 'Chatbot',
  route: '/chatbot',
  Component: ChatbotApp,
};

export default chatbotAppDef;
```

**Important:** Props match AppRegistry type:
```typescript
type AppDefinition = {
  id: string;      // Unique ID
  name: string;    // Display name
  route: string;   // URL path (e.g., /chatbot)
};
```

### Step 5: Register in AppRegistry

**File:** `frontend/src/platform/registry/AppRegistry.ts`

```typescript
import { knowledgeQaAppDef } from '@/apps/knowledge-qa';
import { chatbotAppDef } from '@/apps/chatbot';  // ← Add import

export const appRegistry: AppDefinition[] = [
  knowledgeQaAppDef,
  chatbotAppDef,  // ← Add here
];
```

✅ **Do NOT import the component directly.** Only import the app definition.

### Step 6: Create Route Handler

**File:** `frontend/src/app/(apps)/chatbot/page.tsx`

```typescript
'use client';

import { ChatbotApp } from '@/apps/chatbot/chatbot';

export default function ChatbotPage() {
  return <ChatbotApp />;
}
```

### Step 7: Test

```bash
cd frontend
npm run dev
# Visit http://localhost:3000/chatbot
```

✅ You should see:
- Navigation shows "Chatbot" in AppSwitcher
- Clicking it navigates to `/chatbot`
- ChatbotApp renders

---

## Pattern: Add a New Catalog Component

Want to add an "ImageComponent"? Follow this pattern.

### Step 1: Create Component File

**File:** `frontend/src/a2ui/catalog/components/ImageComponent.tsx`

```typescript
import { resolveStaticString } from '@/a2ui/types';

interface ImageComponentProps {
  src: unknown;         // URL or data binding
  alt?: unknown;        // Alt text
  width?: unknown;      // Optional width
  height?: unknown;     // Optional height
}

export function ImageComponent({ src, alt, width, height }: ImageComponentProps) {
  const srcUrl = resolveStaticString(src);
  const altText = resolveStaticString(alt) || 'Image';
  const w = typeof width === 'number' ? width : 'auto';
  const h = typeof height === 'number' ? height : 'auto';

  return (
    <img
      src={srcUrl}
      alt={altText}
      style={{
        width: `${w}px`,
        height: `${h}px`,
        objectFit: 'cover',
        borderRadius: '0.5rem',
      }}
    />
  );
}
```

### Step 2: Register in Catalog

**File:** `frontend/src/a2ui/catalog/catalogRegistry.tsx`

```typescript
import { ImageComponent } from './components/ImageComponent';

export const catalogRegistry = {
  'Text': TextComponent,
  'Card': CardComponent,
  'Button': ButtonComponent,
  'Badge': BadgeComponent,
  'SourceList': SourceListComponent,
  'Image': ImageComponent,  // ← Add here
};
```

### Step 3: Update ComponentHost Mapping

**File:** `frontend/src/a2ui/renderer/ComponentHost.tsx`

When ComponentHost encounters `{ "Image": {...} }`, it looks up in catalogRegistry automatically. ✅ No changes needed if using registry.

### Step 4: Test in A2UI Message

**Mock SSE response** — add to the `updateComponents.components` array in `frontend/src/app/api/agents/knowledge-qa/route.ts`:
```json
{
  "id": "logo",
  "component": "Image",
  "src": "https://example.com/logo.png",
  "alt": "Company Logo",
  "width": 200,
  "height": 100
}
```

### Step 5: Update Documentation

**File:** `frontend/docs/FE_Reference.md`

Add new section:
```markdown
### ImageComponent
**File:** `ImageComponent.tsx`
**Props:**
- src: Image URL (binding or literal)
- alt: Alt text
- width: Optional width in pixels
- height: Optional height in pixels
```

---

## Pattern: Debug "Unknown component: Foo" Error

### Problem
You see error: `Unknown component: Foo`

### Checklist

1. **Is the component registered?**
   ```bash
   grep -r "Foo" frontend/src/a2ui/catalog/catalogRegistry.tsx
   ```
   If missing, add it.

2. **Does the type name match exactly?**
   - Component sends: `{ "Foo": {...} }`
   - Registry has: `'Foo': FooComponent` (case-sensitive)
   - Check spelling!

3. **Is the component exported?**
   ```typescript
   export function FooComponent(...) { ... }
   ```
   Not just `function FooComponent(...)` ❌

4. **Check SSE message structure**
   ```bash
   # View network tab → XHR → knowledge-qa
   # Copy response and pretty-print
   curl -s http://localhost:3000/api/agents/knowledge-qa?query=test | jq .
   ```
   Look for: `"component": { "Foo": {...} }`

5. **Browser console check**
   ```javascript
   // In browser console
   console.log(window.__catalogRegistry);  // (if exposed)
   ```

### Common Mistakes

❌ Typos in type name:
```json
{ "Text": {...} }  ← Correct
{ "text": {...} }  ← Wrong (lowercase)
```

❌ Component not exported:
```typescript
function MyComponent() { ... }  ← Not exported
export function MyComponent() { ... }  // ← Correct
```

❌ Registered but not used:
```typescript
// catalogRegistry.tsx
const catalogRegistry = {
  'Foo': FooComponent,  // Registered
};

// But ComponentHost not using it
// ✅ Should work automatically if FooComponent is in registry
```

### Solution

1. Double-check type name (case-sensitive)
2. Verify component is exported as default or named
3. Verify component is in catalogRegistry
4. Check SSE message JSON structure
5. Hard-refresh browser (Cmd+Shift+R)

---

## Pattern: Debug Rendering Not Working

### Problem
SSE stream completes but nothing renders.

### Checklist

1. **Are both messages present?**

   Network tab → knowledge-qa request → response body should show 2 JSON lines:
   ```
   {"version":"v0.9","createSurface":{"surfaceId":"qa-result","catalogId":"stub"}}
   {"version":"v0.9","updateComponents":{"surfaceId":"qa-result","components":[...]}}
   ```

2. **Does `surfaceId` match across both messages?**
   ```
   createSurface.surfaceId === updateComponents.surfaceId
   ```

3. **Is `createSurface` missing a `components` field?** (It must not have one — components belong in `updateComponents`)

4. **Does `updateComponents` use `components[]`, not `updates[]`?**

5. **Check browser console for errors**
   ```
   [A2UI] Failed to parse message: ...
   [A2UI] Stream error: ...
   ```

### Debug Steps

```typescript
// In browser console
const processor = window.__messageProcessor;  // (if exposed)

// Check surfaces
[...processor?.model?.surfacesMap?.values()].forEach(s => {
  console.log('Surface:', s.id);
  console.log('Components:', [...s.componentsModel.ids]);
});
```

### Common Mistakes

❌ Wrong component object format (old nested style, never implemented):
```json
{ "id": "x", "component": { "Text": { "text": "..." } } }  ← wrong
{ "id": "x", "component": "Text", "text": "..." }          ← correct
```

❌ Sending a `render` message — not a recognised message type in `@a2ui/web_core/v0_9`:
```json
{ "version": "v0.9", "render": { "surfaceId": "..." } }  ← ignored/errors
```

❌ Component ID typo between `createSurface`-era expectations and `updateComponents`:
```json
updateComponents components: [{ "id": "answer-body" }]
// elsewhere expecting:          "id": "answerBody"   ← mismatch
```

### Solution

1. Confirm 2 messages received (network tab)
2. Confirm `surfaceId` is identical in both
3. Confirm `updateComponents.components[]` is an array with at least one component
4. Hard-refresh browser (Cmd+Shift+R)
5. Restart dev server (`npm run dev`)

---

## Pattern: Activate the Real Backend

The FastAPI backend is at `backend/`. The Next.js route handler auto-proxies to it when `BACKEND_URL` is set; otherwise it falls back to the mock.

### Step 1: Start the backend

```bash
cd backend
source .venv/bin/activate   # or python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
python main.py              # starts on http://localhost:8000
```

### Step 2: Point Next.js at it

**File:** `frontend/.env.local`

```bash
BACKEND_URL=http://localhost:8000
```

### Step 3: Verify

```bash
# Backend directly:
curl -sN -X POST "http://localhost:8000/api/agents/knowledge-qa?query=What+is+RAG"

# Through Next.js proxy:
curl -sN -X POST "http://localhost:3000/api/agents/knowledge-qa?query=What+is+RAG"

# Expected output (2 lines):
# {"version":"v0.9","createSurface":{"surfaceId":"qa-result","catalogId":"stub"}}
# {"version":"v0.9","updateComponents":{"surfaceId":"qa-result","components":[...]}}
```

### How the proxy works

`frontend/src/app/api/agents/knowledge-qa/route.ts` checks `process.env.BACKEND_URL`:
- **Set** → forwards the full query string to FastAPI and streams the response
- **Not set** → returns mock data (useful for FE-only development)

No changes to app config or component code needed.

---

## Pattern: Understand Data Flow

### Flow Diagram

```
User types query
    ↓
QueryInput.onSubmit()
    ↓
useAgentStream.start(query)
    ↓
fetch(POST, endpoint, query)  ← Opens SSE stream
    ↓
SSE message: createSurface / updateComponents
    ↓
useAgentStream → processor.processMessages()
    ↓
MessageProcessor updates internal state
    ↓
A2UISurface subscribes (renders on state change)
    ↓
A2UISurface → SurfaceView (per surface)
    ↓
SurfaceView → ComponentHost (per component)
    ↓
ComponentHost looks up component type in catalogRegistry
    ↓
ComponentHost → renders React component
    ↓
User sees UI in browser
```

### Code Breadcrumb Trail

1. **User action:** `QueryInput.tsx` (line X)
2. **Stream start:** `KnowledgeQAApp.tsx → useAgentStream.start(query)`
3. **SSE handler:** `useAgentStream.ts`
4. **Message parsing:** `useSSE.ts` (line-buffered)
5. **State update:** `processor.processMessages()` in useAgentStream
6. **Re-render trigger:** `A2UISurface.tsx` subscribes to processor
7. **Component render:** `ComponentHost.tsx` maps type → component

**Key insight:** Data flows one direction: User → Query → SSE → MessageProcessor → React state → Component tree

Never bypass this flow. Never store state outside MessageProcessor.

---

**For component reference, see:** [FE_Reference.md](FE_Reference.md)  
**For rules, see:** [Governance.md](../Governance.md)  
**For session tracking, see:** [../CLAUDE.md](../CLAUDE.md)
