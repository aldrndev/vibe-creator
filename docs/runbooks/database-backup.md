# Database Backup & Recovery

## Backup Procedures

### Manual Backup

```bash
# Connect to database container
docker exec -it vibe-creator-db bash

# Create backup
pg_dump -U postgres -d vibe_creator > /tmp/backup_$(date +%Y%m%d_%H%M%S).sql

# Copy to host
docker cp vibe-creator-db:/tmp/backup_*.sql ./backups/
```

### Automated Daily Backup

Add to crontab:

```bash
0 2 * * * docker exec vibe-creator-db pg_dump -U postgres vibe_creator | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

### Full Database Dump (with schema)

```bash
docker exec vibe-creator-db pg_dumpall -U postgres > full_backup.sql
```

## Restore Procedures

### Restore from Backup

```bash
# Stop application to prevent writes
docker stop vibe-creator-server

# Restore database
cat backup.sql | docker exec -i vibe-creator-db psql -U postgres -d vibe_creator

# Restart application
docker start vibe-creator-server
```

### Point-in-Time Recovery

1. Stop application
2. Drop and recreate database
3. Restore from latest backup
4. Apply WAL logs (if configured)
5. Run pending migrations
6. Start application

## Backup Verification

```bash
# Test restore to temporary database
docker exec vibe-creator-db createdb -U postgres test_restore
cat backup.sql | docker exec -i vibe-creator-db psql -U postgres -d test_restore

# Verify data
docker exec -it vibe-creator-db psql -U postgres -d test_restore -c "SELECT COUNT(*) FROM users;"

# Cleanup
docker exec vibe-creator-db dropdb -U postgres test_restore
```

## Backup Storage

| Type    | Retention | Storage    |
| ------- | --------- | ---------- |
| Daily   | 7 days    | Local + S3 |
| Weekly  | 4 weeks   | S3         |
| Monthly | 12 months | S3 Glacier |

## Emergency Recovery

### Complete Database Loss

1. Provision new PostgreSQL instance
2. Restore from latest S3 backup
3. Update `DATABASE_URL` in environment
4. Run `prisma migrate deploy`
5. Verify data integrity
6. Resume application

### Corrupted Table

```sql
-- Check for corruption
SELECT * FROM pg_catalog.pg_tables WHERE schemaname = 'public';

-- Attempt repair
REINDEX TABLE table_name;
VACUUM FULL table_name;
```
