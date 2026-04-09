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


def update_components_msg(answer: str, sources: list[dict]) -> dict:
    return {
        "version": VERSION,
        "updateComponents": {
            "surfaceId": SURFACE_ID,
            "components": [
                {
                    "id": "answer-label",
                    "component": "Text",
                    "text": "Answer",
                    "usageHint": "h2",
                },
                {
                    "id": "answer-body",
                    "component": "Text",
                    "text": answer,
                    "usageHint": "body",
                },
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
            ],
        },
    }
