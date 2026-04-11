# Synapse — Docker Compose shortcuts
#
# Usage:
#   make dev          Start frontend + backend (dev mode)
#   make prod         Start frontend + backend (prod mode)
#   make obs          Start observability sidecar alongside dev stack
#   make down         Stop all running containers
#   make logs         Tail logs from all running containers
#   make ps           Show running container status
#   make build        Rebuild all images (no cache)
#   make clean        Stop containers and remove volumes (destructive!)
#   make shell-be     Open a shell in the running backend-dev container
#   make shell-fe     Open a shell in the running frontend-dev container

# Delegate image builds to Docker Bake for better parallelism
export COMPOSE_BAKE := true

COMPOSE      := docker compose
BASE         := -f infra/docker-compose.yml
OBS          := -f infra/docker-compose.observability.yml
DEV_PROFILE  := --profile dev
PROD_PROFILE := --profile prod

.PHONY: dev prod obs obs-down down logs logs-be logs-fe ps build clean shell-be shell-fe help

# ── Start ────────────────────────────────────────────────────────────────────

dev: ## Start frontend + backend + observability sidecar (dev mode)
	$(COMPOSE) $(BASE) $(OBS) $(DEV_PROFILE) up

dev-d: ## Start frontend + backend + observability sidecar (detached)
	$(COMPOSE) $(BASE) $(OBS) $(DEV_PROFILE) up -d

prod: ## Start frontend + backend in prod mode
	$(COMPOSE) $(BASE) $(PROD_PROFILE) up

prod-d: ## Start frontend + backend in prod mode (detached)
	$(COMPOSE) $(BASE) $(PROD_PROFILE) up -d


# ── Stop ─────────────────────────────────────────────────────────────────────

down: ## Stop all containers (all profiles)
	$(COMPOSE) $(BASE) $(OBS) $(DEV_PROFILE) down
	$(COMPOSE) $(BASE) $(PROD_PROFILE) down 2>/dev/null || true

obs-down: ## Stop observability sidecar only
	$(COMPOSE) $(BASE) $(OBS) $(DEV_PROFILE) down

# ── Logs ─────────────────────────────────────────────────────────────────────

logs: ## Tail logs from all running containers
	$(COMPOSE) $(BASE) $(OBS) $(DEV_PROFILE) logs -f

logs-be: ## Tail backend-dev logs only
	$(COMPOSE) $(BASE) $(DEV_PROFILE) logs -f backend-dev

logs-fe: ## Tail frontend-dev logs only
	$(COMPOSE) $(BASE) $(DEV_PROFILE) logs -f frontend-dev

logs-obs: ## Tail observability stack logs (collector, loki, tempo, grafana)
	$(COMPOSE) $(BASE) $(OBS) $(DEV_PROFILE) logs -f otel-collector loki tempo grafana prometheus

# ── Status ───────────────────────────────────────────────────────────────────

ps: ## Show status of all containers
	$(COMPOSE) $(BASE) $(OBS) $(DEV_PROFILE) ps

# ── Build ────────────────────────────────────────────────────────────────────

build: ## Rebuild all images without cache
	$(COMPOSE) $(BASE) $(DEV_PROFILE) build --no-cache

build-be: ## Rebuild backend image only
	$(COMPOSE) $(BASE) $(DEV_PROFILE) build --no-cache backend-dev

build-fe: ## Rebuild frontend image only
	$(COMPOSE) $(BASE) $(DEV_PROFILE) build --no-cache frontend-dev

# ── Shells ───────────────────────────────────────────────────────────────────

shell-be: ## Open a bash shell in the running backend-dev container
	$(COMPOSE) $(BASE) $(DEV_PROFILE) exec backend-dev bash

shell-fe: ## Open a sh shell in the running frontend-dev container
	$(COMPOSE) $(BASE) $(DEV_PROFILE) exec frontend-dev sh

# ── Clean ────────────────────────────────────────────────────────────────────

clean: ## Stop containers and delete all volumes (WARNING: destroys Grafana/Loki/Tempo data — run grafana-export first!)
	@echo "⚠  This will delete all Grafana dashboards not saved to infra/grafana/dashboards/."
	@echo "   Run 'make grafana-export' first to back them up. Press Ctrl-C to abort, Enter to proceed."
	@read _
	$(COMPOSE) $(BASE) $(OBS) $(DEV_PROFILE) down -v
	$(COMPOSE) $(BASE) $(PROD_PROFILE) down -v 2>/dev/null || true

grafana-export: ## Export all Grafana dashboards to infra/grafana/dashboards/ (run before make clean)
	@mkdir -p infra/grafana/dashboards
	@echo "Exporting dashboards from http://localhost:3001 ..."
	@curl -sf "http://localhost:3001/api/search?type=dash-db" \
	  | python3 -c "import sys,json; [print(d['uid'],d['title'].replace('/','_').replace(' ','_')) for d in json.load(sys.stdin) if d.get('uid')]" \
	  | while read uid title; do \
	      out="infra/grafana/dashboards/$${title}.json"; \
	      curl -sf "http://localhost:3001/api/dashboards/uid/$$uid" \
	        | python3 -c "import sys,json; d=json.load(sys.stdin)['dashboard']; d.pop('id',None); d.pop('version',None); print(json.dumps(d,indent=2))" \
	        > "$$out" && echo "  ✓ $$title → $$out"; \
	    done
	@echo "Done. Commit infra/grafana/dashboards/ to git."

# ── Help ─────────────────────────────────────────────────────────────────────

help: ## List all available targets
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
