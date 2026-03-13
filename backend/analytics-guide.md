# 📊 TAILRD Platform Analytics System

## Overview

The TAILRD Platform now includes a comprehensive analytics system that tracks user behavior, system performance, feature usage, and business metrics across all hospitals. This system provides valuable insights into platform usage and helps optimize the user experience.

## 🎯 Analytics Features Implemented

### ✅ 1. Analytics Data Model
- **UserActivity**: Tracks all user interactions with detailed metadata
- **FeatureUsage**: Aggregated daily feature usage by hospital/user/module
- **PerformanceMetric**: API response times, memory usage, and system performance
- **BusinessMetric**: Hospital-specific business intelligence data
- **ReportGeneration**: Track report generation patterns and usage
- **ErrorLog**: Comprehensive error tracking with severity levels

### ✅ 2. Automatic Analytics Middleware
- **Real-time activity tracking**: Automatically tracks all API calls and user interactions
- **Performance monitoring**: Captures response times, memory usage, and error rates
- **Batch processing**: Efficient buffer-based data collection with periodic flushing
- **Hospital isolation**: Respects multi-tenant data boundaries
- **Configurable**: Can be enabled/disabled per endpoint

### ✅ 3. Analytics API Endpoints

#### **Dashboard Analytics** (`GET /api/analytics/dashboard`)
- Platform-wide metrics and KPIs
- Configurable time ranges (7d, 30d, 90d, 1y)
- Hospital-specific or platform-wide views
- Module-specific filtering
- Performance overview and top features

#### **User Activity Analytics** (`GET /api/analytics/user-activity`)
- Detailed user interaction logs
- Filter by user, activity type, module, date range
- Paginated results with user details
- Activity pattern analysis

#### **Feature Usage Analytics** (`GET /api/analytics/feature-usage`)
- Feature adoption metrics
- Usage trends by day/week/month
- Module-specific analytics
- User engagement insights

#### **Performance Analytics** (`GET /api/analytics/performance`)
- API response time analysis
- System resource usage
- Error rate monitoring
- Endpoint-specific performance

#### **Manual Event Tracking** (`POST /api/analytics/track`)
- Custom event tracking
- Navigation tracking
- Feature usage tracking
- Report generation tracking

### ✅ 4. Role-Based Access Control
- **Super Admin**: Access to all hospitals and platform-wide analytics
- **Hospital Admin**: Full analytics for their hospital
- **Quality Director**: Usage and performance analytics (no PHI)
- **Analyst**: Read-only analytics access

## 🚀 Getting Started

### 1. Database Schema Migration
The analytics models are included in the Prisma schema. Run:
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### 2. Enable Analytics Tracking
Analytics middleware is automatically enabled in `server.ts`. It tracks:
- All API calls and response times
- User activities and navigation
- Feature usage patterns
- Error occurrences

### 3. Access Analytics Dashboard

#### For Super Admins:
```bash
# Get platform-wide analytics
curl -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  "http://localhost:3001/api/analytics/dashboard?timeRange=30d"

# View specific hospital analytics
curl -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  "http://localhost:3001/api/analytics/dashboard?hospitalId=hosp-001&timeRange=7d"
```

#### For Hospital Users:
```bash
# Get hospital-specific analytics
curl -H "Authorization: Bearer HOSPITAL_USER_TOKEN" \
  "http://localhost:3001/api/analytics/dashboard?timeRange=30d"
```

## 📊 Analytics Capabilities

### User Activity Tracking
- **Login/Logout events**: Track user sessions
- **Navigation patterns**: Page views and user flows
- **Feature interactions**: Button clicks, form submissions
- **API usage**: All backend interactions
- **Time on task**: Duration of activities

### Performance Monitoring
- **Response times**: API endpoint performance
- **Memory usage**: Server resource consumption
- **Error rates**: System reliability metrics
- **Database query performance**: Query optimization insights

### Feature Usage Analytics
- **Adoption rates**: Feature usage across hospitals
- **Usage patterns**: Peak times and frequency
- **Module popularity**: Most/least used modules
- **User engagement**: Time spent in features

### Business Intelligence
- **Hospital onboarding progress**: Track implementation success
- **User engagement metrics**: Active users and retention
- **Module utilization**: ROI on feature development
- **Support metrics**: Error patterns and resolution

## 🔧 Technical Implementation

### Analytics Middleware Architecture
```typescript
// Automatic tracking for all API calls
app.use('/api/', analyticsMiddleware({
  trackPerformance: true,
  trackActivities: true,
  excludePaths: ['/health', '/api/status']
}));
```

### Manual Event Tracking
```typescript
// Track custom events
await trackFeature(req, 'Heart Failure Dashboard View', ModuleType.HEART_FAILURE);
await trackNavigation(req, 'Patient List', ModuleType.HEART_FAILURE);
await trackReportGeneration(req, 'Quality Report', ModuleType.HEART_FAILURE, 'PDF');
```

### Data Aggregation
- **Real-time collection**: Events collected in memory buffers
- **Batch processing**: Periodic database writes for efficiency
- **Data retention**: Configurable retention policies
- **Performance optimization**: Indexed queries for fast analytics

## 📈 Analytics Use Cases

### Hospital Administrators
- Monitor staff platform usage
- Identify training needs
- Track feature adoption
- Measure workflow efficiency

### Super Administrators
- Platform-wide usage trends
- Hospital comparison metrics
- Feature popularity across clients
- System performance monitoring

### Quality Directors
- Report generation patterns
- Compliance tracking
- Quality metric trends
- User engagement analysis

### Product Teams
- Feature usage analytics
- User behavior insights
- Performance optimization
- Platform roadmap planning

## 🛡️ Privacy & Security

### Data Protection
- **Hospital isolation**: Strict multi-tenant data boundaries
- **Role-based access**: Analytics access based on user permissions
- **No PHI tracking**: Personal health information excluded from analytics
- **Anonymizable data**: User IDs can be anonymized for reporting

### Compliance
- **HIPAA compliant**: No PHI in analytics data
- **Audit trails**: All analytics access logged
- **Data retention**: Configurable retention policies
- **Export controls**: Restricted data export based on roles

## 🔄 Real-time Features

### Live Metrics (Future Enhancement)
- Real-time user activity feeds
- Live performance dashboards
- Instant error alerts
- Active user monitoring

### Automated Insights (Future Enhancement)
- Usage pattern recognition
- Performance anomaly detection
- Feature adoption predictions
- Automated reporting

## 📊 Sample Analytics Queries

### Most Popular Features
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/analytics/feature-usage?groupBy=feature&timeRange=30d"
```

### User Activity Patterns
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/analytics/user-activity?activityType=NAVIGATION&limit=100"
```

### Performance Monitoring
```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3001/api/analytics/performance?groupBy=endpoint&timeRange=7d"
```

### Hospital Comparison (Super Admin Only)
```bash
curl -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  "http://localhost:3001/api/analytics/dashboard?timeRange=30d"
```

## 🎉 Benefits

### For Users
- **Better user experience**: Data-driven UX improvements
- **Faster support**: Proactive issue identification
- **Personalized workflows**: Usage-based customization

### For Hospitals
- **Staff optimization**: Identify training needs and usage patterns
- **ROI measurement**: Quantify platform value
- **Compliance reporting**: Automated usage reports

### For Platform
- **Product insights**: Feature usage and adoption
- **Performance optimization**: Data-driven improvements
- **Scalability planning**: Usage-based infrastructure scaling

The analytics system is now fully operational and will begin collecting data immediately upon deployment! 🚀