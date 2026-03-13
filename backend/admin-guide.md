# 🛠️ TAILRD Platform Admin Guide

## 🔑 Super Admin Access

### **Login Credentials**
```
Email: superadmin@tailrd.com
Password: admin123
```

### **Available Admin Functions**
- **Platform Dashboard**: View all hospitals, users, and system metrics
- **Hospital Management**: Create, update, activate/deactivate hospitals
- **User Management**: Manage users across all hospitals
- **Onboarding**: Step-by-step hospital onboarding workflow
- **System Configuration**: Platform-wide settings and configurations

---

## 📊 **Admin Dashboard Overview**

### **GET /api/admin/dashboard**
Get platform-wide statistics and metrics.

```bash
curl -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  http://localhost:3001/api/admin/dashboard
```

**Response includes:**
- Total hospitals (active/inactive)
- Total users (active/inactive) 
- Patient counts and recent additions
- Webhook event statistics
- Alert metrics
- Subscription tier breakdown
- Module usage statistics
- Recent hospital registrations

---

## 🏥 **Hospital Management**

### **1. View All Hospitals**
```bash
# Get all hospitals with search and filtering
curl -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  "http://localhost:3001/api/admin/hospitals?page=1&limit=10&search=St%20Mary&status=active"
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)
- `search`: Search by name, system, or NPI
- `status`: Filter by 'active', 'inactive', or 'all'

### **2. Create New Hospital**
```bash
curl -X POST http://localhost:3001/api/admin/hospitals \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Regional Medical Center",
    "system": "Regional Health Network",
    "npi": "1234567890",
    "patientCount": 250000,
    "bedCount": 400,
    "hospitalType": "COMMUNITY",
    "street": "789 Hospital Ave",
    "city": "Medical City",
    "state": "TX",
    "zipCode": "75001",
    "subscriptionTier": "PROFESSIONAL",
    "maxUsers": 30,
    "modules": {
      "heartFailure": true,
      "coronaryIntervention": true,
      "peripheralVascular": false
    }
  }'
```

### **3. Update Hospital Details**
```bash
curl -X PUT http://localhost:3001/api/admin/hospitals/hosp-003 \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionTier": "ENTERPRISE",
    "maxUsers": 50,
    "moduleElectrophysiology": true
  }'
```

### **4. Activate/Deactivate Hospital**
```bash
curl -X PATCH http://localhost:3001/api/admin/hospitals/hosp-003/status \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

### **5. Get Hospital Details**
```bash
curl -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  http://localhost:3001/api/admin/hospitals/hosp-001
```

---

## 👥 **User Management**

### **1. View All Users**
```bash
# Get users with filtering options
curl -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  "http://localhost:3001/api/admin/users?hospitalId=hosp-001&role=PHYSICIAN&status=active"
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `search`: Search by name, email, or title
- `hospitalId`: Filter by specific hospital
- `role`: Filter by user role
- `status`: Filter by active/inactive status

### **2. Create User for Hospital**
```bash
curl -X POST http://localhost:3001/api/admin/hospitals/hosp-001/users \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@stmarys.org",
    "password": "SecurePass123",
    "firstName": "Dr. Emily",
    "lastName": "Williams",
    "title": "Cardiologist",
    "role": "PHYSICIAN",
    "permissions": {
      "permHeartFailure": true,
      "permCoronaryIntervention": true,
      "permServiceLineView": true,
      "permCareTeamView": true,
      "permAccessPHI": true
    }
  }'
```

### **3. Update User**
```bash
curl -X PUT http://localhost:3001/api/admin/users/user-004 \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Cardiologist",
    "permElectrophysiology": true,
    "permExecutiveView": true
  }'
```

---

## 🚀 **Hospital Onboarding**

### **1. Complete Hospital Onboarding**
```bash
curl -X POST http://localhost:3001/api/onboarding/hospitals \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hospitalInfo": {
      "name": "Metro General Hospital",
      "system": "Metro Health System",
      "npi": "9876543210",
      "patientCount": 180000,
      "bedCount": 300,
      "hospitalType": "COMMUNITY",
      "address": {
        "street": "555 Metro Blvd",
        "city": "Metro City",
        "state": "FL",
        "zipCode": "33101"
      }
    },
    "adminUser": {
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@metro.org",
      "password": "SecurePassword123",
      "title": "Chief Information Officer"
    },
    "subscription": {
      "tier": "PROFESSIONAL",
      "maxUsers": 25
    },
    "modules": {
      "heartFailure": true,
      "coronaryIntervention": true,
      "peripheralVascular": true
    }
  }'
```

### **2. Check Onboarding Status**
```bash
curl -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  http://localhost:3001/api/onboarding/hospitals/hosp-003/status
```

### **3. Update Onboarding Step**
```bash
curl -X PATCH http://localhost:3001/api/onboarding/hospitals/hosp-003/onboarding/redox-setup \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "completed": true,
    "notes": "EHR integration configured successfully"
  }'
```

### **4. Generate API Keys for Hospital**
```bash
curl -X POST http://localhost:3001/api/onboarding/hospitals/hosp-003/api-keys \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN"
```

---

## 🎯 **Testing Admin Functions**

### **Step 1: Login as Super Admin**
```bash
# Login to get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@tailrd.com", "password": "admin123"}' | \
  jq -r '.data.token')

