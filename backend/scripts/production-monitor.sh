#!/bin/bash

# TAILRD Platform - Production Monitoring Script
# Comprehensive system monitoring for production deployment

set -e

echo "📊 TAILRD Platform - Production Monitor"
echo "======================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_BASE_URL:-http://localhost:3001/api}"
ALERT_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
CHECK_INTERVAL=30
LOG_FILE="logs/monitor.log"

# Health check thresholds
MAX_RESPONSE_TIME=1000  # milliseconds
MAX_MEMORY_USAGE=512    # MB
MAX_CPU_USAGE=80        # percentage
MIN_DISK_SPACE=20       # percentage

# Create logs directory if it doesn't exist
mkdir -p logs

echo -e "${BLUE}🔍 Starting production monitoring...${NC}"
echo "API URL: $API_URL"
echo "Check interval: ${CHECK_INTERVAL}s"
echo "Log file: $LOG_FILE"
echo ""

# Function to log with timestamp
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local severity=$1
    local message=$2
    
    log_message "ALERT" "$severity: $message"
    
    if [ ! -z "$ALERT_WEBHOOK_URL" ]; then
        curl -X POST "$ALERT_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"🚨 TAILRD Platform Alert\",
                \"attachments\": [{
                    \"color\": \"$([ "$severity" == "CRITICAL" ] && echo "danger" || echo "warning")\",
                    \"fields\": [{
                        \"title\": \"Severity\",
                        \"value\": \"$severity\",
                        \"short\": true
                    }, {
                        \"title\": \"Message\",
                        \"value\": \"$message\",
                        \"short\": false
                    }, {
                        \"title\": \"Timestamp\",
                        \"value\": \"$(date)\",
                        \"short\": true
                    }]
                }]
            }" > /dev/null 2>&1
    fi
}

