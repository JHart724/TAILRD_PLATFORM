# TAILRD Platform Backend

Production-ready backend API for TAILRD healthcare platform with real-time EMR integration via Redox.

## 🏥 Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   EMR Systems   │    │   Redox Engine   │    │ TAILRD Backend  │
│                 │    │                  │    │                 │
│ • Epic          │◄──►│ • Data Transform │◄──►│ • Webhook API   │
│ • Cerner        │    │ • FHIR Support   │    │ • Analytics     │
│ • AllScripts    │    │ • Real-time      │    │ • Alerts        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   Cloudticity   │
                                               │                 │
                                               │ • HIPAA Cloud   │
                                               │ • PostgreSQL    │
                                               │ • Redis Cache   │
                                               └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- TypeScript
- PostgreSQL (via Cloudticity)
- Redis (via Cloudticity)
- Redox account and API keys

### Installation

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

3. **Set up database:**
```bash
npm run db:setup
```

4. **Start development server:**
```bash
npm run dev
```

The backend will be available at `http://localhost:3001`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REDOX_API_KEY` | Your Redox API key | ✅ |
| `REDOX_WEBHOOK_SECRET` | Webhook verification secret | ✅ |
| `DATABASE_URL` | Cloudticity PostgreSQL URL | ✅ |
| `REDIS_URL` | Cloudticity Redis URL | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |

### Redox Configuration

1. **Configure webhook endpoint in Redox:**
   - Webhook URL: `https://your-domain.com/api/webhooks/redox`
   - Verification secret: Set in `REDOX_WEBHOOK_SECRET`

2. **Supported data models:**
   - PatientAdmin (admissions, discharges, transfers)
   - Results (lab results, diagnostic reports)
   - Orders (medication orders, lab orders)
   - Clinical Summary
   - Notes
   - Scheduling

## 📡 API Endpoints

### Webhook Endpoints
- `POST /api/webhooks/redox` - Redox EMR webhook
- `GET /api/webhooks/redox/health` - Health check
- `GET /api/webhooks/redox/config` - Configuration info

### Analytics Endpoints
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/hospitals` - Hospital analytics
- `GET /api/analytics/alerts` - Alert analytics
- `GET /api/analytics/performance` - System performance

### Admin Endpoints
- `GET /api/admin/hospitals` - Hospital management
- `GET /api/admin/users` - User management
- `GET /api/admin/system` - System status

## 🏥 EMR Data Processing

### Patient Data Flow

1. **EMR Event** → Redox → **Webhook**
2. **Validation** → Signature verification
3. **Processing** → Data transformation
4. **Storage** → PostgreSQL (Cloudticity)
5. **Analytics** → Real-time metrics
6. **Alerts** → Clinical decision support

### Supported Events

```typescript
// Patient Administration
{
  "Meta": {
    "DataModel": "PatientAdmin",
    "EventType": "Admission" | "Discharge" | "Transfer"
  },
  "Patient": { /* Patient demographics */ },
  "Visit": { /* Visit details */ }
}

// Lab Results
{
  "Meta": {
    "DataModel": "Results",
    "EventType": "NewResult"
  },
  "Orders": [{
    "Results": [{ /* Lab values */ }]
  }]
}
```

## 🚨 Clinical Alerts

### Cardiac Alert Rules

| Test | Critical Threshold | Warning Threshold |
|------|-------------------|-------------------|
| Troponin I | >0.04 ng/mL | >0.014 ng/mL |
| BNP | >400 pg/mL | >100 pg/mL |
| NT-proBNP | >1800 pg/mL | >450 pg/mL |
| Potassium | <3.0 or >6.0 mEq/L | <3.5 or >5.5 mEq/L |

### Alert Categories
- **Critical** - Immediate action required
- **Warning** - Review within 1 hour
- **Info** - For tracking and trends

## 🔒 Security & Compliance

### HIPAA Compliance
- ✅ Data encryption at rest and in transit
- ✅ Audit logging for all PHI access
- ✅ Access controls and authentication
- ✅ PHI/PII scrubbing in logs
- ✅ Cloudticity HIPAA-compliant infrastructure

### Security Features
- JWT authentication with refresh tokens
- Rate limiting (100 req/15min)
- Webhook signature verification
- SQL injection prevention
- XSS protection via Helmet
- CORS configuration

## 📊 Monitoring & Logging

### Log Levels
- **Error** - System errors and exceptions
- **Warn** - Unusual but non-critical events
- **Info** - General application flow
- **Debug** - Detailed debugging info

### Metrics Tracked
- Webhook processing time
- API response times
- Database query performance
- Alert generation rates
- System resource usage

## 🧪 Testing

### Run Tests
```bash
npm test                # Unit tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

### Test Webhook
```bash
curl -X POST http://localhost:3001/api/webhooks/test \\
  -H "Content-Type: application/json" \\
  -d '{
    "dataModel": "PatientAdmin",
    "eventType": "Admission",
    "facilityCode": "TEST_FACILITY"
  }'
```

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure Cloudticity database
- [ ] Set up Redox webhook URLs
- [ ] Configure CloudWatch logging
- [ ] Set up SSL certificates
- [ ] Configure backup schedules
- [ ] Test alert notifications

### Docker Deployment
```bash
docker build -t tailrd-backend .
docker run -p 3001:3001 --env-file .env tailrd-backend
```

### Environment-specific configs
- **Development** - Local PostgreSQL/Redis, mock data enabled
- **Staging** - Cloudticity staging, test EMR connections
- **Production** - Full Cloudticity stack, live EMR data

## 🔄 Data Migration

### From Mock to Real Data
When switching from demo to production:

1. **Update environment:**
```bash
ENABLE_MOCK_DATA=false
REDOX_API_KEY=your_production_key
DATABASE_URL=your_cloudticity_production_url
```

2. **Run migration:**
```bash
npm run migrate:prod
```

3. **Verify connections:**
```bash
npm run verify:redox
npm run verify:database
```

## 📈 Performance

### Optimization Features
- Redis caching for frequent queries
- Database connection pooling
- Async webhook processing
- Batch data processing
- Query optimization

### Scaling Considerations
- Horizontal scaling via load balancer
- Database read replicas
- Redis cluster for cache
- CDN for static assets
- Background job processing

## 🆘 Troubleshooting

### Common Issues

**Webhook signature verification fails:**
```bash
# Check webhook secret
echo $REDOX_WEBHOOK_SECRET
# Verify Redox configuration matches
```

**Database connection timeout:**
```bash
# Check Cloudticity status
# Verify connection string
# Check network connectivity
```

**High memory usage:**
```bash
# Monitor with
npm run monitor:memory
# Check for memory leaks
npm run profile:memory
```

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

## 📞 Support

- **Technical Issues**: Create GitHub issue
- **EMR Integration**: Contact Redox support
- **Infrastructure**: Contact Cloudticity support
- **Clinical Questions**: Contact clinical team

## 🔄 API Versioning

Current version: `v1`
- Breaking changes will increment major version
- New features increment minor version
- Bug fixes increment patch version

Example: `/api/v1/analytics/dashboard`

---

## 🎯 Next Steps

1. **Complete Redox setup** - Configure webhook endpoints
2. **Database migration** - Set up production schema
3. **Test EMR connections** - Verify data flow
4. **Deploy to staging** - Test with real hospital data
5. **Production deployment** - Go live with EMR integration

This backend transforms your demo into a production-ready EMR-connected platform! 🚀