# TAILRD Platform Backend - Production Docker Image
# Single-stage build optimized for cross-platform buildx (ARM64 → amd64)

FROM node:18-slim

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

# Remove devDependencies after build
RUN npm prune --production

# Copy config
COPY .env.example .env.example

# Create directories
RUN mkdir -p logs backups uploads

# Expose port
EXPOSE 3001

# Health check using Node (no curl needed)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start
CMD ["node", "dist/server.js"]

LABEL maintainer="TAILRD Platform Team"
LABEL description="TAILRD Platform Backend - HIPAA-compliant cardiovascular AI intelligence"
