# TAILRD Backend Testing Guide

## 🚀 Quick Start Testing

The backend is now running on `http://localhost:3001`. Here's how to test it:

### 1. Basic Health Check Tests

**Test the health endpoint:**
```bash
curl http://localhost:3001/health
```

**Test the API status endpoint:**
```bash
curl http://localhost:3001/api/status
```

### 2. Redox Webhook Testing

**Test webhook status:**
```bash
curl http://localhost:3001/api/webhooks/redox/status
```

**Test webhook endpoint (without signature):**
```bash
curl -X POST http://localhost:3001/api/webhooks/redox/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 3. Sample FHIR Data Testing

**Test with a sample heart failure patient webhook:**
```bash
curl -X POST http://localhost:3001/api/webhooks/redox/test \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "NewPatient",
    "EventDateTime": "2024-10-31T20:00:00.000Z",
    "Test": true,
    "Patient": {
      "resourceType": "Patient",
      "id": "patient-123",
      "name": [{"family": "Johnson", "given": ["Mary"]}],
      "gender": "female",
      "birthDate": "1975-03-15",
      "identifier": [{"use": "usual", "value": "MRN123456"}]
    }
  }'
```

**Test with sample lab results:**
```bash
curl -X POST http://localhost:3001/api/webhooks/redox/test \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "Results",
    "EventDateTime": "2024-10-31T20:00:00.000Z",
    "Test": true,
    "Results": [{
      "resourceType": "Observation",
      "id": "obs-123",
      "code": {
        "coding": [{"system": "http://loinc.org", "code": "33747-0", "display": "BNP"}]
      },
      "valueQuantity": {"value": 450, "unit": "pg/mL"},
      "status": "final"
    }]
  }'
```

### 4. Rate Limiting Test

**Test rate limiting (run this multiple times quickly):**
```bash
for i in {1..10}; do curl http://localhost:3001/api/status; done
```

### 5. Browser Testing

Open these URLs in your browser:
- Health Check: http://localhost:3001/health
- API Status: http://localhost:3001/api/status
- Webhook Status: http://localhost:3001/api/webhooks/redox/status

## 🧪 Advanced Testing

### Using Postman or Similar Tools

1. **Import Collection**: Create a Postman collection with the endpoints above
2. **Test Environment Variables**: Set `{{base_url}}` to `http://localhost:3001`
3. **Test Authentication**: Add bearer tokens when implementing auth endpoints

### Testing Data Transformation

The backend processes FHIR data and determines cardiovascular module assignments:

**Test Patient with Multiple Conditions:**
```json
{
  "EventType": "NewPatient",
  "EventDateTime": "2024-10-31T20:00:00.000Z",
  "Test": false,
  "Patient": {
    "resourceType": "Patient",
    "id": "patient-cv-001",
    "name": [{"family": "Smith", "given": ["John"]}],
    "gender": "male",
    "birthDate": "1960-01-15"
  },
  "Visit": {
    "resourceType": "Encounter",
    "id": "encounter-001",
    "diagnosis": [{
      "condition": {"display": "I50.9 Heart failure, unspecified"},
      "use": {"coding": [{"code": "CC"}]}
    }]
  }
}
```

### Performance Testing

**Test concurrent requests:**
```bash
# Install Apache Bench if needed: brew install httpd
ab -n 100 -c 10 http://localhost:3001/health
```

## 🔍 Monitoring and Logs

### Check Server Logs
The backend logs are visible in your terminal where you ran `npm run dev`. Look for:
- Request logs with timestamps
- Error messages
- FHIR data processing logs

### Sample Log Output
```
info: GET /health {"ip":"::1","service":"tailrd-backend","timestamp":"2024-10-31T20:00:00.000Z"}
info: Successfully transformed FHIR patient {"patientId":"patient-123","service":"patient-service"}
```

## 🛠️ Testing with Real Redox Integration

### Webhook Signature Testing

To test with real Redox signatures, update your `.env` file:

```env
REDOX_WEBHOOK_SECRET=your_actual_webhook_secret
```

Then test with proper signature:
```bash
# Generate signature (you'll need to implement this based on Redox docs)
curl -X POST http://localhost:3001/api/webhooks/redox \
  -H "Content-Type: application/json" \
  -H "X-Redox-Signature: sha256=your_calculated_signature" \
  -d '{"EventType": "NewPatient", "Test": false, ...}'
```

## ⚡ Expected Responses

### Health Check Response
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-10-31T20:00:00.000Z",
    "version": "1.0.0",
    "environment": "development",
    "uptime": 123.456
  },
  "message": "TAILRD Platform Backend is running"
}
```

### Webhook Processing Response
```json
{
  "success": true,
  "message": "Webhook processed successfully for event: NewPatient",
  "timestamp": "2024-10-31T20:00:00.000Z"
}
```

## 🚨 Common Issues

1. **Port 3001 already in use**: Change PORT in `.env` file
2. **CORS errors**: Update CORS_ORIGINS in `.env`
3. **Missing logs directory**: Run `mkdir logs` in backend folder
4. **Rate limit hit**: Wait 15 minutes or restart server

## 🔄 Integration with Frontend

Your React frontend (running on port 3000) can now call:
- `http://localhost:3001/api/patients` - Patient data
- `http://localhost:3001/api/modules` - Module information  
- `http://localhost:3001/api/analytics` - Clinical analytics

## 🎯 Next Steps

1. **Database Integration**: Set up PostgreSQL and implement Prisma schema
2. **Authentication**: Implement JWT-based auth for the API
3. **Real Data**: Connect to actual Redox webhooks
4. **Frontend Integration**: Update React app to use backend APIs
5. **Analytics**: Implement cardiovascular risk scoring algorithms

## 🔐 Security Notes

- Never commit real API keys to git
- Use environment variables for all secrets
- Implement proper authentication before production
- Enable HTTPS in production
- Monitor and log all webhook activity