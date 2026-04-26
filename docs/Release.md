# Release Process

**Workflow:** [.github/workflows/production-release.yml](../.github/workflows/production-release.yml)  
**Trigger:** any tag matching `v*.*.*` pushed to the repository  
**Strategy:** cut a **release-candidate (RC)** tag first → validate the artifacts end-to-end → cut the final tag only when the RC is green

RC tags contain a hyphen (e.g. `v1.0.0-rc1`) and are auto-marked as **Pre-release** on GitHub. Final tags (`v1.0.0`) are not.

---

## Prerequisites

One-time setup per machine:

| Tool | Why | Install |
|---|---|---|
| `gh` CLI, authenticated | run / watch workflows, verify attestations | `brew install gh && gh auth login` |
| Docker Desktop, running | pull and run the published images locally | https://docker.com/products/docker-desktop |

The `GITHUB_TOKEN` used by the workflow is provisioned automatically — no secrets to manage.

**Before starting:** the work being released must already be merged into your ship branch (`main`, or your release branch). Tags are cut from that branch, not from feature branches.

---

## Phase 1 — Cut the RC tag

```bash
# Confirm you're on the ship branch and up to date
git checkout main
git pull origin main

# Pick the next RC number — start at rc1 for a new minor/major release
git tag v1.0.0-rc1
git push origin v1.0.0-rc1
```

The push triggers the workflow. Open the run:

```bash
gh run watch                           # blocks until the run finishes
```

Or open the Actions tab in the browser to watch live.

The workflow runs three jobs:

| Job | What it does |
|---|---|
| `build-and-push (synapse-backend)` | Multi-arch build (`amd64` + `arm64`), push to GHCR, generate SLSA attestation |
| `build-and-push (synapse-frontend)` | Same, for the frontend image |
| `release` | Fan-in: creates the GitHub Release with auto-changelog and pull commands |

