# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

WORKDIR /app

# Copy root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy workspace packages
COPY packages ./packages
COPY web/readon.app ./web/readon.app

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the app
RUN pnpm readon.app build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/web/readon.app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/readon.app/.next/static ./web/readon.app/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/readon.app/public ./web/readon.app/public

USER nextjs

EXPOSE 3000

# Start the application
CMD ["node", "server.js"]