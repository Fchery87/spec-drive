# Database Backup Strategy - Spec-Drive

Comprehensive guide for implementing automated database backups and disaster recovery procedures.

---

## Overview

**Objective**: Implement automated, tested backups with < 1-hour recovery time (RTO) and < 1-day recovery point objective (RPO)

**Current Status**:
- ✅ Neon provides automatic daily backups
- ⏳ Manual backup procedures documented
- ⏳ Automated backup scheduling with S3
- ⏳ Backup testing procedures

---

## Backup Strategy Options

### Option 1: Neon Managed Backups (Easiest)

Neon automatically backs up your database daily.

**Backup Features**:
- Automatic daily backups
- 7-day retention (default)
- Point-in-time recovery
- No additional cost
- Encrypted at rest

**Restore from Neon**:
1. Go to Neon Console
2. Select your project
3. Click "Backups" tab
4. Choose backup date and restore

**Cost**: Included in Neon plan

---

### Option 2: Manual PostgreSQL Backups

Create manual backups using `pg_dump`.

**Create Backup**:
```bash
# Full database backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d_%H%M%S).sql

# Compressed backup (smaller file)
pg_dump -Fc $DATABASE_URL > backup-$(date +%Y%m%d_%H%M%S).dump

# With data only (no schema)
pg_dump -a $DATABASE_URL > backup-data-$(date +%Y%m%d_%H%M%S).sql
```

**Restore Backup**:
```bash
# From SQL file
psql $DATABASE_URL < backup-20240115_120000.sql

# From compressed dump
pg_restore -d $DATABASE_URL backup-20240115_120000.dump
```

**Advantages**:
- Simple and free
- Human-readable SQL format
- Compressed format available
- Selective restoration

**Disadvantages**:
- Manual process (easy to forget)
- Slower for large databases
- Need to store backups separately

---

### Option 3: Automated Backups to AWS S3

Automated backups with encryption and long-term storage.

**Prerequisites**:
- AWS account
- S3 bucket for backups
- AWS CLI configured

**Setup Automated Backup Script**:

Create `/opt/spec-drive/backup.sh`:
```bash
#!/bin/bash

# Configuration
DB_HOST="${DATABASE_HOST}"
DB_USER="${DATABASE_USER}"
DB_NAME="${DATABASE_NAME}"
BACKUP_DIR="/backups"
AWS_BUCKET="${BACKUP_S3_BUCKET}"
RETENTION_DAYS=30

# Create backup
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d_%H%M%S).sql.gz"
mkdir -p "$BACKUP_DIR"

echo "Starting database backup: $BACKUP_FILE"

# Backup with compression
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup successful: $BACKUP_FILE"

  # Upload to S3
  aws s3 cp "$BACKUP_FILE" "s3://$AWS_BUCKET/backups/" \
    --sse AES256 \
    --storage-class GLACIER

  if [ $? -eq 0 ]; then
    echo "✅ Uploaded to S3"
    rm "$BACKUP_FILE"  # Delete local copy
  else
    echo "❌ S3 upload failed"
    exit 1
  fi
else
  echo "❌ Backup failed"
  exit 1
fi

# Clean up old backups locally (if any)
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

echo "✅ Backup process completed"
```

**Make Executable**:
```bash
chmod +x /opt/spec-drive/backup.sh
```

**Schedule with Cron**:

Edit crontab:
```bash
sudo crontab -e
```

Add daily backup at 2 AM:
```
0 2 * * * /opt/spec-drive/backup.sh >> /var/log/spec-drive-backup.log 2>&1
```

**Environment Variables** (in `.env` or cron environment):
```bash
DATABASE_HOST="your-neon-host.neon.tech"
DATABASE_USER="your_user"
DATABASE_NAME="your_database"
BACKUP_S3_BUCKET="your-backup-bucket"
PGPASSWORD="your_password"
```

**AWS IAM Policy** (for S3 access):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-backup-bucket",
        "arn:aws:s3:::your-backup-bucket/*"
      ]
    }
  ]
}
```

**Cost**: S3 storage (~$0.023 per GB/month)

---

### Option 4: Docker Backup Container

Containerized backup solution for production deployments.

**Create `docker-compose-backup.yml`**:
```yaml
version: '3.8'

