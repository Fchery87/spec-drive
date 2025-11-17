# Next Steps - Spec-Drive Production Launch

This document outlines the immediate next steps to launch Spec-Drive to production.

---

## Immediate Actions (This Week)

### 1. Test Email Service (30 minutes)

**Objective**: Verify SendGrid integration works correctly

**Steps**:
1. Get SendGrid API key from https://sendgrid.com
2. Add to your environment:
   ```bash
   export SENDGRID_API_KEY="sg_your_key_here"
   export FROM_EMAIL="noreply@yourdomain.com"
   export APP_URL="http://localhost:5173"  # or your production URL
   ```
3. Test signup endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "testuser@example.com",
       "password": "TestPassword123",
       "name": "Test User"
     }'
   ```
4. Check email inbox for verification email
5. Test password reset flow

**Expected Outcome**: Emails are sent successfully or logged in dev mode

---

### 2. Configure Error Tracking (30 minutes)

**Objective**: Set up Sentry for real-time error monitoring

**Steps**:
1. Create Sentry account at https://sentry.io (free plan available)
2. Create new project for Node.js
3. Copy your Sentry DSN
4. Add to environment:
   ```bash
   export SENTRY_DSN="https://your-key@sentry.io/project-id"
   ```
5. Start your server and errors will automatically be tracked
6. Visit Sentry dashboard to see errors in real-time

**Verification**:
- Error alerts appear in Sentry dashboard
- Stacktraces are properly captured
- Performance metrics are tracked

---

### 3. Verify Database Indexes (15 minutes)

**Objective**: Confirm performance indexes are applied

**Steps**:
1. Connect to your production database:
   ```bash
   psql $DATABASE_URL
   ```
2. Check indexes are created:
   ```sql
   SELECT * FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename IN ('users', 'projects', 'auth_sessions')
   ORDER BY tablename, indexname;
   ```
3. Verify 20+ indexes are listed

**Expected Output**: List of all performance indexes we created

---

### 4. Set Up Environment Variables (15 minutes)

**Objective**: Prepare all required environment variables

**Create a `.env.production` file with:**

```bash
# Database
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
REFRESH_TOKEN_SECRET="your-super-secret-refresh-token-key-min-32-chars"

# Email Service
SENDGRID_API_KEY="sg_your_sendgrid_api_key"
FROM_EMAIL="noreply@yourdomain.com"
APP_URL="https://yourdomain.com"  # IMPORTANT: Use https in production

# Application
VITE_API_URL="https://api.yourdomain.com"
NODE_ENV="production"
PORT="3001"

# Error Tracking
SENTRY_DSN="https://your-key@sentry.io/project-id"

# Logging
LOG_LEVEL="info"

# Optional
REDIS_URL="redis://your-redis-host:6379"
GEMINI_API_KEY="your-gemini-api-key"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

**Security Notes**:
- ⚠️ Never commit this file to Git
- Use a secrets vault for production
- Rotate secrets regularly
- Use strong random values for secrets

---

## Short Term (Next 2 Weeks)

### 5. Set Up HTTPS/SSL (1-2 hours)

**Choose Your Approach**:

#### Option A: Using Railway/Render/Heroku (Easiest)
- These platforms provide free HTTPS automatically
- Skip to Step 6

#### Option B: Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Add to your application
```

#### Option C: Cloudflare (Free)
1. Point your DNS to Cloudflare
2. Enable SSL in Cloudflare dashboard
3. Set SSL mode to "Full (strict)"

**Verification**:
```bash
curl -I https://yourdomain.com
# Should show "200 OK" and SSL certificate
```

---

### 6. Deploy to Production (1-2 hours)

**Choose Your Platform**:

#### Option A: Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add postgres

# Deploy
railway up

# View logs
railway logs
```

#### Option B: Render
1. Connect your GitHub repository
2. Create new Web Service
3. Set build command: `pnpm install && pnpm run build`
4. Set start command: `node dist/server/index.js`
5. Add environment variables
6. Deploy

#### Option C: Heroku
```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create spec-drive

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

**Verification**:
```bash
curl https://yourdomain.com/health
# Should return: {"status":"ok",...}
```

---

### 7. Configure Database Backups (30 minutes)

**If Using Neon (Recommended)**:
- Automatic daily backups already enabled
- Access via Neon dashboard
- No additional setup needed

**If Using Another Provider**:

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-bucket/backups/
rm backup_$DATE.sql
EOF

# Schedule with cron (daily at 2 AM)
0 2 * * * /path/to/backup.sh
```

**Test Recovery**:
```bash
# Restore from backup
psql $DATABASE_URL < backup.sql
```

---

## Medium Term (Next Month)

### 8. Write Comprehensive Tests (2-3 days)

