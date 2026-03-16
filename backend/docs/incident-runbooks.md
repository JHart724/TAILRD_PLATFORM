# TAILRD Platform — Incident Response Runbooks

> **Classification:** Internal — Engineering & Operations
> **Last updated:** 2026-03-12
> **Owner:** Platform Engineering

---

## Table of Contents

1. [Severity Levels](#severity-levels)
2. [Database Failure Recovery (PostgreSQL)](#database-failure-recovery-postgresql)
3. [Redox Webhook Pipeline Failure](#redox-webhook-pipeline-failure)
4. [Redis Cache Failure](#redis-cache-failure)
5. [Application Server Crash / OOM](#application-server-crash--oom)
6. [PHI Breach Response Procedure](#phi-breach-response-procedure)
7. [Escalation Contacts & Cloudticity Coordination](#escalation-contacts--cloudticity-coordination)
8. [On-Call Rotation Template](#on-call-rotation-template)
9. [Post-Incident Review Template](#post-incident-review-template)

---

## Severity Levels

| Level | Name | Description | Response Time | Update Cadence | Example |
|-------|------|-------------|---------------|----------------|---------|
| **SEV1** | Critical | Complete service outage or confirmed PHI breach. All users affected. | 15 minutes | Every 30 min | Database unreachable, PHI exfiltration detected |
| **SEV2** | Major | Major feature degraded, clinical data pipeline blocked, data integrity risk. | 30 minutes | Every 1 hour | Redox webhooks failing, EHR sync halted |
| **SEV3** | Minor | Non-critical feature impaired, performance degradation, single-tenant impact. | 2 hours | Every 4 hours | Slow dashboard loads, cache miss spikes |
| **SEV4** | Low | Cosmetic issue, minor bug, no clinical impact. | Next business day | As resolved | UI rendering glitch, non-critical log warning |

**Escalation rule:** If a SEV3 is not resolved within 4 hours, escalate to SEV2. If a SEV2 is not resolved within 2 hours, escalate to SEV1.

---

## Database Failure Recovery (PostgreSQL)

**Severity:** SEV1 (full outage) or SEV2 (replication lag / read-replica failure)

### Symptoms
- Application returns 500 errors on all data endpoints
- Prisma connection pool errors in logs (`P1001`, `P1002`, `P1017`)
- Health check endpoint `/api/health` reports database unhealthy

### Immediate Actions

1. **Verify the failure** — Check database connectivity from the application server:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

2. **Check PostgreSQL service status** — Coordinate with Cloudticity if managed:
   ```bash
   systemctl status postgresql
   pg_isready -h <DB_HOST> -p 5432
   ```

3. **Review PostgreSQL logs** for crash cause:
   ```bash
   tail -100 /var/log/postgresql/postgresql-15-main.log
   ```

4. **If connection pool exhaustion** — Restart the application to release stale connections:
   ```bash
   pm2 restart tailrd-backend
   ```
   Then investigate connection leaks in application code.

5. **If disk full** — Identify and clear space:
   ```bash
   df -h
   du -sh /var/lib/postgresql/15/main/*
   ```
   Rotate WAL logs if needed: `pg_archivecleanup`

### Recovery from Backup

1. Identify the latest backup:
   ```bash
   ls -lt /backups/db-*.sql
   ```

2. Restore to a new database first (do not overwrite production directly):
   ```bash
   createdb tailrd_restore
   psql tailrd_restore < /backups/db-YYYYMMDD_HHMMSS.sql
   ```

3. Validate data integrity in the restored database.

4. Swap the application to point at the restored database by updating `DATABASE_URL`.

5. Run any pending Prisma migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Post-Recovery
- Verify all clinical modules return data correctly
- Check audit log table integrity
- Notify affected hospital clients
- File post-incident review (SEV1/SEV2)

---

## Redox Webhook Pipeline Failure

**Severity:** SEV2

### Symptoms
- No new patient data arriving from EHR systems
- Redox dashboard shows queued/failed messages
- Application logs show no incoming POST to `/api/redox/webhook`
- Stale clinical metrics in dashboards

### Immediate Actions

1. **Check Redox platform status** — Visit https://status.redoxengine.com/

2. **Verify webhook endpoint is reachable**:
   ```bash
   curl -X POST https://app.tailrd.com/api/redox/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

3. **Check application logs** for Redox handler errors:
   ```bash
   grep -i "redox" logs/error.log | tail -50
   ```

4. **Verify Redox verification token** — Ensure `REDOX_VERIFICATION_TOKEN` environment variable matches the value configured in Redox dashboard.

5. **Check rate limiting** — Ensure the rate limiter is not blocking Redox IPs.

6. **If Redox is down** — Monitor their status page. Redox queues messages and will replay on recovery. No data loss expected.

7. **If our endpoint is failing** — Check for:
   - Application crashes (see [Application Server Crash](#application-server-crash--oom))
   - Database write failures (see [Database Failure Recovery](#database-failure-recovery-postgresql))
   - Schema validation errors in incoming FHIR payloads

### Post-Recovery
- Verify Redox message replay filled data gaps
- Compare patient counts before/after the outage window
- Confirm clinical classifiers re-processed any queued data

---

## Redis Cache Failure

**Severity:** SEV3 (degraded performance) or SEV2 (if session store is Redis-backed)

### Symptoms
- Dashboard load times increase significantly (cache miss on every request)
- Redis connection errors in application logs
- `ECONNREFUSED` or `ETIMEDOUT` to Redis host

### Immediate Actions

1. **Check Redis service**:
   ```bash
   redis-cli -h <REDIS_HOST> -p 6379 ping
   systemctl status redis
   ```

2. **Check memory usage** — Redis may have hit `maxmemory`:
   ```bash
   redis-cli info memory
   ```

3. **If OOM** — Flush non-critical caches (the application will repopulate):
   ```bash
   redis-cli FLUSHDB
   ```
   Then investigate why memory usage grew (missing TTLs, key leaks).

4. **If Redis is unreachable** — The application should degrade gracefully (bypass cache, query database directly). Verify this behavior is working.

5. **Restart Redis if needed**:
   ```bash
   systemctl restart redis
   ```

### Post-Recovery
- Monitor cache hit rates for 1 hour
- Verify dashboard response times return to baseline
- Check for any cache key TTL misconfigurations

---

## Application Server Crash / OOM

**Severity:** SEV1 (all instances down) or SEV2 (partial)

### Symptoms
- 502/503 errors from load balancer
- Process manager (PM2) shows application in "errored" or "stopped" state
- OOM killer entries in system logs

### Immediate Actions

1. **Check process status**:
   ```bash
   pm2 status
   pm2 logs tailrd-backend --lines 100
   ```

2. **Check system memory**:
   ```bash
   free -m
   dmesg | grep -i "out of memory" | tail -10
   ```

3. **Restart the application**:
   ```bash
   pm2 restart tailrd-backend
   ```

4. **If OOM is recurring** — Check for memory leaks:
   ```bash
   npm run monitor:memory
   ```
   Common culprits:
   - Unbounded in-memory caches
   - Large Prisma query results not streamed
   - Event listener leaks on Redox webhook processing

5. **If crash is not OOM** — Check for unhandled exceptions:
   ```bash
   grep -i "unhandled" logs/error.log | tail -20
   grep -i "FATAL" logs/error.log | tail -20
   ```

6. **Scale horizontally** if single-instance capacity is insufficient.

### Post-Recovery
- Review heap snapshots if available
- Set up memory usage alerting if not already configured
- Consider Node.js `--max-old-space-size` tuning

---

## PHI Breach Response Procedure

**Severity:** SEV1 — Mandatory

> **HIPAA Breach Notification Rule:** Covered entities must notify affected individuals within **60 calendar days** of discovering a breach of unsecured PHI.

### Immediate Actions (Day 0)

1. **Contain the breach** — Revoke compromised credentials, block attacker IPs, isolate affected systems.

2. **Preserve evidence** — Do NOT delete logs. Take snapshots of:
   - Application logs (`logs/audit.log`, `logs/error.log`, `logs/combined.log`)
   - Database audit trail (`audit_logs` table)
   - Network access logs
   - Server access logs

3. **Notify internal stakeholders immediately:**
   - Engineering Lead
   - HIPAA Privacy Officer
   - Legal Counsel
   - Cloudticity Security Team

4. **Document the incident** — Start a secure incident document recording:
   - Date/time of discovery
   - Nature of the breach (what PHI was exposed)
   - Number of individuals affected
   - How the breach was discovered
   - Containment actions taken

### Investigation (Days 1-14)

5. **Determine scope:**
   - Which patients' PHI was accessed/exposed?
   - What types of PHI? (diagnoses, procedures, demographics, etc.)
   - How was access gained? (credential theft, software vulnerability, insider threat)
   - Duration of unauthorized access

6. **Risk assessment** — Evaluate per 45 CFR 164.402:
   - Nature and extent of PHI involved
   - Unauthorized person who used or received the PHI
   - Whether PHI was actually acquired or viewed
   - Extent to which risk has been mitigated

7. **Engage forensic analysis** if the breach vector is unclear.

### Notification (Days 14-60)

8. **Notify affected individuals** (within 60 days of discovery):
   - Written notice via first-class mail
   - Include: description of breach, types of information involved, steps to protect themselves, contact information, description of entity's response

9. **Notify HHS (Department of Health and Human Services):**
   - If fewer than 500 individuals: may report annually
   - If 500 or more individuals: notify HHS within 60 days AND notify prominent media outlets in the affected state/jurisdiction

10. **Notify state attorneys general** as required by state breach notification laws.

### Remediation (Ongoing)

11. Implement corrective actions to prevent recurrence.
12. Update access controls, encryption, and monitoring.
13. Conduct staff retraining on PHI handling procedures.
14. Update the incident response plan based on lessons learned.

### Documentation Requirements
- Retain all breach-related documentation for a minimum of **6 years** per HIPAA.
- Include the risk assessment, notification records, and corrective action plans.

---

## Escalation Contacts & Cloudticity Coordination

### Internal Escalation Path

| Role | Responsibility | Escalation Trigger |
|------|---------------|--------------------|
| On-Call Engineer | First responder, initial triage | Automated alert or user report |
| Engineering Lead | Technical escalation, architecture decisions | SEV1/SEV2, or SEV3 unresolved > 4 hours |
| HIPAA Privacy Officer | PHI breach assessment, notification coordination | Any suspected PHI exposure |
| CEO / Founder | Executive notification, external communications | SEV1 confirmed, PHI breach confirmed |

### Cloudticity Coordination

Cloudticity manages the HIPAA-compliant hosting infrastructure.

| Contact Method | Details |
|---------------|---------|
| Support Portal | https://support.cloudticity.com |
| Emergency Hotline | (contact number — add when available) |
| Escalation Email | (email — add when available) |
| SLA | Per managed services agreement |

**When to engage Cloudticity:**
- Infrastructure-level failures (EC2, RDS, networking)
- Security incidents involving the hosting environment
- SSL/TLS certificate issues
- Backup restoration from infrastructure-level snapshots
- Compliance audit support

**Information to provide Cloudticity:**
- Incident severity and description
- Affected services and timeline
- Whether PHI may be involved
- Actions already taken

---

## On-Call Rotation Template

### Schedule Structure

| Week | Primary On-Call | Secondary On-Call |
|------|----------------|-------------------|
| Week 1 | Engineer A | Engineer B |
| Week 2 | Engineer B | Engineer C |
| Week 3 | Engineer C | Engineer A |

### On-Call Responsibilities

- Monitor alerting channels (PagerDuty / Slack `#tailrd-alerts`)
- Acknowledge SEV1/SEV2 alerts within response time SLA
- Perform initial triage using this runbook
- Escalate per the escalation path above
- Hand off to next on-call with a status summary

### Handoff Checklist

- [ ] Any active or recently resolved incidents
- [ ] Ongoing monitoring for recurring issues
- [ ] Pending deployments or maintenance windows
- [ ] Known issues or degraded services

---

## Post-Incident Review Template

Complete for all SEV1 and SEV2 incidents within 5 business days of resolution.

### Incident Summary

| Field | Value |
|-------|-------|
| **Incident ID** | INC-YYYY-NNN |
| **Severity** | SEV1 / SEV2 |
| **Date/Time Detected** | |
| **Date/Time Resolved** | |
| **Duration** | |
| **Affected Services** | |
| **Affected Hospitals** | |
| **PHI Involved?** | Yes / No |
| **On-Call Responder** | |

### Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert triggered / Issue detected |
| HH:MM | On-call acknowledged |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Service restored |
| HH:MM | Monitoring confirmed stable |

### Root Cause Analysis

**What happened:**
(Description of the failure)

**Why it happened:**
(Underlying cause — use 5 Whys technique)

**Why it was not caught earlier:**
(Gaps in monitoring, testing, or review)

### Impact

- Number of users affected:
- Duration of impact:
- Clinical data affected (if any):
- Data loss (if any):

### Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| | | | |

### Lessons Learned

- What went well:
- What could be improved:
- Process changes needed:
