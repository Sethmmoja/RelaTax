# Build from the monorepo root: docker build -f apps/api/Dockerfile -t relatax-api .
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

# ---- Prune the monorepo down to just what @relatax/api needs ----
FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune @relatax/api --docker

# ---- Install deps for the pruned subset, then build ----
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm --filter @relatax/api prisma:generate
RUN npx turbo run build --filter=@relatax/api

# ---- Slim runtime image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 relatax
COPY --from=installer /app .
USER relatax
EXPOSE 4000
CMD ["node", "apps/api/dist/src/main.js"]
