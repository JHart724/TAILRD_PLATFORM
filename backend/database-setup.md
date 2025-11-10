# 🗄️ Database Setup Guide

## Prerequisites

### 1. PostgreSQL Installation
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Docker (recommended for development)
docker run --name tailrd-postgres \
  -e POSTGRES_DB=tailrd_platform \
  -e POSTGRES_USER=tailrd_user \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  -d postgres:15
```

### 2. Redis Installation (for session management)
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run --name tailrd-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

## Database Configuration

### 1. Environment Setup
```bash
# Copy the example environment file
cp .env.example .env

# Update the DATABASE_URL with your credentials
DATABASE_URL="postgresql://tailrd_user:secure_password@localhost:5432/tailrd_platform"
```

### 2. Initialize Database
```bash
# Generate Prisma client
npx prisma generate

# Create and run migrations
npx prisma migrate dev --name init

# Seed the database with demo data
npx prisma db seed
```

### 3. Reset Database (if needed)
```bash
# Reset database and apply all migrations
npx prisma migrate reset

# Or for production (without seed data)
npx prisma migrate deploy
```

## Production Deployment

### 1. Database Migration Strategy
```bash
# In production, always use deploy command
npx prisma migrate deploy

# Never use 'dev' commands in production
# 'migrate dev' is only for development
```

### 2. Production Environment Variables
```bash
# Production database connection
DATABASE_URL="postgresql://username:password@prod-host:5432/tailrd_production?sslmode=require"

# Connection pooling (recommended)
DATABASE_URL="postgresql://username:password@prod-host:5432/tailrd_production?sslmode=require&connection_limit=20&pool_timeout=20"
```

### 3. Multi-Tenant Database Architecture

#### Option A: Shared Database, Row-Level Security (Recommended)
```sql
-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- Create policy for hospital isolation
CREATE POLICY hospital_isolation_patients ON patients
  FOR ALL TO hospital_users
  USING (hospital_id = current_setting('app.current_hospital'));
```

#### Option B: Schema-per-Hospital
```sql
-- Create separate schemas for each hospital
CREATE SCHEMA hospital_hosp001;
CREATE SCHEMA hospital_hosp002;

-- Grant access to hospital-specific users
GRANT USAGE ON SCHEMA hospital_hosp001 TO hosp001_users;
```

#### Option C: Database-per-Hospital (Enterprise)
```bash
# Separate databases for large hospitals
DATABASE_URL_HOSP001="postgresql://user:pass@host:5432/tailrd_hosp001"
DATABASE_URL_HOSP002="postgresql://user:pass@host:5432/tailrd_hosp002"
```

## Performance Optimization

### 1. Database Indexes
```sql
-- Patient lookup indexes
CREATE INDEX idx_patients_hospital_mrn ON patients(hospital_id, mrn);
CREATE INDEX idx_patients_hospital_active ON patients(hospital_id, is_active);

-- Encounter indexes
CREATE INDEX idx_encounters_patient_date ON encounters(patient_id, start_date_time);
CREATE INDEX idx_encounters_hospital_date ON encounters(hospital_id, start_date_time);

-- Observation indexes
CREATE INDEX idx_observations_patient_type ON observations(patient_id, observation_type);
CREATE INDEX idx_observations_date ON observations(observed_date_time);

-- Alert indexes
CREATE INDEX idx_alerts_patient_active ON alerts(patient_id, is_acknowledged, resolved_at);
CREATE INDEX idx_alerts_hospital_severity ON alerts(hospital_id, severity, triggered_at);
```

### 2. Connection Pooling
```javascript
// Use PgBouncer or built-in Prisma connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

## Monitoring and Backup

### 1. Database Monitoring
```sql
-- Query performance monitoring
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Connection monitoring
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;
```

### 2. Backup Strategy
```bash
# Daily automated backups
pg_dump -h localhost -U tailrd_user -d tailrd_platform > backup_$(date +%Y%m%d).sql

# Point-in-time recovery setup
# Enable WAL archiving in postgresql.conf
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

## Security Considerations

### 1. Network Security
```bash
# Restrict database access
# In postgresql.conf:
listen_addresses = 'localhost,10.0.0.100'

# In pg_hba.conf:
hostssl tailrd_platform tailrd_user 10.0.0.0/8 md5
```

### 2. Encryption
```bash
# Enable SSL in production
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Certificate-based authentication
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&sslcert=client.crt&sslkey=client.key&sslrootcert=ca.crt"
```

### 3. Audit Logging
```sql
-- Enable audit logging for compliance
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Log all DML operations on sensitive tables
ALTER TABLE patients SET (pgaudit.log = 'write');
ALTER TABLE observations SET (pgaudit.log = 'write');
```

## Scaling Considerations

### 1. Read Replicas
```javascript
// Separate read/write connections
const masterDB = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_MASTER_URL } }
});

const replicaDB = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_REPLICA_URL } }
});
```

### 2. Horizontal Sharding
```javascript
// Shard by hospital_id for large scale
const getShardedDB = (hospitalId) => {
  const shard = hospitalId.slice(-1); // Use last digit
  return shardedConnections[shard];
};
```

## Troubleshooting

### Common Issues
```bash
# Connection limit exceeded
# Increase max_connections in postgresql.conf
max_connections = 200

# Slow queries
# Enable query logging
log_min_duration_statement = 1000

# Lock contention
# Monitor locks
SELECT * FROM pg_locks WHERE NOT granted;
```