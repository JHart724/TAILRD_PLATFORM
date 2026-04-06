# TAILRD Platform Backend - Production Docker Image

FROM node:18-slim

# Prisma requires OpenSSL at runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install all dependencies (devDeps needed for prisma generate + tsc)
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Build TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/
RUN npm run build

# Create directories
RUN mkdir -p logs backups uploads

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "dist/server.js"]
