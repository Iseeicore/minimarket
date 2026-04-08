# ══════════════════════════════════════════════════════════════════════════════
# MiniMarket API — Multi-stage Docker build
# NestJS + Prisma 7 (PrismaPg adapter) + PostgreSQL
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Eliminar devDeps
RUN npm prune --omit=dev
RUN npx prisma generate

# wget para HEALTHCHECK
RUN apk add --no-cache wget

# Código compilado
COPY --from=builder /app/dist ./dist

USER appuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 -O /dev/null http://localhost:3000/api/docs || exit 1

# Migraciones antes de levantar — exec reemplaza sh con node (PID 1)
ENTRYPOINT ["/bin/sh", "-c", "echo DATABASE_URL=$DATABASE_URL | head -c 40 && echo '...' && npx prisma migrate deploy && exec node dist/main.js"]
# cache-bust: 1775615166
