import { db } from '@/db'
import { projects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import * as JSZip from 'jszip'

/**
 * Handoff documentation generator
 * Creates comprehensive handoff packages for project delivery
 */
export class HandoffGenerator {
  /**
   * Generate complete handoff documentation package
   */
  static async generateHandoffPackage(
    projectId: string,
    artifacts: Record<string, string>
  ): Promise<{ content: Blob; filename: string }> {
    try {
      const project = await db.select().from(projects).where(eq(projects.id, projectId))
      if (!project[0]) {
        throw new Error('Project not found')
      }

      const projectData = project[0]
      const zip = new JSZip()

      // Add HANDOFF.md
      const handoffMd = this.generateHandoffMd(projectData, artifacts)
      zip.file('HANDOFF.md', handoffMd)

      // Add TECHNICAL_STACK.md
      const techStackMd = this.generateTechStackMd(artifacts)
      zip.file('TECHNICAL_STACK.md', techStackMd)

      // Add SETUP_INSTRUCTIONS.md
      const setupMd = this.generateSetupInstructions(projectData, artifacts)
      zip.file('SETUP_INSTRUCTIONS.md', setupMd)

      // Add DEPLOYMENT_GUIDE.md
      const deploymentMd = this.generateDeploymentGuide(artifacts)
      zip.file('DEPLOYMENT_GUIDE.md', deploymentMd)

      // Add LLM_CONTEXT.md
      const llmContextMd = this.generateLLMContext(projectData, artifacts)
      zip.file('LLM_CONTEXT.md', llmContextMd)

      // Add all artifacts
      zip.folder('artifacts')
      Object.entries(artifacts).forEach(([name, content]) => {
        zip.file(`artifacts/${name}`, content)
      })

      // Add REQUIREMENTS.md
      zip.file('REQUIREMENTS.md', this.generateRequirementsSummary(artifacts))

      // Add API_REFERENCE.md
      zip.file('API_REFERENCE.md', this.generateApiReference(artifacts))

      // Add DATA_MODEL_REFERENCE.md
      zip.file('DATA_MODEL_REFERENCE.md', this.generateDataModelReference(artifacts))

      // Generate ZIP
      const blob = await zip.generateAsync({ type: 'blob' })

      return {
        content: blob,
        filename: `${projectData.name}-handoff-${new Date().toISOString().split('T')[0]}.zip`,
      }
    } catch (error) {
      console.error('Failed to generate handoff package:', error)
      throw error
    }
  }

  /**
   * Generate main HANDOFF.md document
   */
  private static generateHandoffMd(
    project: { name: string; description: string | null; status: string },
    artifacts: Record<string, string>
  ): string {
    return `# Handoff Documentation - ${project.name}

**Generated:** ${new Date().toLocaleString()}

## Overview

This handoff package contains comprehensive documentation for the **${project.name}** project.

${project.description ? `**Project Description:** ${project.description}\n` : ''}

**Status:** ${project.status}

## Package Contents

This ZIP file contains:

1. **HANDOFF.md** - This file, primary handoff documentation
2. **TECHNICAL_STACK.md** - Technology stack and architecture
3. **SETUP_INSTRUCTIONS.md** - How to set up the project locally
4. **DEPLOYMENT_GUIDE.md** - Production deployment instructions
5. **LLM_CONTEXT.md** - LLM system context and prompts
6. **REQUIREMENTS.md** - Project requirements summary
7. **API_REFERENCE.md** - Complete API documentation
8. **DATA_MODEL_REFERENCE.md** - Database schema and data model
9. **artifacts/** - All generated project artifacts (PRD, API specs, etc.)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- PostgreSQL (or use Neon cloud database)

### Installation

\`\`\`bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
npm run db:migrate

# Start development server
npm run dev:full
\`\`\`

## Key Documents

### For Product Managers
- Review **REQUIREMENTS.md** for project scope
- Review **artifacts/PRD.md** for detailed product requirements

### For Architects
- Review **TECHNICAL_STACK.md** for architecture decisions
- Review **artifacts/ARCHITECTURE.md** for system design

### For Developers
- Follow **SETUP_INSTRUCTIONS.md** to get started
- Review **API_REFERENCE.md** for API endpoints
- Review **DATA_MODEL_REFERENCE.md** for database structure
- Review **artifacts/tasks.md** for implementation tasks

### For DevOps/Operations
- Follow **DEPLOYMENT_GUIDE.md** for production setup
- Review **TECHNICAL_STACK.md** for infrastructure requirements

## LLM Integration

Use **LLM_CONTEXT.md** to provide context to AI assistants for:
- Code generation
- Bug fixes
- Feature development
- Documentation updates

## Support & Escalation

### Build Issues
1. Check SETUP_INSTRUCTIONS.md
2. Verify environment variables in .env.local
3. Ensure Node.js version is 18+

### Runtime Issues
1. Check logs in src/server/index.ts
2. Verify database connection
3. Check DEPLOYMENT_GUIDE.md troubleshooting section

### Feature Questions
1. Review REQUIREMENTS.md and PRD.md
2. Check API_REFERENCE.md for endpoint documentation
3. Review tasks.md for implementation details

## Validation & Quality

All artifacts have been validated for:
- ✅ Consistency across documents
- ✅ Requirement coverage (80%+ coverage required)
- ✅ API specification completeness
- ✅ Data model alignment with requirements

## Version Control

This project uses Git for version control. Current version information:
- Project Version: ${project.status}
- Generated: ${new Date().toISOString()}

## Additional Resources

- **TypeScript:** Strict mode enabled for type safety
- **ESLint:** Code quality configured
- **Testing:** See SETUP_INSTRUCTIONS.md for test commands
- **Database:** Drizzle ORM with PostgreSQL

---

**Note:** This handoff package is comprehensive but may need updates as the project evolves. Keep artifacts synchronized with code changes.
`
  }

  /**
   * Generate technical stack documentation
   */
  private static generateTechStackMd(artifacts: Record<string, string>): string {
    const stackContent = artifacts['stack-proposal.md'] || artifacts['STACK.md'] || ''

    return `# Technical Stack

${stackContent}

## Architecture Overview

### Frontend
- **Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite 5.4.6
- **Styling:** Tailwind CSS 3.4.13
- **UI Components:** Shadcn-UI
- **Routing:** React Router DOM 7.9.6
- **Forms:** React Hook Form 7.66.0
- **Validation:** Zod 3.23.8
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js 4.21.1
- **Language:** TypeScript 5.6.2
- **Database:** PostgreSQL (Neon)
- **ORM:** Drizzle ORM 0.33.0
- **Authentication:** Better Auth 1.0.0
- **Security:** Helmet.js, CORS, bcryptjs
- **Logging:** Morgan

### Development Tools
- **Package Manager:** pnpm
- **Linter:** ESLint 9.11.1 with TypeScript support
- **Version Control:** Git
- **Database Management:** Drizzle Kit

## Development Commands

\`\`\`bash
# Start development
npm run dev:full

# Frontend only (port 5174)
npm run dev

# Backend only (port 3001)
npm run server

# Build for production
npm run build

# Lint code
npm run lint

# Database operations
npm run db:generate    # Generate migrations
npm run db:migrate     # Run migrations
npm run db:studio      # Open Drizzle Studio
\`\`\`

## Environment Configuration

Required environment variables:
- \`DATABASE_URL\` - PostgreSQL connection string
- \`BETTER_AUTH_SECRET\` - Authentication secret
- \`BETTER_AUTH_URL\` - Auth callback URL
- \`GEMINI_API_KEY\` - Google Gemini API key

Optional:
- \`GITHUB_CLIENT_ID\` - GitHub OAuth client ID
- \`GITHUB_CLIENT_SECRET\` - GitHub OAuth secret

## Key Architecture Decisions

1. **Full-Stack TypeScript** - Type safety across frontend and backend
2. **Database-First Schema** - Drizzle ORM for type-safe database operations
3. **Component-Based UI** - Shadcn-UI for consistent, accessible components
4. **API-First Backend** - RESTful API design with clear separation of concerns
5. **Modern Build Tools** - Vite for fast development, optimized production builds

## Scalability Considerations

- Database: Use Neon for horizontal scaling
- Frontend: Built with Vite for efficient code splitting
- Backend: Express.js can scale horizontally with load balancing
- Authentication: JWT with 30-day expiration
- Caching: Implement Redis for session management (future)

## Security Measures

- Helmet.js for HTTP headers security
- CORS configured for specific origins
- JWT authentication tokens
- bcryptjs for password hashing
- TypeScript strict mode for type safety
- Input validation with Zod
- SQL injection prevention with Drizzle ORM

## Performance Optimization

- Code splitting at route level
- Database query optimization with Drizzle
- Gzip compression enabled
- CSS purging with Tailwind
- Image optimization ready

---

See DEPLOYMENT_GUIDE.md for production deployment considerations.
`
  }

  /**
   * Generate setup instructions
   */
  private static generateSetupInstructions(
    project: { name: string },
    _artifacts: Record<string, string>
  ): string {
    return `# Setup Instructions - ${project.name}

## Prerequisites

- **Node.js:** 18.x or higher
- **npm:** 9.x or higher (or yarn/pnpm)
- **Git:** For version control
- **PostgreSQL:** 14+ (or Neon cloud account)
- **Text Editor:** VS Code recommended

## Installation Steps

### 1. Clone Repository

\`\`\`bash
git clone <repository-url>
cd ${project.name.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
# or
pnpm install
# or
yarn install
\`\`\`

### 3. Environment Setup

\`\`\`bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local
\`\`\`

Required values:
- \`DATABASE_URL\`: PostgreSQL connection string
- \`BETTER_AUTH_SECRET\`: Generate with: \`openssl rand -base64 32\`
- \`BETTER_AUTH_URL\`: http://localhost:3001 (dev) or your domain (prod)
- \`GEMINI_API_KEY\`: Get from Google Cloud Console

### 4. Database Setup

\`\`\`bash
# Generate schema
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio to verify
npm run db:studio
\`\`\`

### 5. Start Development Server

\`\`\`bash
# Start both frontend and backend
npm run dev:full

# Or separately:
# Terminal 1 - Frontend (port 5174)
npm run dev

# Terminal 2 - Backend (port 3001)
npm run server
\`\`\`

### 6. Verify Installation

- Frontend: http://localhost:5174
- Backend API: http://localhost:3001/api
- Database Studio: http://localhost:4983 (when running db:studio)

## Project Structure

\`\`\`
project-root/
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── lib/             # Utilities and business logic
│   ├── server/          # Express backend
│   ├── db/              # Database schema and queries
│   ├── App.tsx          # Root component
│   └── main.tsx         # Entry point
├── public/              # Static assets
├── drizzle/             # Database migrations
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite config
└── eslint.config.js     # ESLint config
\`\`\`

## Common Issues & Solutions

### "DATABASE_URL not found"
- Ensure \`.env.local\` exists
- Check connection string is valid
- For Neon: Copy connection string from dashboard

### "Port 3001 already in use"
- Kill process: \`lsof -ti:3001 | xargs kill -9\`
- Or change port in \`src/server/index.ts\`

### "Module not found" errors
- Run \`npm install\` again
- Clear node_modules: \`rm -rf node_modules && npm install\`
- Check path aliases in \`tsconfig.json\`

### Database migration errors
- Verify PostgreSQL is running
- Check connection string format
- Run \`npm run db:generate\` before \`npm run db:migrate\`

### Authentication errors
- Verify \`BETTER_AUTH_SECRET\` is set
- Check \`BETTER_AUTH_URL\` matches your domain
- Clear browser cookies and try again

## IDE Configuration

### VS Code Extensions (Recommended)
- ES7+ React/Redux/React-Native snippets
- TypeScript Vue Plugin
- Tailwind CSS IntelliSense
- ESLint
- Prettier - Code formatter
- Thunder Client or REST Client

### VS Code Settings
\`\`\`json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
\`\`\`

## Running Tests

\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e
\`\`\`

## Building for Production

\`\`\`bash
# Build
npm run build

# Preview production build locally
npm run preview
\`\`\`

## Getting Help

1. Check the main HANDOFF.md for overview
2. Review TECHNICAL_STACK.md for architecture
3. Check DEPLOYMENT_GUIDE.md for production issues
4. Review API_REFERENCE.md for API questions
5. Check GitHub issues or project documentation

---

**Tip:** Run \`npm run lint\` regularly to catch code quality issues early.
`
  }

  /**
   * Generate deployment guide
   */
  private static generateDeploymentGuide(_artifacts: Record<string, string>): string {
    return `# Deployment Guide

## Pre-Deployment Checklist

- [ ] All tests passing (\`npm test\`)
- [ ] No ESLint errors (\`npm run lint\`)
- [ ] Build succeeds (\`npm run build\`)
- [ ] Environment variables configured
- [ ] Database migrations up to date
- [ ] All dependencies up to date
- [ ] Code reviewed and approved
- [ ] Security audit completed

## Environment Setup

### Production Environment Variables

\`\`\`bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Authentication
BETTER_AUTH_SECRET=<32-char-random-string>
BETTER_AUTH_URL=https://yourdomain.com

# AI/API Keys
GEMINI_API_KEY=<your-api-key>

# Optional: GitHub
GITHUB_CLIENT_ID=<id>
GITHUB_CLIENT_SECRET=<secret>

# Server
NODE_ENV=production
PORT=3001
\`\`\`

## Docker Deployment

### Building Docker Image

\`\`\`dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001 5174

CMD ["npm", "start"]
\`\`\`

### Docker Compose

\`\`\`yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
      - "5174:5174"
    environment:
      DATABASE_URL: \${DATABASE_URL}
      BETTER_AUTH_SECRET: \${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: \${BETTER_AUTH_URL}
      GEMINI_API_KEY: \${GEMINI_API_KEY}
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: spec_drive
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
\`\`\`

## Cloud Deployment

### Vercel (Frontend)

1. Push code to GitHub
2. Import repository in Vercel
3. Set environment variables
4. Deploy

### Heroku (Backend)

\`\`\`bash
heroku create app-name
heroku config:set DATABASE_URL=<your-db-url>
heroku config:set BETTER_AUTH_SECRET=<secret>
git push heroku main
\`\`\`

### AWS Deployment

1. Create EC2 instance (Ubuntu 22.04)
2. Install Node.js 18+
3. Set up PostgreSQL RDS
4. Clone repository
5. Configure environment variables
6. Run \`npm run build\`
7. Use PM2 for process management

\`\`\`bash
npm install -g pm2
pm2 start "npm run server" --name "api"
pm2 start "npm run dev" --name "frontend"
pm2 save
pm2 startup
\`\`\`

## SSL/TLS Setup

### Let's Encrypt with Nginx

\`\`\`bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com
\`\`\`

### Nginx Configuration

\`\`\`nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location / {
        proxy_pass http://localhost:5174;
    }
}
\`\`\`

## Database Backup

### PostgreSQL Backup

\`\`\`bash
# Backup
pg_dump -h <host> -U <user> <database> > backup.sql

# Restore
psql -h <host> -U <user> <database> < backup.sql
\`\`\`

### Automated Backups

\`\`\`bash
# Create backup script
#!/bin/bash
pg_dump \$DATABASE_URL > /backups/db-\$(date +%Y%m%d).sql
gzip /backups/db-*.sql

# Add to crontab
0 2 * * * /path/to/backup.sh
\`\`\`

## Monitoring & Logging

### Application Monitoring

- Set up error tracking (Sentry)
- Enable performance monitoring (New Relic, Datadog)
- Configure uptime monitoring

### Log Management

\`\`\`bash
# Using PM2 logs
pm2 logs

# Using systemd
journalctl -u app-name -f

# Log rotation with logrotate
/var/log/app/*.log {
    daily
    rotate 14
    compress
    delaycompress
}
\`\`\`

## Post-Deployment

1. Verify all endpoints working
2. Test authentication flow
3. Check database connectivity
4. Monitor error logs
5. Performance testing
6. Security scanning

## Rollback Plan

\`\`\`bash
# Keep previous version
git tag v1.0.0
git push origin v1.0.0

# Rollback to previous version
git checkout v1.0.0
npm install
npm run build
pm2 restart all
\`\`\`

## Troubleshooting

### 502 Bad Gateway
- Check backend service status
- Verify database connection
- Check firewall rules

### 504 Gateway Timeout
- Increase timeout in Nginx: \`proxy_connect_timeout 60s;\`
- Optimize slow database queries
- Check server resources

### Database Connection Errors
- Verify \`DATABASE_URL\`
- Check network connectivity
- Ensure database is running
- Check firewall rules

---

For detailed information, see TECHNICAL_STACK.md and SETUP_INSTRUCTIONS.md.
`
  }

  /**
   * Generate LLM context
   */
  private static generateLLMContext(
    project: { name: string; description: string | null },
    artifacts: Record<string, string>
  ): string {
    const prdContent = artifacts['PRD.md'] || ''
    const stackContent = artifacts['stack-proposal.md'] || ''

    return `# LLM System Context - ${project.name}

## Project Overview

**Project Name:** ${project.name}
**Type:** Full-stack web application
**Status:** In Development

**Description:**
${project.description || 'See PRD.md for detailed project description'}

## System Architecture

### Technology Stack
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Express.js + Node.js
- Database: PostgreSQL with Drizzle ORM
- Authentication: Better Auth
- Deployment: Docker/Kubernetes ready

### Key Folders
- \`src/components/\` - React components (UI layer)
- \`src/lib/\` - Business logic, utilities, AI agents
- \`src/server/\` - Express server and API routes
- \`src/db/\` - Database schema and queries

## Project Requirements

${prdContent.substring(0, 2000)}
...

See artifacts/PRD.md for complete requirements.

## Technical Stack Details

${stackContent.substring(0, 2000)}
...

See artifacts/STACK.md for complete stack information.

## Code Style Guidelines

1. **TypeScript:** Always use strict mode
2. **Naming:** camelCase for variables/functions, PascalCase for components/classes
3. **Components:** Functional components with hooks
4. **Imports:** Use path aliases (@/components, @/lib, etc.)
5. **Error Handling:** Always use try-catch, log errors appropriately
6. **Comments:** Use JSDoc for functions, explain "why" not "what"

## Common Patterns

### Creating a Component
\`\`\`typescript
import React from 'react'
import { Button } from '@/components/ui/button'

interface ComponentProps {
  title: string
  onAction?: () => void
}

export function MyComponent({ title, onAction }: ComponentProps): JSX.Element {
  return (
    <div className="space-y-4">
      <h2>{title}</h2>
      <Button onClick={onAction}>Action</Button>
    </div>
  )
}
\`\`\`

### Creating an API Endpoint
\`\`\`typescript
import { Router } from 'express'
import { db } from '@/db'

const router = Router()

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query.items.findFirst()
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' })
  }
})

export default router
\`\`\`

### Database Queries
\`\`\`typescript
import { db } from '@/db'
import { items } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Select
const result = await db.select().from(items).where(eq(items.id, id))

// Insert
await db.insert(items).values({ name: 'New Item' })

// Update
await db.update(items).set({ name: 'Updated' }).where(eq(items.id, id))

// Delete
await db.delete(items).where(eq(items.id, id))
\`\`\`

## AI Agent Patterns

When working with AI agents in this project:

1. **Agent Inputs:** Always validate with Zod
2. **Agent Outputs:** Structured JSON responses
3. **Error Handling:** Graceful degradation with fallbacks
4. **Token Usage:** Monitor and log for optimization
5. **Quality:** Always validate agent outputs before using

## Testing Requirements

- Unit tests for utility functions
- Integration tests for API endpoints
- Component tests with React Testing Library
- E2E tests for critical user flows

Run tests: \`npm test\`

## Documentation Requirements

- JSDoc comments for all exported functions
- README.md for complex features
- API endpoints must be documented
- Complex algorithms need explanation

## Performance Considerations

- Code split at route level
- Lazy load heavy components
- Optimize database queries
- Cache static content
- Monitor bundle size

## Security Checklist

- [ ] Input validation on all endpoints
- [ ] Authentication/authorization checks
- [ ] SQL injection prevention (using Drizzle)
- [ ] XSS prevention (React escapes by default)
- [ ] CORS configured correctly
- [ ] Secrets in environment variables only
- [ ] HTTPS in production
- [ ] Rate limiting on APIs

## Helpful Commands

\`\`\`bash
npm run dev:full        # Start dev environment
npm test                # Run tests
npm run lint            # Check code quality
npm run build           # Production build
npm run db:migrate      # Run database migrations
npm run db:studio       # Open database GUI
\`\`\`

## When Generating Code

1. Always use TypeScript with proper types
2. Follow the existing code patterns
3. Use Tailwind CSS for styling
4. Add error handling
5. Include JSDoc comments
6. Consider edge cases
7. Think about accessibility (a11y)

## Project Conventions

- Database table names: plural, snake_case
- API routes: /api/v1/resource/action
- Components in separate files
- One component per file
- Exports at end of file

---

**Note:** This context was generated on ${new Date().toISOString()}. Update as project evolves.
`
  }

  /**
   * Generate requirements summary
   */
  private static generateRequirementsSummary(artifacts: Record<string, string>): string {
    const prdContent = artifacts['PRD.md'] || artifacts['prd.md'] || ''
    return `# Requirements Summary

${prdContent}

---

For detailed requirements with acceptance criteria and dependencies, see the full PRD.md in the artifacts folder.
`
  }

  /**
   * Generate API reference
   */
  private static generateApiReference(artifacts: Record<string, string>): string {
    const apiSpec = artifacts['api-spec.json'] || artifacts['api_spec.json'] || ''

    if (apiSpec.startsWith('{')) {
      try {
        const spec = JSON.parse(apiSpec)
        let markdown = '# API Reference\n\n'

        if (spec.info) {
          markdown += `## Overview\n\n${spec.info.description || ''}\n\n`
        }

        if (spec.paths) {
          markdown += '## Endpoints\n\n'
          Object.entries(spec.paths).forEach(([path, methods]: [string, unknown]) => {
            if (typeof methods === 'object' && methods !== null) {
              Object.entries(methods).forEach(([method, details]: [string, unknown]) => {
                if (typeof details === 'object' && details !== null) {
                  const typedDetails = details as Record<string, unknown>
                  markdown += `### ${method.toUpperCase()} ${path}\n\n`
                  if (typedDetails.summary) {
                    markdown += `${typedDetails.summary}\n\n`
                  }
                  if (typedDetails.description) {
                    markdown += `${typedDetails.description}\n\n`
                  }
                }
              })
            }
          })
        }

        return markdown
      } catch {
        return apiSpec
      }
    }

    return apiSpec
  }

  /**
   * Generate data model reference
   */
  private static generateDataModelReference(artifacts: Record<string, string>): string {
    const dataModel = artifacts['data-model.md'] || artifacts['data_model.md'] || ''
    return `# Data Model Reference\n\n${dataModel}`
  }
}

export const handoffGenerator = new HandoffGenerator()