echo "Admin Token: $ADMIN_TOKEN"
```

### **Step 2: View Platform Dashboard**
```bash
# Get platform overview
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/dashboard | jq
```

### **Step 3: Create New Hospital**
```bash
# Create a test hospital
curl -X POST http://localhost:3001/api/admin/hospitals \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Hospital",
    "patientCount": 50000,
    "bedCount": 150,
    "hospitalType": "COMMUNITY",
    "street": "123 Test St",
    "city": "Test City",
    "state": "CA",
    "zipCode": "90210",
    "subscriptionTier": "BASIC",
    "maxUsers": 10
  }' | jq
```

### **Step 4: Complete Hospital Onboarding**
```bash
# Onboard the hospital with admin user
curl -X POST http://localhost:3001/api/onboarding/hospitals \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hospitalInfo": {
      "name": "Rapid Onboard Hospital",
      "patientCount": 75000,
      "bedCount": 200,
      "hospitalType": "COMMUNITY",
      "address": {
        "street": "999 Onboard Ave",
        "city": "Quick City",
        "state": "NY",
        "zipCode": "10001"
      }
    },
    "adminUser": {
      "firstName": "Quick",
      "lastName": "Admin",
      "email": "quick@onboard.org",
      "password": "QuickPass123"
    },
    "subscription": {
      "tier": "PROFESSIONAL",
      "maxUsers": 20
    }
  }' | jq
```

### **Step 5: Create Additional Users**
```bash
# Add a physician to the new hospital
curl -X POST http://localhost:3001/api/admin/hospitals/hosp-004/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "physician@onboard.org",
    "password": "PhysicianPass123",
    "firstName": "Dr. Test",
    "lastName": "Physician",
    "role": "PHYSICIAN"
  }' | jq
```

### **Step 6: Test Access Control**
```bash
# Try to access hospital data with regular user token
HOSPITAL_ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@stmarys.org", "password": "demo123"}' | \
  jq -r '.data.token')

# This should work (own hospital)
curl -H "Authorization: Bearer $HOSPITAL_ADMIN_TOKEN" \
  http://localhost:3001/api/hospitals/hosp-001 | jq .success

# This should fail (different hospital)
curl -H "Authorization: Bearer $HOSPITAL_ADMIN_TOKEN" \
  http://localhost:3001/api/hospitals/hosp-002 | jq .success

# Admin endpoints should fail for non-super-admin
curl -H "Authorization: Bearer $HOSPITAL_ADMIN_TOKEN" \
  http://localhost:3001/api/admin/dashboard | jq .success
```

---

## 📋 **User Roles and Permissions**

### **Role Hierarchy**
1. **SUPER_ADMIN**: Platform-wide access to all hospitals and admin functions
2. **HOSPITAL_ADMIN**: Full access within their hospital
3. **PHYSICIAN**: Clinical access to relevant modules with PHI
4. **QUALITY_DIRECTOR**: Quality metrics and reports, no PHI access
5. **ANALYST**: Read-only access to analytics and reports
6. **VIEWER**: Limited read-only access

### **Permission Matrix**

| Permission | Super Admin | Hospital Admin | Physician | Quality Director | Analyst | Viewer |
|------------|-------------|----------------|-----------|-----------------|---------|--------|
| View All Hospitals | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Hospitals | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Executive View | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Service Line View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Care Team View | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Access PHI | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Export Data | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Configure Alerts | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

---

## 🔧 **System Configuration**

### **Default Module Settings**
- **Heart Failure**: Enabled by default for all hospitals
- **Coronary Intervention**: Enabled by default for all hospitals
- **Other Modules**: Opt-in based on hospital needs and subscription tier

### **Subscription Tiers**
- **BASIC**: Up to 10 users, 2 core modules, basic support
- **PROFESSIONAL**: Up to 30 users, 4 modules, priority support
- **ENTERPRISE**: Up to 50 users, all modules, dedicated support

### **Onboarding Timeline**
- **Initial Setup**: 1-2 days (hospital creation, admin user)
- **EHR Integration**: 3-5 days (Redox configuration, testing)
- **User Training**: 2-3 days (staff onboarding, workflow training)
- **Go Live**: 1-2 weeks total

---

## 🚨 **Troubleshooting**

### **Common Issues**

**1. Hospital Admin Can't Access Admin Functions**
```bash
# Check user role and permissions
curl -H "Authorization: Bearer USER_TOKEN" \
  http://localhost:3001/api/auth/verify | jq '.data.role'
```

**2. User Creation Fails**
- Check hospital user limit not exceeded
- Verify email is unique across platform
- Ensure valid role and permission settings

**3. Onboarding Stuck**
```bash
# Check onboarding status
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:3001/api/onboarding/hospitals/HOSPITAL_ID/status
```

**4. Cross-Hospital Access**
- Verify hospital isolation is working properly
- Check JWT token contains correct hospital ID
- Test with different hospital user tokens

### **Useful Admin Queries**
```bash
# Get hospital with most users
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/api/admin/hospitals" | \
  jq '.data | sort_by(._count.users) | reverse | .[0]'

# Find inactive users across platform  
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/api/admin/users?status=inactive"

# Get hospitals with specific modules enabled
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/api/admin/hospitals" | \
  jq '.data[] | select(.moduleElectrophysiology == true)'
```

The admin system provides comprehensive management capabilities for the TAILRD Platform's multi-tenant architecture! 🎉