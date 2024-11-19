FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm -s dlx turbo prune readon.app --docker

FROM base AS installer
WORKDIR /app

COPY --from=builder /app/out/json/ .
RUN pnpm install

COPY --from=builder /app/out/full/ .

# Uncomment and use build args to enable remote caching
ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM

ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN

RUN pnpm build --filter=readon.app...

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/web/readon.app/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/web/readon.app/.next/static ./web/readon.app/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/web/readon.app/public ./web/readon.app/public

CMD node web/readon.app/server.js
