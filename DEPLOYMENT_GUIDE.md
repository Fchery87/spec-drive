# Deployment Guide - Spec-Drive

Complete guide for deploying Spec-Drive to production with best practices for security, scalability, and reliability.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Local Development with Docker](#local-development-with-docker)
3. [Production Deployment](#production-deployment)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 18+ or Docker
- PostgreSQL 15+ (managed service or Docker)
- SendGrid account (for email)
- Redis (optional, for caching and CSRF tokens)

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env.local

# 3. Set up database
pnpm db:generate
pnpm db:migrate

# 4. Start development server
pnpm dev
```

---

## Local Development with Docker

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec app pnpm db:migrate

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Services Included

- **PostgreSQL** (postgres:15-alpine)
  - Host: localhost:5432
  - User: neondb_owner
  - Password: password (default)
  - Database: spec_drive

- **Redis** (redis:7-alpine)
  - Host: localhost:6379
  - Used for CSRF tokens and caching

- **Adminer** (Web DB Manager)
  - URL: http://localhost:8080

- **Application**
  - API: http://localhost:3001
  - Frontend: http://localhost:5173

### Custom Environment Variables

Create `.env.docker` for Docker-specific settings:

```bash
DB_USER=neondb_owner
DB_PASSWORD=your_secure_password
DB_NAME=spec_drive
NODE_ENV=development
```

---

## Production Deployment

### Option 1: Railway (Recommended)

Railway is the simplest option with built-in PostgreSQL and automatic deployments.

#### Setup

1. **Create Railway project**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   ```

2. **Configure PostgreSQL**
   ```bash
   railway add postgres
   ```

3. **Set environment variables**
   ```bash
   railway variables set JWT_SECRET="your-secret-key"
   railway variables set SENDGRID_API_KEY="sg_..."
   railway variables set DATABASE_URL="$DATABASE_URL"
   ```

4. **Deploy**
   ```bash
   railway up
   ```

#### GitHub Actions Integration

The CI/CD pipeline auto-deploys on push to main:

```yaml
- name: Deploy to Railway
  env:
    RAILWAY_API_TOKEN: ${{ secrets.RAILWAY_API_TOKEN }}
  run: |
    npm install -g @railway/cli
    railway up --detach
```

### Option 2: Render

Render offers generous free tier with automatic scaling.

#### Setup

1. **Connect GitHub repository**
   - Go to render.com
   - Create New > Web Service
   - Connect your GitHub repo

2. **Configure service**
   - Build command: `pnpm install && pnpm run build`
   - Start command: `node dist/server/index.js`
   - Environment: Node
   - Node version: 18

3. **Add PostgreSQL database**
   - Create New > PostgreSQL
   - Link to web service

4. **Set environment variables**
   In Render dashboard, set all variables from `.env.example`

#### GitHub Actions Integration

```yaml
- name: Trigger Render Deploy
  env:
    RENDER_DEPLOY_HOOK: ${{ secrets.RENDER_DEPLOY_HOOK }}
  run: curl "$RENDER_DEPLOY_HOOK"
```

### Option 3: Heroku

#### Setup

1. **Install Heroku CLI**
   ```bash
   curl https://cli-assets.heroku.com/install.sh | sh
   heroku login
   ```

2. **Create app and database**
   ```bash
   heroku create spec-drive
   heroku addons:create heroku-postgresql:standard-0
   ```

3. **Configure Procfile**
   ```
   web: node dist/server/index.js
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

#### GitHub Actions Integration

```yaml
- name: Deploy to Heroku
  env:
    HEROKU_AUTH_TOKEN: ${{ secrets.HEROKU_AUTH_TOKEN }}
    HEROKU_APP_NAME: spec-drive
  run: |
    npm install -g heroku
    echo "$HEROKU_AUTH_TOKEN" | heroku auth:login
    git push https://heroku.com/spec-drive.git main
```

### Option 4: AWS/Digital Ocean (Advanced)

For more control, use containerized deployment:

```bash
# Build Docker image
docker build -t spec-drive:latest .

# Tag for registry
docker tag spec-drive:latest your-registry/spec-drive:latest

# Push to registry
docker push your-registry/spec-drive:latest

# Deploy using your preferred orchestration (ECS, Kubernetes, etc.)
```

---

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/dbname

# JWT Authentication
JWT_SECRET=your-super-secret-key-min-32-chars
REFRESH_TOKEN_SECRET=another-secret-key-min-32-chars

# SendGrid Email
SENDGRID_API_KEY=sg_your_api_key
FROM_EMAIL=noreply@yourdomain.com
APP_URL=https://spec-drive.example.com

# Application
NODE_ENV=production
VITE_API_URL=https://api.spec-drive.example.com
```

### Optional Variables

```bash
# Redis (for CSRF tokens and caching)
REDIS_URL=redis://host:6379

# Error Tracking
SENTRY_DSN=https://your-sentry-dsn

# AI Services
GEMINI_API_KEY=your-gemini-key

# GitHub Integration
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

### Environment Variable Management

**DO NOT commit `.env.local` or secrets to Git!**

Use platform-specific secret management:

- **Railway**: `railway variables set KEY=value`
- **Render**: Dashboard > Environment
- **Heroku**: `heroku config:set KEY=value`
- **GitHub**: Settings > Secrets and variables > Actions

---

## Database Setup

### Initial Migration

```bash
# Generate migrations from schema
pnpm db:generate

# Apply migrations to production
pnpm db:migrate

# Or with Neon CLI
neon sql --set-branch production < migrations/0001_*.sql
```

### Create Database Backups

#### Neon (Auto-backups included)

- Automatic daily backups
- 30-day retention
- Access via Neon dashboard

#### Manual PostgreSQL Backup

```bash
# Dump database
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

#### Automated Backups with GitHub Actions

```yaml
- name: Backup database
  run: |
    pg_dump $DATABASE_URL > "backup-$(date +%Y%m%d).sql"
    # Upload to S3 or backup service
```

### Database Indexes (Performance)

Already included in migrations, but verify:

```sql
-- Check indexes
SELECT * FROM pg_indexes WHERE tablename IN ('users', 'projects', 'authSessions');

-- Add if missing
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The `.github/workflows/ci-cd.yml` includes:

1. **Lint & Test** (on every PR and push)
   - ESLint checks
   - Unit tests with coverage
   - Database integration tests

2. **Security Scan** (Trivy vulnerability scan)
   - Filesystem scanning
   - Dependency vulnerabilities
   - Results uploaded to GitHub Security

3. **Build** (on every push)
   - Application build
   - Docker image build and push to registry

4. **E2E Tests** (on PRs)
   - Playwright E2E tests
   - Artifact upload

5. **Deploy** (only on main branch push)
   - Automatic production deployment
   - Health checks
   - Success notifications

### Required GitHub Secrets

Set these in Settings > Secrets and variables > Actions:

```
PRODUCTION_DATABASE_URL          # Production database URL
SENDGRID_API_KEY                # SendGrid API key
JWT_SECRET                       # JWT secret key
REFRESH_TOKEN_SECRET            # Refresh token secret
PRODUCTION_URL                  # Production URL for health checks

# Choose one of these for deployment:
RAILWAY_API_TOKEN               # For Railway.app
RENDER_DEPLOY_HOOK             # For Render.com
HEROKU_AUTH_TOKEN              # For Heroku
```

### Manual Deployment

If you need to deploy without pushing to main:

```bash
# Railway
railway up

# Heroku
git push heroku main

# Render
curl $RENDER_DEPLOY_HOOK
```

---

## Monitoring & Maintenance

### Health Checks

The application exposes a health endpoint:

```bash
curl https://your-app.com/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production"
}
```

### Logging

Monitor application logs:

```bash
# Railway
railway logs

# Heroku
heroku logs --tail

# Render
render logs
```

### Error Tracking with Sentry (Optional)

```bash
# Install
npm install @sentry/node

# Configure
SENTRY_DSN=https://...@sentry.io/...
```

### Performance Monitoring

Monitor these metrics:

- Database query performance
- API response times
- Error rates
- Memory usage
- Disk space (especially database)

### Scheduled Maintenance

- **Daily**: Check error logs
- **Weekly**: Review database size and backups
- **Monthly**: Update dependencies
- **Quarterly**: Security audit

---

## Troubleshooting

### Application won't start

```bash
# Check logs
docker-compose logs app

# Verify environment variables
echo $DATABASE_URL

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"
```

### Database migration failed

```bash
# Rollback last migration
pnpm db:migrate:down

# Or with Neon
neon sql < rollback.sql

# Re-run migration
pnpm db:migrate
```

### High memory usage

```bash
# Check Node.js process
node --max-old-space-size=512 dist/server/index.js

# Or in Dockerfile
ENV NODE_OPTIONS="--max-old-space-size=512"
```

### Email not sending

- Verify SENDGRID_API_KEY is set
- Check SendGrid dashboard for bounces
- Verify FROM_EMAIL is configured
- Check spam folder for test emails

### CSRF token issues

If you see "CSRF token missing" errors:

1. Ensure Redis is running (if using persistent storage)
2. Check CSRF middleware is enabled in server
3. Verify browser sends X-CSRF-Token header

### Performance issues

```sql
-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM projects WHERE user_id = '...';

-- Vacuum and analyze
VACUUM ANALYZE;
```

---

## Checklist for Production

Before deploying to production:

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Secrets stored securely (not in code)
- [ ] SSL/TLS certificate configured
- [ ] Backup strategy in place
- [ ] Error tracking enabled (Sentry)
- [ ] Logging configured
- [ ] Health checks working
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] DNS/domain configured
- [ ] HTTPS enforced
- [ ] Rate limiting enabled
- [ ] Email service tested
- [ ] Database indexes created

---

## Support & Resources

- **Neon Docs**: https://neon.tech/docs
- **Railway Docs**: https://railway.app/docs
- **Render Docs**: https://render.com/docs
- **Heroku Docs**: https://devcenter.heroku.com
- **Docker Docs**: https://docs.docker.com
- **PostgreSQL Docs**: https://www.postgresql.org/docs

---

Generated: 2024
