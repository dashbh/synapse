"""
A2UI v0.9 message builders.

The actual @a2ui/web_core/v0_9 library processes:
  1. createSurface   — creates an empty surface (surfaceId + catalogId)
  2. updateComponents — sets component definitions (full objects, not patches)

Reference: frontend/node_modules/@a2ui/web_core/src/v0_9/index.d.ts
"""

SURFACE_ID = "qa-result"
CATALOG_ID = "stub"
VERSION = "v0.9"


def create_surface_msg() -> dict:
    return {
        "version": VERSION,
        "createSurface": {
            "surfaceId": SURFACE_ID,
            "catalogId": CATALOG_ID,
        },
    }


def update_components_msg(answer: str, sources: list[dict], usage: dict | None = None) -> dict:
    components = [
        {
            "id": "answer-label",
            "component": "Text",
            "text": "Answer",
            "usageHint": "h2",
        },
        {
            "id": "answer-body",
            "component": "Markdown",
            "markdown": answer,
        },
    ]

    if usage:
        components.append({
            "id": "meta-info",
            "component": "Text",
            "text": (
                f"Model: {usage['model']} · "
                f"{usage['total_tokens']:,} tokens "
                f"({usage['prompt_tokens']:,} in, {usage['completion_tokens']:,} out)"
            ),
            "usageHint": "caption",
        })

    components += [
        {
            "id": "sources-label",
            "component": "Text",
            "text": "Sources",
            "usageHint": "h3",
        },
        {
            "id": "sources-list",
            "component": "SourceList",
            "sources": sources,
        },
    ]

    return {
        "version": VERSION,
        "updateComponents": {
            "surfaceId": SURFACE_ID,
            "components": components,
        },
    }