services:
  backup:
    image: postgresql:15-alpine
    container_name: spec-drive-backup
    environment:
      PGPASSWORD: ${DB_PASSWORD}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_KEY}
    volumes:
      - ./backup.sh:/usr/local/bin/backup.sh:ro
      - backup_data:/backups
    command: >
      sh -c "apk add --no-cache aws-cli &&
             chmod +x /usr/local/bin/backup.sh &&
             /usr/local/bin/backup.sh"
    networks:
      - spec-drive-network

volumes:
  backup_data:

networks:
  spec-drive-network:
    external: true
```

**Run Backup**:
```bash
docker-compose -f docker-compose-backup.yml up --rm
```

---

## Backup Testing Procedures

**Critical**: Never trust a backup that hasn't been tested.

### Test 1: Verify Backup File

```bash
# Check backup file integrity
ls -lh backup-*.sql.gz

# Test restore on local development database
gunzip -c backup-20240115_120000.sql.gz | psql postgresql://test_user:test_pass@localhost:5432/test_db

# Verify data integrity
psql postgresql://test_user:test_pass@localhost:5432/test_db -c \
  "SELECT COUNT(*) as users FROM users; \
   SELECT COUNT(*) as projects FROM projects;"
```

### Test 2: Restore to Test Environment

Monthly restore test to a separate test database:

```bash
# 1. Create test database
createdb -U postgres test_spec_drive

# 2. Restore from backup
pg_restore -d test_spec_drive backup-latest.dump

# 3. Run validation queries
psql test_spec_drive << 'EOF'
  -- Check table counts
  SELECT 'users' as table_name, COUNT(*) as count FROM users
  UNION ALL
  SELECT 'projects', COUNT(*) FROM projects
  UNION ALL
  SELECT 'auth_sessions', COUNT(*) FROM auth_sessions;

  -- Check for data integrity
  SELECT * FROM users LIMIT 1;
  SELECT * FROM projects LIMIT 1;

  -- Verify indexes exist
  SELECT COUNT(*) as index_count FROM pg_indexes
  WHERE schemaname = 'public';
EOF

# 4. Drop test database
dropdb test_spec_drive
```

### Test 3: Timed Recovery Test

Quarterly full recovery test:

```bash
#!/bin/bash

echo "Starting timed recovery test..."
START_TIME=$(date +%s)

# Download latest backup from S3
aws s3 cp s3://your-bucket/backups/latest.dump . --no-progress

# Restore to test database
pg_restore -d test_db latest.dump

# Run validation
psql test_db -c "SELECT COUNT(*) FROM users;" > /dev/null

END_TIME=$(date +%s)
RECOVERY_TIME=$((END_TIME - START_TIME))

echo "Recovery completed in $RECOVERY_TIME seconds"

if [ $RECOVERY_TIME -lt 3600 ]; then
  echo "✅ RTO target met (< 1 hour)"
else
  echo "❌ RTO target exceeded (> 1 hour)"
fi
```

---

## Disaster Recovery Procedures

### Scenario 1: Data Corruption

```bash
# 1. Identify issue
psql $DATABASE_URL -c "SELECT * FROM users WHERE id = '...';"

# 2. Determine backup point (when data was good)
neon_backups=$(neon projects list)

# 3. Restore to known good state via Neon console
# OR manually restore from S3 backup:
aws s3 cp s3://your-bucket/backups/backup-20240110.dump .
pg_restore -d $DATABASE_URL backup-20240110.dump

# 4. Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# 5. Notify users and update status page
```

### Scenario 2: Full Database Loss

```bash
# 1. STOP all services
docker-compose down

# 2. Verify you're about to restore to production
echo "RESTORING PRODUCTION DATABASE"
read -p "Are you sure? (type 'yes'): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted"
  exit 1
fi

# 3. Create new database
createdb production_db_new

# 4. Restore from latest backup
aws s3 cp s3://your-bucket/backups/latest.dump .
pg_restore -d production_db_new latest.dump

# 5. Verify data
psql production_db_new -c "SELECT COUNT(*) FROM users;"

# 6. Swap databases
psql postgres << EOF
  DROP DATABASE IF EXISTS production_db;
  ALTER DATABASE production_db_new RENAME TO production_db;
