# Multi-stage build for optimized image
# Production-ready Dockerfile with security best practices

# Stage 1: Dependencies
FROM node:18-alpine AS deps

WORKDIR /app

# Install security updates
RUN apk add --no-cache --update dumb-init

# Copy package files
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install dependencies (with caching)
RUN npm ci --frozen-lockfile --only=production && \
    npm cache clean --force

# Stage 2: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install all dependencies for building
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN npm run build && \
    # Verify build output
    test -d dist && test -f dist/server/index.js

# Stage 3: Runtime
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache --update dumb-init curl

# Copy dumb-init from deps stage
COPY --from=deps /usr/bin/dumb-init /usr/bin/dumb-init

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose ports
EXPOSE 3001 5173

# Health check with curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "dist/server/index.js"]
