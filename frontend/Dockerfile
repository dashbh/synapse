# ── Stage 1: base ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# ── Stage 2: dev ──────────────────────────────────────────────────────────────
# Source is bind-mounted at runtime — not copied here.
# node_modules stays in the image (Linux binaries; never overridden by host mount).
FROM base AS dev
RUN npm ci
EXPOSE 3000
# npm run dev triggers predev → generateTokens.mjs → next dev
CMD ["npm", "run", "dev"]

# ── Stage 3: prod-builder ─────────────────────────────────────────────────────
FROM base AS prod-builder
ENV NODE_ENV=production
RUN npm ci
COPY . .
# prebuild runs generateTokens.mjs → next build → produces .next/standalone
RUN npm run build

# ── Stage 4: prod ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-builder /app/.next/standalone ./
# static assets and public/ are not included in standalone by default
COPY --from=prod-builder /app/.next/static ./.next/static
COPY --from=prod-builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
