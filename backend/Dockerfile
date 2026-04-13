# TAILRD Platform Backend — Multi-Stage Production Docker Image
# FINDING-9-001: Two-stage build excludes devDependencies from runner (~350MB reduction)

# ── Stage 1: Builder ────────���─────────────────────────────────────
FROM node:18-slim AS builder

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/

RUN npx tsc

# ── Stage 2: Runner ───────���───────────────────────────────────────
FROM node:18-slim AS runner

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Non-root user
RUN groupadd --gid 1001 tailrd && \
    useradd --uid 1001 --gid tailrd --shell /bin/bash --create-home tailrd

# Production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output and Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma/ ./prisma/

RUN chown -R tailrd:tailrd /app

USER tailrd

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
