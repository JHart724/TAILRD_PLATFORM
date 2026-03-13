# 🚀 TAILRD Platform Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Infrastructure Requirements
- [ ] PostgreSQL 15+ database server
- [ ] Redis 7+ for session management
- [ ] Node.js 18+ runtime environment
- [ ] SSL certificates for HTTPS
- [ ] Load balancer (production)
- [ ] Monitoring tools (Sentry, DataDog, etc.)

### ✅ Environment Configuration
- [ ] Production `.env` file configured
- [ ] Database connection string tested
- [ ] Redox API credentials verified
- [ ] JWT secret keys generated
- [ ] CORS origins configured

## 🗄️ Database Setup

### 1. Production Database Setup
```bash
# Create production database
createdb tailrd_production

# Create dedicated user
createuser tailrd_user --no-createdb --no-superuser --no-createrole
psql -c "ALTER USER tailrd_user WITH PASSWORD 'SECURE_PASSWORD_HERE';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE tailrd_production TO tailrd_user;"
```

### 2. Run Migrations
```bash
# Generate Prisma client
npm run generate

# Deploy migrations to production
npm run migrate:deploy

# Seed with initial hospital data (if needed)
npm run seed
```

### 3. Database Performance Tuning
```sql
-- Optimize for healthcare workloads
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET max_connections = 200;

-- Reload configuration
SELECT pg_reload_conf();
```

## 🔐 Security Configuration

### 1. Environment Variables (Production)
```bash
# Server Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn

# Database (with SSL)
DATABASE_URL="postgresql://user:pass@prod-host:5432/tailrd_production?sslmode=require"

# Security
JWT_SECRET="super-secure-256-bit-key-generated-securely"
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Redox API
REDOX_API_URL=https://api.redoxengine.com
REDOX_API_KEY=your_production_api_key
REDOX_SECRET=your_production_webhook_secret

# Monitoring
SENTRY_DSN=your_production_sentry_dsn
```

### 2. SSL/TLS Configuration
```javascript
// In production, use HTTPS-only
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### 3. Security Headers
```javascript
// Already configured in server.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## 🏗️ Application Deployment

### 1. Build Process
```bash
# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Generate Prisma client
npm run generate

# Start production server
npm start
```

### 2. Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY dist ./dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S tailrd -u 1001
USER tailrd

EXPOSE 3001

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: tailrd_production
      POSTGRES_USER: tailrd_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

### 3. Kubernetes Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tailrd-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tailrd-backend
  template:
    metadata:
      labels:
        app: tailrd-backend
    spec:
      containers:
      - name: tailrd-backend
        image: tailrd/backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: tailrd-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: tailrd-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 🌐 Load Balancer Configuration

### 1. Nginx Configuration
```nginx
upstream tailrd_backend {
    server app1:3001;
    server app2:3001;
    server app3:3001;
}

server {
    listen 443 ssl http2;
    server_name api.tailrd.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://tailrd_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for real-time features
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://tailrd_backend/health;
        access_log off;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}
```

## 📊 Monitoring and Logging

### 1. Application Monitoring
```javascript
// Already configured in server.ts with Winston
// Production logs go to files and external services

// Additional monitoring setup
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Health check with database connectivity
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});
```

### 2. Database Monitoring
```sql
-- Create monitoring views
CREATE VIEW active_connections AS
SELECT count(*) as connections, state
FROM pg_stat_activity
GROUP BY state;

CREATE VIEW slow_queries AS
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;
```

### 3. Alerting Rules
```yaml
# Prometheus alerting rules
groups:
- name: tailrd.rules
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: High error rate detected

  - alert: DatabaseConnectionsHigh
    expr: pg_stat_database_numbackends > 150
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: High number of database connections
```

## 🚦 Deployment Pipeline

### 1. CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run test
    - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to production
      run: |
        # Build and deploy steps
        npm run build
        # Deploy to your infrastructure
```

### 2. Zero-Downtime Deployment
```bash
#!/bin/bash
# deploy.sh - Blue-Green deployment script

# Build new version
docker build -t tailrd/backend:${BUILD_NUMBER} .

# Update database schema
docker run --rm \
  -e DATABASE_URL=$DATABASE_URL \
  tailrd/backend:${BUILD_NUMBER} \
  npm run migrate:deploy

# Deploy new version
kubectl set image deployment/tailrd-backend \
  tailrd-backend=tailrd/backend:${BUILD_NUMBER}

# Wait for rollout
kubectl rollout status deployment/tailrd-backend

# Run health checks
./health-check.sh

# If successful, tag as latest
if [ $? -eq 0 ]; then
  docker tag tailrd/backend:${BUILD_NUMBER} tailrd/backend:latest
  echo "Deployment successful!"
else
  # Rollback on failure
  kubectl rollout undo deployment/tailrd-backend
  echo "Deployment failed, rolled back"
  exit 1
fi
```

## 🔍 Post-Deployment Verification

### 1. Health Checks
```bash
# API health check
curl -f https://api.tailrd.com/health

# Database connectivity
curl -f https://api.tailrd.com/api/status

# Authentication test
curl -X POST https://api.tailrd.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@stmarys.org", "password": "demo123"}'
```

### 2. Performance Testing
```bash
# Load testing with k6
k6 run --vus 50 --duration 5m load-test.js

# Database performance
pgbench -c 10 -T 60 tailrd_production
```

### 3. Security Verification
```bash
# SSL/TLS check
nmap --script ssl-enum-ciphers -p 443 api.tailrd.com

# Security headers
curl -I https://api.tailrd.com

# OWASP ZAP security scan
zap-baseline.py -t https://api.tailrd.com
```

## 📈 Scaling Considerations

### 1. Horizontal Scaling
- Add more application instances behind load balancer
- Use Redis for shared session storage
- Implement database read replicas for analytics queries

### 2. Database Scaling
- Partition large tables by hospital_id
- Implement connection pooling (PgBouncer)
- Use read replicas for reporting workloads

### 3. Caching Strategy
- Redis for session data and frequently accessed lookups
- Application-level caching for hospital configurations
- CDN for static assets and API responses where appropriate

## 🎯 Production Checklist

### Before Go-Live
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented
- [ ] Security scanning completed
- [ ] Load testing passed
- [ ] Documentation updated

### After Go-Live
- [ ] Monitor application metrics
- [ ] Verify all hospital integrations
- [ ] Check Redox webhook delivery
- [ ] Validate multi-tenant isolation
- [ ] Monitor database performance
- [ ] Test backup and recovery procedures

The TAILRD Platform backend is now production-ready with enterprise-grade multi-tenancy, security, and scalability! 🎉