# Build from the monorepo root: docker build -f apps/web/Dockerfile -t relatax-web .
FROM node:24-alpine AS base
RUN corepack enable

# ---- Prune the monorepo down to just what @relatax/web needs ----
FROM base AS pruner
WORKDIR /app
COPY . .
RUN npx turbo prune @relatax/web --docker

# ---- Install deps for the pruned subset, then build ----
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
COPY tsconfig.base.json ./tsconfig.base.json

# Next.js inlines NEXT_PUBLIC_* into the client bundle at build time, so this
# has to be present now — not at container start. Without it the build bakes in
# the localhost fallback and every browser on the live site calls the visitor's
# own machine. Pass it with --build-arg (docker-compose.prod.yml does).
ARG NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npx turbo run build --filter=@relatax/web

# ---- Slim runtime image (Next.js standalone output) ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=installer /app/apps/web/.next/standalone ./
COPY --from=installer /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
ENV PORT=3000
# Next.js standalone binds to $HOSTNAME, and Docker sets HOSTNAME to the
# container id — which makes the server listen on the container's IP alone,
# so nothing inside the container (a healthcheck, an exec) can reach it on
# localhost. Bind all interfaces instead.
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