EOF

# 7. Update connection string
export DATABASE_URL="postgresql://..."

# 8. Restart services
docker-compose up -d

# 9. Verify application works
curl http://localhost:3001/health
```

### Scenario 3: Partial Data Restore

```bash
# Restore specific tables from backup
pg_restore --list backup-20240115.dump | grep "TABLE.*users"

# Restore only users table
pg_restore -d $DATABASE_URL \
  --table=users \
  backup-20240115.dump

# Or restore with data-only (existing schema)
pg_restore -a -d $DATABASE_URL backup-20240115.dump
```

---

## Backup Retention Policy

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Neon auto-backup | Daily | 7 days | Managed |
| Manual daily backup | Daily @ 2 AM | 30 days | S3 (Standard) |
| Weekly backup | Every Sunday | 90 days | S3 (Glacier) |
| Monthly backup | 1st of month | 1 year | S3 (Glacier Deep) |
| Before major changes | Manual | Forever | S3 (Glacier Deep) |

---

## Cost Estimation

**Monthly backup costs** (1 GB database):

| Option | Cost |
|--------|------|
| Neon auto-backup | $0 (included) |
| Manual + S3 Standard | ~$0.05 |
| Manual + S3 Glacier | ~$0.01 |
| AWS RDS with backups | ~$50-100 |

---

## Monitoring Backups

### Create Backup Status Check

```bash
#!/bin/bash

# Check when last backup was created
LAST_BACKUP=$(aws s3 ls s3://your-bucket/backups/ | tail -1 | awk '{print $1, $2}')
LAST_BACKUP_DATE=$(date -d "$LAST_BACKUP" +%s)
NOW=$(date +%s)
HOURS_AGO=$(( ($NOW - $LAST_BACKUP_DATE) / 3600 ))

echo "Last backup: $HOURS_AGO hours ago"

if [ $HOURS_AGO -gt 25 ]; then
  echo "❌ WARNING: Backup is older than 25 hours!"
  # Send alert to monitoring system
  curl -X POST https://monitoring.example.com/alert \
    -d "Backup overdue: $HOURS_AGO hours"
else
  echo "✅ Backup is current"
fi
```

Add to cron:
```
0 12 * * * /opt/spec-drive/check-backup.sh
```

---

## Environment Variables

Add to `.env.production`:

```bash
# Backup Configuration
BACKUP_S3_BUCKET="spec-drive-backups"
BACKUP_RETENTION_DAYS=30

# AWS Credentials (for S3 backups)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"

# Database Connection
DATABASE_HOST="your-neon-host.neon.tech"
DATABASE_USER="your_user"
DATABASE_NAME="neondb"
PGPASSWORD="your_password"
```

---

## Checklist: Production Backup Setup

- [ ] Understand Neon auto-backup capabilities
- [ ] Set up manual backup script with cron scheduling
- [ ] Configure AWS S3 bucket for backup storage
- [ ] Set up S3 lifecycle policy for retention
- [ ] Create backup status monitoring
- [ ] Document recovery procedures
- [ ] Perform first backup test
- [ ] Schedule monthly recovery tests
- [ ] Add backup status to monitoring dashboard
- [ ] Train team on recovery procedures
- [ ] Document backup encryption strategy
- [ ] Set up backup alerts

---

## Recommended Setup (Production)

```bash
# 1. Use Neon auto-backups as primary (free)
# 2. Add daily manual backups to S3 as secondary
# 3. Monthly full recovery testing
# 4. 30-day S3 retention, 90-day Glacier archive
# 5. Backup status monitoring with alerts
# 6. Documented recovery procedures
```

---

## Quick Reference

```bash
# Manual backup
pg_dump $DATABASE_URL | gzip > backup.sql.gz

# Restore
gunzip < backup.sql.gz | psql $DATABASE_URL

# Upload to S3
aws s3 cp backup.sql.gz s3://bucket/backups/

# List S3 backups
aws s3 ls s3://bucket/backups/

# Check backup size
ls -lh backup.sql.gz
```

---

**Generated**: 2024-11-17
**Review Date**: Monthly
**Last Tested**: [Update after first test]
