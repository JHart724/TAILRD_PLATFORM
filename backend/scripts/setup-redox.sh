#!/bin/bash

# TAILRD Platform - Redox Setup Script
# Configures Redox webhook endpoints and validates EMR connections

set -e

echo "🏥 TAILRD Platform - Redox Configuration Setup"
echo "=============================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found. Please copy .env.example to .env and configure your variables.${NC}"
    exit 1
fi

# Load environment variables
source .env

echo -e "${BLUE}📋 Redox Configuration Checklist${NC}"
echo "================================="

# Validate required environment variables
echo -e "${YELLOW}🔍 Validating environment variables...${NC}"

required_vars=("REDOX_API_KEY" "REDOX_SECRET" "REDOX_SOURCE_ID" "REDOX_WEBHOOK_SECRET")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo -e "   - $var"
    done
    echo ""
    echo -e "${YELLOW}Please configure these variables in your .env file:${NC}"
    echo "REDOX_API_KEY=your_redox_api_key"
    echo "REDOX_SECRET=your_redox_secret"
    echo "REDOX_SOURCE_ID=your_redox_source_id"
    echo "REDOX_WEBHOOK_SECRET=your_webhook_verification_secret"
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables are set${NC}"

# Test Redox API connectivity
echo -e "${YELLOW}🔗 Testing Redox API connectivity...${NC}"

response=$(curl -s -w "%{http_code}" -X GET \
    "${REDOX_API_URL:-https://api.redoxengine.com}/endpoint" \
    -H "Authorization: Bearer $REDOX_API_KEY" \
    -o /tmp/redox_test.json)

if [ "$response" == "200" ] || [ "$response" == "401" ]; then
    echo -e "${GREEN}✅ Redox API is reachable${NC}"
else
    echo -e "${RED}❌ Failed to connect to Redox API (HTTP $response)${NC}"
    echo -e "${YELLOW}Please check your REDOX_API_URL and network connectivity${NC}"
fi

# Create webhook configuration file
echo -e "${YELLOW}📝 Creating webhook configuration...${NC}"

cat > webhook-config.json << EOF
{
  "webhook": {
    "url": "${API_BASE_URL:-http://localhost:3001/api}/webhooks/redox",
    "secret": "$REDOX_WEBHOOK_SECRET",
    "events": [
      "PatientAdmin.Admission",
      "PatientAdmin.Discharge",
      "PatientAdmin.Transfer",
      "Results.NewResult",
      "Orders.NewOrder",
      "ClinicalSummary.PatientPush",
      "Notes.New",
      "Scheduling.New"
    ]
  },
  "dataModels": {
    "PatientAdmin": {
      "eventTypes": ["Admission", "Discharge", "Transfer"],
      "description": "Patient admission, discharge, and transfer events"
    },
    "Results": {
      "eventTypes": ["NewResult"],
      "description": "Lab results and diagnostic reports"
    },
    "Orders": {
      "eventTypes": ["NewOrder"],
      "description": "Medication and lab orders"
    },
    "ClinicalSummary": {
      "eventTypes": ["PatientPush"],
      "description": "Clinical summary documents"
    }
  }
}
EOF

echo -e "${GREEN}✅ Webhook configuration created: webhook-config.json${NC}"

# Test webhook endpoint
echo -e "${YELLOW}🧪 Testing webhook endpoint...${NC}"

webhook_url="${API_BASE_URL:-http://localhost:3001/api}/webhooks/redox"

# Send test webhook
test_payload='{
  "Meta": {
    "DataModel": "PatientAdmin",
    "EventType": "Admission",
    "EventDateTime": "2024-10-31T10:30:00.000Z",
    "Test": true,
    "FacilityCode": "TEST_FACILITY",
    "Source": {
      "ID": "'$REDOX_SOURCE_ID'"
    }
  },
  "Patient": {
    "Identifiers": [{
      "ID": "TEST123",
      "IDType": "MR"
    }],
    "Demographics": {
      "FirstName": "John",
      "LastName": "Doe",
      "DOB": "1980-01-15",
      "Sex": "Male"
    }
  },
  "Visit": {
    "VisitNumber": "V123456789",
    "Location": {
      "Type": "Inpatient",
      "Facility": "TEST_FACILITY",
      "Department": "Cardiology"
    }
  }
}'

