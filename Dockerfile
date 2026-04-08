# ══════════════════════════════════════════════════════════════════════════════
# MiniMarket API — Multi-stage Docker build
# NestJS + Prisma 7 (PrismaPg adapter) + PostgreSQL
#
# Prisma 7 carga prisma.config.ts con su propio TS loader nativo.
# No necesita ts-node ni compilar a JS.
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm install --legacy-peer-deps
RUN npx prisma generate

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY package.json tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma.config.ts ./
COPY src ./src

RUN npm run build

# ── Stage 3: Production dependencies only ────────────────────────────────────
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm install --legacy-peer-deps --omit=dev
RUN npx prisma generate

RUN rm -rf node_modules/@types/react \
           node_modules/@types/react-dom \
           node_modules/.package-lock.json

# ── Stage 4: Final image ────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy runtime files
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY prisma.config.ts ./
COPY package.json ./

USER appuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/docs || exit 1

CMD ["node", "dist/main.js"]
