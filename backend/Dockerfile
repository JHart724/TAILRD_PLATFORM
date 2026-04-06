# TAILRD Platform Backend - Production Docker Image
# Multi-stage build for optimized production deployment

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (devDeps needed for TypeScript compilation)
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Build the application
RUN npm run build

# Production stage (slim instead of alpine for cross-platform buildx compatibility)
FROM node:18-slim AS production

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m tailrd

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy environment and configuration files
COPY .env.example .env.example
# COPY scripts/setup-database-schema.sql ./scripts/  # Prisma manages schema

# Create necessary directories
RUN mkdir -p logs backups uploads

# Set correct permissions
RUN chown -R tailrd:nodejs /app
RUN chmod +x scripts/*.sh 2>/dev/null || true

# Switch to non-root user
USER tailrd

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application
CMD ["npm", "start"]

# Labels for metadata
LABEL maintainer="TAILRD Platform Team"
LABEL version="1.0.0"
LABEL description="TAILRD Platform Backend - HIPAA-compliant healthcare analytics"
LABEL org.opencontainers.image.title="TAILRD Backend"
LABEL org.opencontainers.image.description="Production-ready backend API for TAILRD healthcare platform"
LABEL org.opencontainers.image.vendor="TAILRD Platform"
LABEL org.opencontainers.image.version="1.0.0"