response=$(curl -s -w "%{http_code}" -X POST "$webhook_url" \
    -H "Content-Type: application/json" \
    -H "verification-token: $REDOX_WEBHOOK_SECRET" \
    -d "$test_payload" \
    -o /tmp/webhook_test.json)

if [ "$response" == "200" ]; then
    echo -e "${GREEN}✅ Webhook endpoint is working correctly${NC}"
    webhook_response=$(cat /tmp/webhook_test.json)
    echo -e "${BLUE}Response: $webhook_response${NC}"
else
    echo -e "${RED}❌ Webhook test failed (HTTP $response)${NC}"
    if [ -f /tmp/webhook_test.json ]; then
        echo -e "${YELLOW}Response: $(cat /tmp/webhook_test.json)${NC}"
    fi
    echo -e "${YELLOW}Make sure your backend server is running on $webhook_url${NC}"
fi

# Test health check endpoint
echo -e "${YELLOW}🏥 Testing health check endpoint...${NC}"

health_url="${API_BASE_URL:-http://localhost:3001/api}/webhooks/redox/health"
response=$(curl -s -w "%{http_code}" -X GET "$health_url" -o /tmp/health_test.json)

if [ "$response" == "200" ]; then
    echo -e "${GREEN}✅ Health check endpoint is working${NC}"
    health_response=$(cat /tmp/health_test.json)
    echo -e "${BLUE}Health Status: $health_response${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP $response)${NC}"
fi

# Generate Redox configuration summary
echo -e "${YELLOW}📊 Generating configuration summary...${NC}"

cat > redox-setup-summary.md << EOF
# Redox Configuration Summary

## ✅ Setup Status
- Environment variables: Configured
- API connectivity: $([ "$response" == "200" ] && echo "✅ Connected" || echo "❌ Failed")
- Webhook endpoint: $([ "$response" == "200" ] && echo "✅ Working" || echo "❌ Failed")
- Health check: $([ "$response" == "200" ] && echo "✅ Working" || echo "❌ Failed")

## 🔧 Configuration Details
- **Webhook URL**: $webhook_url
- **API Base URL**: ${REDOX_API_URL:-https://api.redoxengine.com}
- **Source ID**: $REDOX_SOURCE_ID
- **Environment**: ${NODE_ENV:-development}

## 📡 Supported Data Models
1. **PatientAdmin** - Admissions, discharges, transfers
2. **Results** - Lab results and diagnostic reports
3. **Orders** - Medication orders, lab orders
4. **ClinicalSummary** - Patient clinical summaries
5. **Notes** - Clinical notes and documentation
6. **Scheduling** - Appointment scheduling

## 🚨 Clinical Alert Rules
- **Troponin I**: Critical >0.04 ng/mL, Warning >0.014 ng/mL
- **BNP**: Critical >400 pg/mL, Warning >100 pg/mL
- **NT-proBNP**: Critical >1800 pg/mL, Warning >450 pg/mL
- **Potassium**: Critical <3.0 or >6.0 mEq/L, Warning <3.5 or >5.5 mEq/L

## 📋 Next Steps
1. Register webhook URL in Redox console: $webhook_url
2. Configure facility codes in Redox
3. Test with real EMR data
4. Monitor webhook processing logs
5. Validate clinical alerts

## 🔗 Useful Links
- Redox Developer Console: https://developer.redoxengine.com
- TAILRD Webhook Config: ./webhook-config.json
- Backend Health Check: $health_url

Generated on: $(date)
EOF

echo -e "${GREEN}✅ Configuration summary saved: redox-setup-summary.md${NC}"

# Display next steps
echo ""
echo -e "${BLUE}🎯 Next Steps${NC}"
echo "============="
echo "1. 📝 Register your webhook URL in Redox Developer Console:"
echo "   URL: $webhook_url"
echo "   Secret: $REDOX_WEBHOOK_SECRET"
echo ""
echo "2. 🔧 Configure facility codes in Redox for your hospitals"
echo ""
echo "3. 🧪 Test with real EMR data from a pilot hospital"
echo ""
echo "4. 📊 Monitor webhook processing in logs:"
echo "   tail -f logs/combined.log | grep 'Redox Webhook'"
echo ""
echo "5. 🚨 Validate clinical alerts are working:"
echo "   curl $health_url"
echo ""

# Clean up temporary files
rm -f /tmp/redox_test.json /tmp/webhook_test.json /tmp/health_test.json

echo -e "${GREEN}🎉 Redox setup complete! Your TAILRD platform is ready for EMR integration.${NC}"