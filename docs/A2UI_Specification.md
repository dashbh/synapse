# A2UI Protocol Specification v0.9

**Last Updated:** April 7, 2026  
**Scope:** A2UI message format, component types, data binding  
**Audience:** Frontend + Backend developers

---

## 1. A2UI Protocol Overview

A2UI is a declarative protocol for describing agent-generated UIs. Three core concepts:

1. **Surfaces** — Root UI containers (one per query result)
2. **Components** — Nodes in the UI tree (Text, Card, Button, etc.)
3. **Data Model** — Values accessible via JSON Pointer paths

**Message Flow:**
```
1. surfaceUpdate → Define structure (components)
2. dataModelUpdate → Populate data (values)
3. beginRendering → Signal to render
```

---

## 2. Message Types

### surfaceUpdate Message

**Purpose:** Define UI component structure

**Structure:**
```json
{
  "surfaceUpdate": {
    "surfaceId": "string (unique ID)",
    "components": [
      {
        "id": "string (unique within surface)",
        "component": {
          "ComponentType": {
            "prop1": "value or binding",
            "prop2": "value or binding"
          }
        }
      }
    ]
  }
}
```

**Example:**
```json
{
  "surfaceUpdate": {
    "surfaceId": "qa-result",
    "components": [
      {
        "id": "title",
        "component": {
          "Text": {
            "text": { "literalString": "Answer" },
            "usageHint": "h2"
          }
        }
      },
      {
        "id": "content",
        "component": {
          "Text": {
            "text": { "path": "/answer/body" }
          }
        }
      },
      {
        "id": "source-list",
        "component": {
          "SourceList": {
            "items": { "path": "/sources" }
          }
        }
      }
    ]
  }
}
```