If the workflow fails, see [§5 Iterating an RC](#phase-5--iterating-an-rc) below.

---

## Phase 2 — Pull and run the published images

This is the authoritative test: pull *exactly the same artifact* that consumers will pull.

```bash
docker pull ghcr.io/<owner>/synapse-backend:v1.0.0-rc1
docker pull ghcr.io/<owner>/synapse-frontend:v1.0.0-rc1
```

Run the backend in one terminal:

```bash
docker run --rm -p 8000:8000 \
  --env-file backend/.env \
  ghcr.io/<owner>/synapse-backend:v1.0.0-rc1
```

Run the frontend in another:

```bash
docker run --rm -p 3000:3000 \
  -e BACKEND_URL=http://host.docker.internal:8000 \
  ghcr.io/<owner>/synapse-frontend:v1.0.0-rc1
```

`host.docker.internal` is Docker Desktop's stable hostname for the host loopback — the frontend container reaches the backend container through it.

---

## Phase 3 — Smoke-test the running containers

```bash
# Backend health
curl -sf http://localhost:8000/health

# Backend RAG endpoint (full SSE round-trip)
curl -sN -X POST \
  "http://localhost:8000/api/agents/knowledge-qa?query=ping&surface_id=qa-turn-test"

# Frontend rendered page
open http://localhost:3000
```

Manually submit a query in the browser. Confirm the answer renders, sources appear, and no console errors fire.

If anything fails here, the artifact is broken — go to [§5 Iterating an RC](#phase-5--iterating-an-rc).

---

## Phase 4 — Verify SLSA build provenance

The workflow signs each image with a build-provenance attestation. Verify both:

```bash
gh attestation verify oci://ghcr.io/<owner>/synapse-backend:v1.0.0-rc1  --owner <owner>
gh attestation verify oci://ghcr.io/<owner>/synapse-frontend:v1.0.0-rc1 --owner <owner>
```

Expected output for each: `Loaded digest sha256:... · trusted by 1 attestation` plus a JSON statement showing the workflow that produced the image. If verification fails, the attestation step in the workflow is broken — do not promote to a final tag.

Then open the GitHub Release page (`gh release view v1.0.0-rc1 --web`) and confirm:

- [ ] Marked as **Pre-release**
- [ ] Auto-changelog reflects the PRs merged since the previous tag
- [ ] `docker pull` commands in the body are correct and copy-pasteable
- [ ] Both image tags appear in the Packages tab on the repo home page

---

## Phase 5 — Iterating an RC

If any phase above fails, fix on a branch, merge to main, and cut the next RC. **Do not reuse RC numbers** — tags should be immutable.

```bash
# 1. Fix on a feature branch, PR, merge as usual
git checkout main && git pull origin main

# 2. Optionally clean up the failed RC's artifacts (cosmetic — RC tags
#    pile up otherwise):
git push --delete origin v1.0.0-rc1
git tag -d v1.0.0-rc1
gh release delete v1.0.0-rc1 --yes
# Delete the GHCR package versions via the repo Packages settings UI

# 3. Cut the next RC
git tag v1.0.0-rc2
git push origin v1.0.0-rc2
gh run watch
```

Repeat Phases 2–4 against the new RC.

---

## Phase 6 — Cut the final release

When the most recent RC is fully green and validated:

```bash
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
gh run watch
```

The same workflow runs and produces:

| Artifact | Tags |
|---|---|
| `ghcr.io/<owner>/synapse-backend`  | `v1.0.0` and `latest` |
| `ghcr.io/<owner>/synapse-frontend` | `v1.0.0` and `latest` |
| GitHub Release `v1.0.0` | Auto-changelog + pull commands; **not** marked Pre-release |
| SLSA attestation per image | Pushed as OCI referrer |

---

## Phase 7 — Post-release verification

Confirm `:latest` now points at the new release:

```bash
docker pull ghcr.io/<owner>/synapse-backend:latest
docker pull ghcr.io/<owner>/synapse-backend:v1.0.0

docker inspect ghcr.io/<owner>/synapse-backend:latest --format '{{.Id}}'
docker inspect ghcr.io/<owner>/synapse-backend:v1.0.0 --format '{{.Id}}'
# Both digests must match.
```

Repeat for the frontend image.

Optional follow-ups:
- Update [Roadmap.md](Roadmap.md) MVP Complete or backlog if the release closes major items
- Record a one-line entry in [Decision_Log.md](Decision_Log.md) if the release embodies a notable architectural decision
- Announce the release (Slack / email / changelog feed)

---

## Rollback

Container image *tags* are immutable on GHCR (a given digest never changes), but operationally there are three rollback levers:

1. **Cut a patch release with the fix.** Push `v1.0.1` → the workflow rebuilds and re-tags `:latest` to point at the new images. Downstream consumers of `:latest` automatically pick up the fix.
2. **Yank the bad image** by deleting the package version in GHCR's Packages settings UI. Future pulls of `v1.0.0` fail loudly instead of running broken code.
3. **Mark the GitHub Release** as Pre-release or delete it via `gh release delete v1.0.0 --yes` so it's no longer visible as the latest stable.

Cutting a patch release is the standard rollback path. Yanking should be reserved for genuinely unsafe releases (security CVE, data loss bug).

---

## Quick reference

| Step | Command |
|---|---|
| Cut RC tag | `git tag v1.0.0-rcN && git push origin v1.0.0-rcN` |
| Watch pipeline | `gh run watch` |
| Pull RC images | `docker pull ghcr.io/<owner>/synapse-{backend,frontend}:v1.0.0-rcN` |
| Run backend | `docker run --rm -p 8000:8000 --env-file backend/.env ghcr.io/<owner>/synapse-backend:v1.0.0-rcN` |
| Run frontend | `docker run --rm -p 3000:3000 -e BACKEND_URL=http://host.docker.internal:8000 ghcr.io/<owner>/synapse-frontend:v1.0.0-rcN` |
| Verify provenance | `gh attestation verify oci://ghcr.io/<owner>/synapse-backend:v1.0.0-rcN --owner <owner>` |
| Cut final tag | `git tag v1.0.0 && git push origin v1.0.0` |
| Delete a bad RC | `git push --delete origin v1.0.0-rcN && gh release delete v1.0.0-rcN --yes` |
| Rollback (preferred) | Push `v1.0.1` with the fix |

---

*Architecture details: [Architecture.md §6 Release Pipeline](Architecture.md). Workflow source: [.github/workflows/production-release.yml](../.github/workflows/production-release.yml).*
