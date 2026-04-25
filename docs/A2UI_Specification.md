# A2UI Protocol Specification v0.9

**Last Updated:** April 9, 2026  
**Scope:** A2UI message format as implemented in this codebase  
**Audience:** Backend developers (what to send), Frontend developers (what the processor handles)

> **For the full request/response contract (timing, error handling, curl tests), see [Contracts.md](Contracts.md).**  
> **For component prop APIs, see [Contracts.md §5](Contracts.md) and [FE_Reference.md](FE_Reference.md).**

---

## 1. Protocol Overview

A2UI is a declarative protocol where the backend describes a UI as a stream of JSON messages. The frontend's `MessageProcessor` (`@a2ui/web_core/v0_9`) receives the messages and builds a surface model that React renders.

**Message flow (current implementation):**
```
1. createSurface    → Register the surface (surfaceId + catalogId)
2. updateComponents → Set all components with their final prop values
```

Stream closes after Message 2. The React layer (`A2UISurface`) subscribes to `onSurfaceCreated` and re-renders reactively as the processor model updates.

**All messages share this envelope:**
```json
{ "version": "v0.9", "<messageType>": { ... } }
```

---

## 2. Message Types

The library (`@a2ui/web_core/v0_9`) supports four message types:

| Type | Purpose | Status |
|---|---|---|
| `createSurface` | Register a surface | ✅ Complete |
| `updateComponents` | Set component definitions + props | ✅ Complete |
| `updateDataModel` | Populate a data model (for path bindings) | 🔲 Backlog |
| `deleteSurface` | Remove a surface | 🔲 Backlog |

---

### createSurface

Registers a new surface. Must be sent before `updateComponents`.

```json
{
  "version": "v0.9",
  "createSurface": {
    "surfaceId": "qa-turn-abc123",
    "catalogId": "stub"
  }
}
```

| Field | Required | Description |
|---|---|---|
| `surfaceId` | ✅ | Unique ID for this surface (used in all following messages) |
| `catalogId` | ✅ | Which component catalog to use (`"stub"` for v1) |
| `theme` | ❌ | Optional theme override |
| `sendDataModel` | ❌ | If true, FE will send data model back to backend (Backlog) |

**Rule:** No `components` field here — components are set in `updateComponents`.

---

### updateComponents

Sets the complete component tree for a surface. Sent after `createSurface`.

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "qa-turn-abc123",
    "components": [
      {
        "id": "answer-label",
        "component": "Text",
        "text": "Answer",
        "usageHint": "h2"
      },
      {
        "id": "answer-body",
        "component": "Text",
        "text": "Machine learning is a subset of AI...",
        "usageHint": "body"
      },
      {
        "id": "sources-label",
        "component": "Text",
        "text": "Sources",
        "usageHint": "h3"
      },
      {
        "id": "sources-list",
        "component": "SourceList",
        "sources": [
          {
            "id": "uuid",
            "title": "ML Guide",
            "excerpt": "Machine learning is...",
            "score": 0.92,
            "document": "ml-guide.pdf",
            "section": "Chapter 1",
            "date": "2025-11-15",
            "category": "AI/ML"
          }
        ]
      }
    ]
  }
}
```

| Field | Required | Description |
|---|---|---|
| `surfaceId` | ✅ | Must match the `createSurface` surfaceId |
| `components` | ✅ | Full component array — replaces any prior state |

**Component object shape:**
```json
{
  "id": "<unique within surface>",
  "component": "<ComponentTypeName>",
  "<prop1>": "<value>",
  "<prop2>": "<value>"
}
```

Props are **flat key-value pairs** at the component level — not nested under the type name.

---

### updateDataModel (Backlog)

Populates a data model that components can reference via path bindings. Not currently used — backend sends all values as inline flat props in `updateComponents`.

```json
{
  "version": "v0.9",
  "updateDataModel": {
    "surfaceId": "qa-turn-abc123",
    "path": "/answer",
    "value": "Machine learning is..."
  }
}
```

---

## 3. Component Prop Format

All component props are **flat literals** at the component object level:

```json
{ "id": "my-text", "component": "Text", "text": "Hello", "usageHint": "h2" }
{ "id": "my-btn",  "component": "Button", "label": "Submit", "variant": "primary" }
{ "id": "my-list", "component": "SourceList", "sources": [...] }
```

**Not** the nested type-keyed format — that was a previous spec that was never implemented:
```json
❌ { "id": "x", "component": { "Text": { "text": { "literalString": "Hello" } } } }
✅ { "id": "x", "component": "Text", "text": "Hello" }
```

For full prop tables per component type, see [Contracts.md §5](Contracts.md) and [FE_Reference.md](FE_Reference.md).

---

## 4. Debugging

### Common errors

| Error | Likely Cause | Fix |
|---|---|---|
| "Unknown component: Foo" | Backend sent unregistered component type | Check component name spelling + catalogRegistry |
| Surface renders empty | `updateComponents` not received / wrong surfaceId | Verify surfaceId matches across both messages |
| Invalid JSON line | Malformed message | `curl \| jq .` to validate each line |

### Checklist

1. Are both messages received? (Network tab → 2 lines of JSON)
2. Does each message have `version: "v0.9"`?
3. Does `surfaceId` match across both messages?
4. Is `createSurface` missing the `components` field? (It should be absent)
5. Does `updateComponents` have a `components[]` array (not `updates[]`)?
6. Are component prop names spelled correctly? (`text` not `label` for Text; `sources` not `items` for SourceList)

---

## 5. Backward Compatibility

- **Current version:** A2UI v0.9
- **Import path:** `@a2ui/web_core/v0_9` (NOT the root — that resolves to v0.8)
- **Unknown component types:** FE logs warning and skips — does not crash
- **Breaking change:** Removing a required field requires version bump + FE team notification

---

## 6. References

- **Request/response contract + timing:** [Contracts.md](Contracts.md)
- **Component prop APIs:** [Contracts.md §5](Contracts.md) + [FE_Reference.md](FE_Reference.md)
- **System architecture:** [Architecture.md](Architecture.md)
- **Governance rules:** [Governance.md](Governance.md)
