# Incident Response Runbook

## Severity Levels

| Level         | Description             | Response Time |
| ------------- | ----------------------- | ------------- |
| P1 - Critical | Service down, data loss | 15 minutes    |
| P2 - High     | Major feature broken    | 1 hour        |
| P3 - Medium   | Minor feature affected  | 4 hours       |
| P4 - Low      | Non-urgent issues       | 24 hours      |

## Incident Response Process

### 1. Detection

- Monitoring alerts (Grafana/Prometheus)
- User reports
- Health check failures

### 2. Triage

1. Assess severity level
2. Identify affected services
3. Notify stakeholders
4. Create incident ticket

### 3. Investigation

```bash
# Check service status
docker ps -a
docker logs vibe-creator-server --tail 100

# Check resource usage
docker stats

# Check database connections
docker exec vibe-creator-db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis
docker exec vibe-creator-redis redis-cli info
```

### 4. Resolution

- Apply fix or rollback
- Verify resolution
- Monitor for recurrence

### 5. Post-Mortem

- Document timeline
- Identify root cause
- Implement preventive measures

## Common Issues

### API 5xx Errors

**Symptoms:** High error rate, slow responses

**Investigation:**

```bash
docker logs vibe-creator-server | grep -i error | tail -50
```

**Resolution:**

1. Check database connectivity
2. Check Redis connectivity
3. Restart server if needed
4. Check for memory leaks

### Database Connection Pool Exhausted

**Symptoms:** "too many connections" errors

**Investigation:**

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'vibe_creator';
```

**Resolution:**

1. Identify connection leaks
2. Restart application
3. Increase pool size if needed

### Redis Memory Full

**Symptoms:** MISCONF errors, failed caching

**Investigation:**

```bash
docker exec vibe-creator-redis redis-cli info memory
```

**Resolution:**

1. Clear expired keys
2. Increase memory limit
3. Review TTL policies

### Export Jobs Stuck

**Symptoms:** Jobs in PROCESSING state too long

**Investigation:**

```bash
docker exec vibe-creator-server pnpm bull-repl
```

**Resolution:**

1. Check FFmpeg processes
2. Clear stuck jobs
3. Restart worker

## Escalation Path

1. **On-Call Engineer** - First responder
2. **Tech Lead** - P1/P2 issues
3. **CTO** - Data breach, extended outage

## Communication Templates

### Internal Alert

```
🚨 INCIDENT: [Brief description]
Severity: P[1-4]
Status: Investigating
ETA: [Estimated time]
```

### User Notification

```
We're experiencing technical difficulties with [feature].
Our team is working on a fix. We'll update you shortly.
```

### Resolution Notice

```
✅ RESOLVED: [Brief description]
Duration: [X hours]
Root Cause: [Summary]
```