**Rules:**
- `surfaceId` must be unique (don't reuse)
- `components` array cannot be empty
- Component `id` must be unique within the surface
- Component `component` object has exactly one key (the type)
- Props use data binding syntax (see § 4)

---

### dataModelUpdate Message

**Purpose:** Populate data model that components reference

**Structure:**
```json
{
  "dataModelUpdate": {
    "surfaceId": "string (must match surfaceUpdate)",
    "contents": [
      {
        "key": "string (data model key)",
        "valueString": "optional string value",
        "valueFloat": "optional float value",
        "valueList": "optional array",
        "valueMap": "optional object"
      }
    ]
  }
}
```

**Data Model Value Types:**

| Type | Field | Example |
|---|---|---|
| String | `valueString` | `"valueString": "Hello"` |
| Float | `valueFloat` | `"valueFloat": 0.95` |
| List | `valueList` | `"valueList": [{...}, {...}]` |
| Map | `valueMap` | `"valueMap": [{"key": "k", "valueString":...}]` |

**List structures:**
```json
"valueList": [
  { "valueString": "item 1" },
  { "valueString": "item 2" },
  ...
]
```

**Map structures:**
```json
"valueMap": [
  { "key": "title", "valueString": "Source 1" },
  { "key": "score", "valueFloat": 0.91 },
  ...
]
```

**Example:**
```json
{
  "dataModelUpdate": {
    "surfaceId": "qa-result",
    "contents": [
      {
        "key": "answer",
        "valueMap": [
          { "key": "body", "valueString": "Machine learning is..." }
        ]
      },
      {
        "key": "sources",
        "valueList": [
          {
            "valueMap": [
              { "key": "title", "valueString": "ML Guide" },
              { "key": "score", "valueFloat": 0.92 }
            ]
          }
        ]
      }
    ]
  }
}
```

**Rules:**
- `surfaceId` must match corresponding surfaceUpdate
- At most one `value*` field per entry (not all required, depends on usage)
- Maps are arrays of key-value pairs (not JSON objects)
- Lists can contain strings, floats, or maps

---

### beginRendering Message

**Purpose:** Signal that surface is ready to render (all data populated)

**Structure:**
```json
{
  "beginRendering": {
    "surfaceId": "string (must match previous messages)",
    "root": "string (component ID to render from)",
    "error": "optional string (error message if failed)"
  }
}
```

**Success example:**
```json
{
  "beginRendering": {
    "surfaceId": "qa-result",
    "root": "title"
  }
}
```

**Error example:**
```json
{
  "beginRendering": {
    "surfaceId": "qa-result",
    "error": "LLM rate limit exceeded"
  }
}
```

**Rules:**
- `surfaceId` must match surfaceUpdate + dataModelUpdate
- `root` is the component ID where rendering begins
- `error` field optional; if present, FE displays it instead of rendering
- After this message, stream should close

---

## 3. Component Types

### Text Component

**Purpose:** Display text with semantic hint (heading, body, etc.)

**Props:**
| Prop | Type | Required | Values |
|---|---|---|---|
| `text` | binding | ✅ | `{ "literalString": "..." }` or `{ "path": "/key" }` |
| `usageHint` | string | ❌ | `h1`, `h2`, `h3`, `body`, `caption` |

**Example:**
```json
{
  "Text": {
    "text": { "literalString": "Welcome" },
    "usageHint": "h1"
  }
}
```

**Frontend rendering:** Maps to `<h1>`, `<h2>`, `<h3>`, `<p>`, `<p class="caption">` with design tokens

---

### Card Component

**Purpose:** Container/box with optional title

**Props:**
| Prop | Type | Required | Values |
|---|---|---|---|
| `title` | binding | ❌ | `{ "literalString": "..." }` or `{ "path": "/key" }` |
| `children` | array | ❌ | Array of component IDs |

**Example:**
```json
{
  "Card": {
    "title": { "literalString": "Results" },
    "children": ["result-1", "result-2"]
  }
}
```

**Frontend rendering:** shadcn Card with CardHeader (if title) + CardContent

---

### Button Component

**Purpose:** Interactive button

**Props:**
| Prop | Type | Required | Values |
|---|---|---|---|
| `text` | binding | ✅ | `{ "literalString": "..." }` or `{ "path": "/key" }` |
| `variant` | string | ❌ | `primary` (default), `secondary`, `success`, `warning`, `error` |
| `disabled` | boolean | ❌ | `true` / `false` |

**Example:**
```json
{
  "Button": {
    "text": { "literalString": "Continue" },
    "variant": "primary",
    "disabled": false
  }
}
```

---

### Badge Component

**Purpose:** Small label/status indicator

**Props:**
| Prop | Type | Required | Values |
|---|---|---|---|
| `text` | binding | ✅ | `{ "literalString": "..." }` or `{ "path": "/key" }` |
| `variant` | string | ❌ | `default`, `success`, `warning`, `error`, `info` |

**Example:**
```json
{
  "Badge": {
    "text": { "literalString": "In Progress" },
    "variant": "primary"
  }
}
```

---

### SourceList Component

**Purpose:** Display list of sources/citations with score badges

**Props:**
| Prop | Type | Required | Values |
|---|---|---|---|
| `items` | binding | ✅ | `{ "path": "/sources" }` (must point to array) |

**Data Model Structure (Expected):**
Each item in `/sources` array must be a map with:
```json
{
  "key": "title",
  "valueString": "Source Title"
},
{
  "key": "excerpt",
  "valueString": "Quote or excerpt..."
},
{
  "key": "score",
  "valueFloat": 0.95
},
{
  "key": "url",
  "valueString": "https://..."
}
```

**Example surfaceUpdate:**
```json
{
  "SourceList": {
    "items": { "path": "/sources" }
  }
}
```

**Example dataModelUpdate:**
```json
{
  "key": "sources",
  "valueList": [
    {
      "valueMap": [
        { "key": "title", "valueString": "ML Guide" },
        { "key": "excerpt", "valueString": "Machine learning is..." },
        { "key": "score", "valueFloat": 0.91 },
        { "key": "url", "valueString": "https://docs.example.com/ml" }
      ]
    },
    {
      "valueMap": [
        { "key": "title", "valueString": "AI Fundamentals" },
        { "key": "excerpt", "valueString": "AI is a broad field..." },
        { "key": "score", "valueFloat": 0.84 },
        { "key": "url", "valueString": "https://docs.example.com/ai" }
      ]
    }
  ]
}
```

---

## 4. Data Binding

### Static Values (Literals)

Use `literalString` for fixed text:

```json
{ "text": { "literalString": "Fixed text" } }
```

Always renders as: "Fixed text"

### Dynamic Values (Paths)

Use `path` to bind to data model:

```json
{ "text": { "path": "/answer/body" } }
```

Resolves to: data model entry with `key="answer"` → map entry with `key="body"` → `valueString`

**Path Syntax:**
- `/answer` — Top-level data model entry
- `/answer/body` — Entry + nested key
- `/sources` — Reference to array
- `/sources[0]` — Future (v2): array index
- `/sources[].title` — Future (v2): map all titles from array

**Current Support (v1):** Only `/key` and `/key/nested-key` paths (no array indexing)

---

## 5. Error Codes & Debugging

### Common A2UI Errors

| Error | Likely Cause | Fix |
|---|---|---|
| "Unknown component: Foo" | Backend sent component type not in catalog | Check component type spelling |
| "Path '/answer/text' not found" | Data model missing expected key | Verify dataModelUpdate has all keys referenced in surfaceUpdate |
| "Component ID 'xyz' not found" (when using child IDs) | Card references child ID that doesn't exist | Check component IDs match |
| Invalid JSON line | Malformed message | Pretty-print message and validate against schema |

### Frontend Debug Checklist

1. ✅ Are all 3 messages present? (Check network tab for 3 lines of JSON)
2. ✅ Is JSON valid? (Use jq or in-browser console `JSON.parse()`)
3. ✅ Do topmost messages have matching `surfaceId`?
4. ✅ Do all `/paths` in surfaceUpdate exist in dataModelUpdate?
5. ✅ Do component IDs match (no typos)?
6. ✅ Are value types correct? (strings vs floats vs arrays vs objects)

---

## 6. Backward Compatibility

**Current Version:** A2UI v0.9 (locked for v1)

**If adding new component types:**
- Unknown types: FE logs warning, skips component
- Supported types: FE renders normally

**If removing required fields:**
- Breaking change: increment version number
- Notify all FE/BE teams
- Support both versions temporarily

---

## 7. References

- **Backend Contract:** See [Contracts.md](Contracts.md) for SSE protocol + timing
- **Frontend Implementation:** See [FE_Implementation.md](FE_Implementation.md)
- **Component Reference:** See [FE_Reference.md](FE_Reference.md)
- **Architectural Patterns:** See [Architecture.md](Architecture.md)