**Install Testing Tools**:
```bash
pnpm add --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Create Sample Tests**:

**`src/server/routes/auth.test.ts`**:
```typescript
describe('Auth Routes', () => {
  it('should sign up a user', async () => {
    // Test signup endpoint
  });

  it('should log in a user', async () => {
    // Test login endpoint
  });

  it('should reject invalid credentials', async () => {
    // Test error handling
  });
});
```

**Target Coverage**: >80% for critical paths

**Run Tests**:
```bash
pnpm test --coverage
```

---

### 9. Set Up Monitoring Dashboard (2-3 hours)

**Option A: Sentry (Already Configured)**
- Visit https://sentry.io
- View errors and performance metrics
- Set up alert rules

**Option B: Datadog (Premium)**
- Comprehensive monitoring
- Custom dashboards
- Infrastructure metrics

**Option C: New Relic (Premium)**
- APM (Application Performance Monitoring)
- Infrastructure monitoring
- Real user monitoring

**What to Monitor**:
- Error rates
- Response times
- Database query performance
- CPU and memory usage
- Disk space
- Active users

---

### 10. Implement Redis/Caching (1-2 days)

**Install Redis**:
```bash
pnpm add redis ioredis
```

**Use Case 1: CSRF Token Storage**
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Store token
await redis.set(`csrf:${sessionId}`, token, 'EX', 86400);

// Retrieve token
const storedToken = await redis.get(`csrf:${sessionId}`);
```

**Use Case 2: Session Caching**
```typescript
// Cache user data for 1 hour
await redis.setex(`user:${userId}`, 3600, JSON.stringify(userData));
```

**Benefits**:
- Faster CSRF token lookup
- Better distributed deployment support
- Session sharing across servers
- Automatic expiration

---

## Launch Checklist

Before going live, verify everything on this checklist:

### Security
- ☐ HTTPS configured and enforced
- ☐ Secrets stored securely (not in code)
- ☐ Rate limiting enabled
- ☐ CSRF protection active
- ☐ Password hashing (bcrypt) in use
- ☐ Email verification working

### Reliability
- ☐ Error tracking (Sentry) configured
- ☐ Logging to files with rotation
- ☐ Database backups automated
- ☐ Health check endpoint working
- ☐ Database indexes applied
- ☐ Graceful shutdown implemented

### Performance
- ☐ Database indexes verified
- ☐ No N+1 queries in logs
- ☐ Response times < 500ms
- ☐ Frontend assets optimized
- ☐ Redis/caching configured

### Operations
- ☐ Deployment automated (CI/CD)
- ☐ Environment variables documented
- ☐ Monitoring dashboard setup
- ☐ Backup/restore tested
- ☐ Team trained on deployment
- ☐ Incident response plan created

### Documentation
- ☐ README.md updated
- ☐ DEPLOYMENT_GUIDE.md reviewed
- ☐ Environment variables documented
- ☐ Database schema documented
- ☐ API endpoints documented
- ☐ Troubleshooting guide created

### Testing
- ☐ Unit tests >80% coverage
- ☐ Integration tests passing
- ☐ E2E tests for critical flows
- ☐ Load testing completed
- ☐ Security audit passed

---

## Rollback Plan

If something goes wrong in production:

### Quick Rollback
```bash
# Railway
railway rollback <deployment-id>

# Heroku
heroku releases
heroku rollback v<number>

# Render
Push previous commit to trigger redeploy
```

### Database Rollback
```bash
# Restore from backup
psql $DATABASE_URL < backup_before_issue.sql
```

### Emergency Contact
- On-call engineer: [Add contact]
- Incident channel: [Add Slack channel]
- Customer status page: [Add URL]

---

## Post-Launch (First Week)

### Monitor Everything
1. Check Sentry dashboard for errors
2. Review logs for warnings
3. Monitor database performance
4. Check email delivery rates
5. Verify API response times

### Customer Communication
- Send "we're live" announcement
- Provide feedback channels
- Monitor support tickets
- Track user issues

### Continuous Improvement
- Review logs for bottlenecks
- Optimize slow queries
- Update documentation
- Plan for scaling

---

## Support & Resources

### Documentation
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Production readiness
- [CRITICAL_GAPS_SUMMARY.md](./CRITICAL_GAPS_SUMMARY.md) - What was implemented
- [README.md](./README.md) - Project overview

### External Resources
- [Sentry Docs](https://docs.sentry.io/platforms/node/)
- [Railway Docs](https://railway.app/docs)
- [Let's Encrypt](https://letsencrypt.org/)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

### Important Links
- SendGrid: https://sendgrid.com
- Sentry: https://sentry.io
- Railway: https://railway.app
- Render: https://render.com
- Heroku: https://heroku.com

---

## Estimated Timeline

| Task | Duration | Priority |
|------|----------|----------|
| Test Email Service | 30 min | High |
| Configure Sentry | 30 min | High |
| Set up HTTPS | 1-2 hrs | High |
| Deploy to Production | 1-2 hrs | High |
| Configure Backups | 30 min | High |
| Write Tests | 2-3 days | Medium |
| Set up Monitoring | 2-3 hrs | Medium |
| Implement Caching | 1-2 days | Medium |

**Total**: ~1-2 weeks for production launch

---

## Questions?

Refer to:
1. `DEPLOYMENT_GUIDE.md` - How to deploy
2. `PRODUCTION_CHECKLIST.md` - What needs to be done
3. `CRITICAL_GAPS_SUMMARY.md` - What was implemented
4. External documentation linked above

---

**Good luck with your launch! 🚀**

Generated: 2024-11-17
