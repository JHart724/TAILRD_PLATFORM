# TAILRD Platform Backend - Production Docker Image
# Single-stage build optimized for cross-platform buildx (ARM64 → amd64)

FROM node:18-slim

# Prisma requires OpenSSL
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install ALL deps (need devDeps for Prisma generate + tsc)
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/

RUN npm run build

# Keep all deps -- npm prune removes .prisma/client which is needed at runtime
# Image size is larger but Prisma works correctly

# Create non-root user for runtime security
RUN groupadd --gid 1001 tailrd && \
    useradd --uid 1001 --gid tailrd --shell /bin/false --create-home tailrd

# Create directories owned by tailrd
RUN mkdir -p logs backups uploads && chown -R tailrd:tailrd /app

# Switch to non-root user
USER tailrd

# Expose port
EXPOSE 3001

# Health check using Node (no curl needed)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start
CMD ["node", "dist/server.js"]

LABEL maintainer="TAILRD Platform Team"
LABEL description="TAILRD Platform Backend - HIPAA-compliant cardiovascular AI intelligence"