# Function to check API health
check_api_health() {
    local start_time=$(date +%s%3N)
    local response
    local http_code
    
    response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$API_URL/health" 2>/dev/null || echo "000")
    http_code=$response
    
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$http_code" = "200" ]; then
        if [ -f /tmp/health_response.json ]; then
            local status=$(cat /tmp/health_response.json | grep -o '"status":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
            
            if [ "$status" = "healthy" ]; then
                echo -e "${GREEN}✅ API Health: Healthy (${response_time}ms)${NC}"
                log_message "INFO" "API health check passed - Response time: ${response_time}ms"
                
                # Check response time threshold
                if [ "$response_time" -gt "$MAX_RESPONSE_TIME" ]; then
                    send_alert "WARNING" "API response time is high: ${response_time}ms (threshold: ${MAX_RESPONSE_TIME}ms)"
                fi
                
                return 0
            else
                echo -e "${YELLOW}⚠️ API Health: $status (${response_time}ms)${NC}"
                send_alert "WARNING" "API status is degraded: $status"
                return 1
            fi
        else
            echo -e "${RED}❌ API Health: Invalid response${NC}"
            send_alert "CRITICAL" "API returned invalid health response"
            return 1
        fi
    else
        echo -e "${RED}❌ API Health: Failed (HTTP $http_code)${NC}"
        send_alert "CRITICAL" "API health check failed with HTTP $http_code"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    if [ ! -z "$DATABASE_URL" ]; then
        if command -v psql &> /dev/null; then
            if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Database: Connected${NC}"
                log_message "INFO" "Database connectivity check passed"
                return 0
            else
                echo -e "${RED}❌ Database: Connection failed${NC}"
                send_alert "CRITICAL" "Database connection failed"
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️ Database: psql not available for testing${NC}"
            return 0
        fi
    else
        echo -e "${YELLOW}⚠️ Database: DATABASE_URL not configured${NC}"
        return 0
    fi
}

# Function to check Redis connectivity
check_redis() {
    if [ ! -z "$REDIS_URL" ]; then
        if command -v redis-cli &> /dev/null; then
            if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Redis: Connected${NC}"
                log_message "INFO" "Redis connectivity check passed"
                return 0
            else
                echo -e "${RED}❌ Redis: Connection failed${NC}"
                send_alert "CRITICAL" "Redis connection failed"
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️ Redis: redis-cli not available for testing${NC}"
            return 0
        fi
    else
        echo -e "${YELLOW}⚠️ Redis: REDIS_URL not configured${NC}"
        return 0
    fi
}

# Function to check system resources
check_system_resources() {
    # Memory usage
    if command -v free &> /dev/null; then
        local mem_usage=$(free | grep '^Mem:' | awk '{printf "%.1f", $3/$2 * 100.0}')
        echo -e "${BLUE}💾 Memory Usage: ${mem_usage}%${NC}"
        
        if (( $(echo "$mem_usage > 90" | bc -l) )); then
            send_alert "CRITICAL" "High memory usage: ${mem_usage}%"
        elif (( $(echo "$mem_usage > 80" | bc -l) )); then
            send_alert "WARNING" "Elevated memory usage: ${mem_usage}%"
        fi
    fi
    
    # Disk usage
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    echo -e "${BLUE}💽 Disk Usage: ${disk_usage}%${NC}"
    
    if [ "$disk_usage" -gt 90 ]; then
        send_alert "CRITICAL" "High disk usage: ${disk_usage}%"
    elif [ "$disk_usage" -gt 80 ]; then
        send_alert "WARNING" "Elevated disk usage: ${disk_usage}%"
    fi
    
    # Load average (if available)
    if command -v uptime &> /dev/null; then
        local load_avg=$(uptime | awk -F'load average:' '{ print $2 }' | awk '{ print $1 }' | sed 's/,//')
        echo -e "${BLUE}⚡ Load Average: ${load_avg}${NC}"
    fi
}

# Function to check logs for errors
check_logs() {
    local error_count=0
    local critical_count=0
    
    if [ -f "logs/error.log" ]; then
        # Count errors in the last 5 minutes
        error_count=$(tail -100 logs/error.log | grep "$(date -d '5 minutes ago' '+%Y-%m-%d %H:%M')" | wc -l)
        critical_count=$(tail -100 logs/error.log | grep -i "critical\|fatal" | grep "$(date -d '5 minutes ago' '+%Y-%m-%d %H:%M')" | wc -l)
        
        if [ "$critical_count" -gt 0 ]; then
            send_alert "CRITICAL" "Critical errors detected in logs: $critical_count in last 5 minutes"
            echo -e "${RED}❌ Logs: $critical_count critical errors detected${NC}"
        elif [ "$error_count" -gt 10 ]; then
            send_alert "WARNING" "High error rate in logs: $error_count errors in last 5 minutes"
            echo -e "${YELLOW}⚠️ Logs: $error_count errors detected${NC}"
        else
            echo -e "${GREEN}✅ Logs: No critical issues${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Logs: Error log file not found${NC}"
    fi
}

# Function to check webhook processing
check_webhook_processing() {
    local webhook_url="$API_URL/webhooks/redox/health"
    local response=$(curl -s "$webhook_url" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q '"status":"healthy"'; then
        echo -e "${GREEN}✅ Webhooks: Processing normally${NC}"
        log_message "INFO" "Webhook processing health check passed"
    else
        echo -e "${RED}❌ Webhooks: Processing issues detected${NC}"
        send_alert "WARNING" "Webhook processing health check failed"
    fi
}

# Function to check clinical alerts
check_clinical_alerts() {
    local alerts_url="$API_URL/analytics/alerts"
    local response=$(curl -s "$alerts_url" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q '"criticalAlerts"'; then
        local critical_alerts=$(echo "$response" | grep -o '"criticalAlerts":[0-9]*' | cut -d':' -f2)
        
        if [ "$critical_alerts" -gt 20 ]; then
            send_alert "WARNING" "High number of critical clinical alerts: $critical_alerts"
            echo -e "${YELLOW}⚠️ Clinical Alerts: $critical_alerts critical alerts${NC}"
        else
            echo -e "${GREEN}✅ Clinical Alerts: $critical_alerts critical alerts${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Clinical Alerts: Unable to fetch alert count${NC}"
    fi
}

# Main monitoring loop
main_monitor() {
    log_message "INFO" "Production monitoring started"
    
    while true; do
        echo ""
        echo -e "${BLUE}🔍 Health Check - $(date)${NC}"
        echo "================================="
        
        # Core system checks
        check_api_health
        check_database
        check_redis
        check_system_resources
        check_logs
        check_webhook_processing
        check_clinical_alerts
        
        echo ""
        echo -e "${BLUE}📊 Next check in ${CHECK_INTERVAL} seconds...${NC}"
        
        sleep "$CHECK_INTERVAL"
    done
}

# Function to run a single check
single_check() {
    echo -e "${BLUE}🔍 Single Health Check - $(date)${NC}"
    echo "======================================"
    
    check_api_health
    check_database
    check_redis
    check_system_resources
    check_logs
    check_webhook_processing
    check_clinical_alerts
    
    echo ""
    echo -e "${GREEN}✅ Single health check completed${NC}"
}

# Function to display help
show_help() {
    echo "TAILRD Platform Production Monitor"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --single, -s      Run a single health check and exit"
    echo "  --interval, -i N  Set check interval to N seconds (default: 30)"
    echo "  --help, -h        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  API_BASE_URL      Base URL for API (default: http://localhost:3001/api)"
    echo "  SLACK_WEBHOOK_URL Slack webhook for alerts (optional)"
    echo "  DATABASE_URL      PostgreSQL connection string"
    echo "  REDIS_URL         Redis connection string"
    echo ""
    echo "Examples:"
    echo "  $0                Start continuous monitoring"
    echo "  $0 --single       Run one health check"
    echo "  $0 --interval 60  Monitor with 60 second intervals"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --single|-s)
            single_check
            exit 0
            ;;
        --interval|-i)
            CHECK_INTERVAL="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Set up signal handlers for graceful shutdown
trap 'echo -e "\n${YELLOW}🛑 Monitoring stopped by user${NC}"; log_message "INFO" "Production monitoring stopped"; exit 0' SIGINT SIGTERM

# Start monitoring
main_monitor