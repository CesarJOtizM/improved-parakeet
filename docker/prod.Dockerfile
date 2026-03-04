# Multi-stage build para optimizar el tamaño final
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Install ALL dependencies (devDependencies needed for nest build + swc)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client and build the application
RUN bun run db:generate && bun run build

# Production stage
FROM oven/bun:1.1-alpine AS production

WORKDIR /app

# Install curl for health check and create non-root user
RUN apk add --no-cache curl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Install only production dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy Prisma schema + migrations (needed for prisma migrate deploy)
COPY --from=builder /app/src/infrastructure/database/prisma ./src/infrastructure/database/prisma
COPY --from=builder /app/src/infrastructure/database/migrations ./src/infrastructure/database/migrations

# Generate Prisma client in production context
RUN bunx prisma generate --schema=./src/infrastructure/database/prisma/schema.prisma

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Set ownership and switch to non-root user
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the application
CMD ["bun", "run", "start:prod"]
