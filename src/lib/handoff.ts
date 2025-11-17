import JSZip from 'jszip';
import type { ProjectResponse, ProjectArtifactResponse } from '@/lib/api';

export interface HandoffOptions {
  includeSourceCode: boolean;
  includeLLMPrompts: boolean;
  includeValidationReports: boolean;
  includeDeploymentGuide: boolean;
  format: 'zip' | 'markdown' | 'json';
}

export interface HandoffBundle {
  project: ProjectResponse;
  artifacts: ProjectArtifactResponse[];
  generatedAt: string;
  handoffDocument: string;
  zipBuffer?: Buffer;
  metadata: {
    totalArtifacts: number;
    phasesCompleted: string[];
    technologyStack: string[];
    estimatedDevelopmentTime: number;
  };
}

// Main handoff generation class
export class HandoffGenerator {
  async generateHandoff(
    project: ProjectResponse,
    artifacts: ProjectArtifactResponse[],
    options: HandoffOptions = {
      includeSourceCode: true,
      includeLLMPrompts: true,
      includeValidationReports: true,
      includeDeploymentGuide: true,
      format: 'zip',
    }
  ): Promise<HandoffBundle> {
    // Generate HANDOFF.md document
    const handoffDocument = await this.generateHandoffDocument(
      project,
      artifacts,
      options
    );

    let zipBuffer: Buffer | undefined;

    if (options.format === 'zip') {
      zipBuffer = await this.generateZIP(
        project,
        artifacts,
        handoffDocument,
        options
      );
    }

    return {
      project,
      artifacts,
      generatedAt: new Date().toISOString(),
      handoffDocument,
      zipBuffer,
      metadata: this.calculateMetadata(project, artifacts),
    };
  }

  private async generateHandoffDocument(
    project: ProjectResponse,
    artifacts: ProjectArtifactResponse[],
    options: HandoffOptions
  ): Promise<string> {
    const sections = [
      this.generateProjectOverview(project),
      this.generateTechnologyStack(project),
      this.generateRequirementsSection(artifacts),
      this.generateArchitectureSection(artifacts),
      this.generateDevelopmentGuide(project, artifacts),
      this.generateDeploymentGuide(project, artifacts),
      this.generateQualityAssuranceSection(artifacts),
      this.generateMaintenanceGuide(project),
    ];

    // Add LLM prompts section if requested
    if (options.includeLLMPrompts) {
      sections.push(this.generateLLMPromptsSection(artifacts));
    }

    sections.push(this.generateAppendices(project, artifacts));

    return sections.join('\n\n');
  }

  private generateProjectOverview(project: ProjectResponse): string {
    return `# ${project.name} - Project Handoff

## Project Overview
- **Project Name**: ${project.name}
- **Description**: ${project.description}
- **Current Phase**: ${project.currentPhase}
- **Phases Completed**: ${project.phasesCompleted.join(', ') || 'None'}
- **Generated**: ${new Date().toISOString().split('T')[0]}

## Executive Summary
${project.idea}

## Project Vision
This project was generated using the Spec-Driven Orchestrator, which automatically created a comprehensive project specification including requirements, architecture, task breakdown, and all necessary documentation for development.

## Success Criteria
- All functional requirements implemented and tested
- Cross-artifact validation passes
- Performance benchmarks met
- Security requirements satisfied
- Scalability requirements addressed`;
  }

  private generateTechnologyStack(project: ProjectResponse): string {
    const isNextJSTack = project.stackChoice?.includes('nextjs');

    return `## Technology Stack

${
  isNextJSTack
    ? `### Recommended Stack (Next.js Ecosystem)
- **Frontend**: Next.js 14+ with TypeScript
- **Backend**: Next.js API Routes / Edge Functions
- **Database**: PostgreSQL with Neon
- **ORM**: Drizzle ORM
- **Authentication**: Better Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query / SWR
- **Testing**: Jest + React Testing Library
- **Deployment**: Vercel / Netlify

### Stack Justification
This stack was selected for:
- Rapid development velocity
- Full-stack TypeScript support
- Excellent developer experience
- Strong community support
- Built-in performance optimizations`
    : `### Custom Technology Stack
${project.stackChoice || 'Stack details to be determined during development'}
`
}

### Development Dependencies
- **TypeScript**: Type safety and better developer experience
- **ESLint + Prettier**: Code quality and formatting
- **Husky**: Pre-commit hooks for quality gates
- **Storybook**: Component documentation and testing

### Production Dependencies
- **Monitoring**: Error tracking and performance monitoring
- **Security**: Rate limiting, CORS, helmet
- **Performance**: Caching strategies, CDN setup`;
  }

  private generateRequirementsSection(
    artifacts: ProjectArtifactResponse[]
  ): string {
    const prdArtifact = artifacts.find((a) => a.artifactName === 'PRD.md');

    return `## Requirements & Specifications

${
  prdArtifact
    ? `### Product Requirements Document (PRD)
The PRD contains all functional and non-functional requirements with acceptance criteria.

**Key Requirements Areas:**
- User authentication and authorization
- Core business logic implementation
- Data management and persistence
- User interface requirements
- Performance and scalability
- Security requirements

**Requirement Numbering System:**
Requirements follow the REQ-AREA-XXX format:
- REQ-FUNC-001: Functional requirement
- REQ-SEC-001: Security requirement
- REQ-PERF-001: Performance requirement

**Acceptance Criteria:**
Each requirement includes detailed acceptance criteria for testing and validation.`
    : 'Requirements section will be populated during the specification phase.'
}

### API Specifications
- RESTful API design following OpenAPI standards
- Authentication and authorization requirements
- Error handling and validation
- Rate limiting and security measures

### Data Model
- Entity relationship diagrams
- Database schema design
- Data validation rules
- Privacy and compliance considerations`;
  }

  private generateArchitectureSection(
    artifacts: ProjectArtifactResponse[]
  ): string {
    const architectureArtifact = artifacts.find(
      (a) => a.artifactName === 'architecture.md'
    );

    return `## System Architecture

${
  architectureArtifact
    ? `### Architecture Overview
The system follows a modern full-stack architecture with clear separation of concerns.

**Architecture Principles:**
- Microservices-ready design
- API-first approach
- Event-driven communication
- Scalable and maintainable code structure`
    : 'Architecture documentation will be generated during the design phase.'
}

### System Components
1. **Frontend Application**: React-based SPA with TypeScript
2. **API Layer**: RESTful API with proper error handling
3. **Database Layer**: PostgreSQL with optimized queries
4. **Authentication**: Secure user management and session handling
5. **File Storage**: Cloud storage for user uploads and assets

### Data Flow
- Client-side state management
- API communication patterns
- Database transaction handling
- Error propagation and handling`;
  }

  private generateDevelopmentGuide(
    project: ProjectResponse,
    artifacts: ProjectArtifactResponse[]
  ): string {
    const tasksArtifact = artifacts.find((a) => a.artifactName === 'tasks.md');

    return `## Development Guide

### Getting Started
1. **Environment Setup**
   \`\`\`bash
   # Clone repository
   git clone <repository-url>
   cd ${project.slug}
   
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp .env.example .env.local
   
   # Run database migrations
   npm run db:migrate
   
   # Start development server
   npm run dev
   \`\`\`

### Development Workflow
1. **Setup**: Environment configuration and database setup
2. **Development**: Feature development following requirements
3. **Testing**: Unit and integration tests for all components
4. **Code Review**: Pull request review process
5. **Deployment**: Staging and production deployment

${
  tasksArtifact
    ? `### Development Tasks
The project has been broken down into manageable tasks:

**Epic Structure:**
- Each epic contains 3-5 user stories
- Stories include acceptance criteria
- Tasks are estimated for planning
- Dependencies are mapped for sequencing

**Task Breakdown:**
- UI/UX implementation tasks
- Backend API development tasks
- Database schema and migration tasks
- Testing and quality assurance tasks
- Documentation and deployment tasks`
    : 'Detailed task breakdown will be available after the solutioning phase.'
}

### Code Standards
- **TypeScript**: Strict typing for better code quality
- **ESLint**: Code quality and consistency rules
- **Prettier**: Automatic code formatting
- **Conventional Commits**: Standardized commit messages
- **Code Coverage**: Maintain 80%+ test coverage`;
  }

  private generateDeploymentGuide(
    project: ProjectResponse,
    artifacts: ProjectArtifactResponse[]
  ): string {
    const dependenciesArtifact = artifacts.find(
      (a) => a.artifactName === 'DEPENDENCIES.md'
    );

    return `## Deployment Guide

### Deployment Architecture
${
  dependenciesArtifact
    ? `### Production Stack
- **Platform**: Vercel (recommended for Next.js) or custom hosting
- **Database**: Managed PostgreSQL (Neon/PlanetScale)
- **CDN**: Cloudflare or AWS CloudFront
- **Monitoring**: Sentry for error tracking
- **Analytics**: Google Analytics or Plausible

### Environment Configuration
\`\`\`env
# Production Environment Variables
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
\`\`\``
    : 'Deployment configuration will be detailed after dependency analysis.'
}

### Deployment Process
1. **Pre-deployment Checklist**
   - All tests passing
   - Environment variables configured
   - Database migrations ready
   - SSL certificates configured

2. **Deployment Steps**
   \`\`\`bash
   # Build production bundle
   npm run build
   
   # Run production checks
   npm run lint
   npm run test
   
   # Deploy to staging
   npm run deploy:staging
   
   # Deploy to production
   npm run deploy:production
   \`\`\`

3. **Post-deployment**
   - Health checks passing
   - Monitoring alerts configured
   - Performance benchmarks met

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment
- **Quality Gates**: Linting, testing, and security scans
- **Staging Environment**: Full testing before production
- **Rollback Strategy**: Quick rollback capability`;
  }

  private generateQualityAssuranceSection(
    artifacts: ProjectArtifactResponse[]
  ): string {
    return `## Quality Assurance

### Testing Strategy
1. **Unit Testing**: Individual component and function testing
2. **Integration Testing**: API and database interaction testing
3. **E2E Testing**: Complete user workflow testing
4. **Performance Testing**: Load and stress testing
5. **Security Testing**: Vulnerability and penetration testing

### Quality Metrics
- **Code Coverage**: Maintain 80%+ coverage
- **Performance**: Page load times under 2 seconds
- **Accessibility**: WCAG 2.1 AA compliance
- **Security**: Zero critical vulnerabilities
- **User Experience**: Lighthouse score above 90

### Validation Framework
- **Cross-artifact validation**: Ensures consistency between requirements, design, and implementation
- **Automated testing**: CI/CD integration for quality gates
- **Manual testing**: User acceptance testing protocols`;
  }

  private generateMaintenanceGuide(project: ProjectResponse): string {
    return `## Maintenance & Operations

### Monitoring & Alerting
- **Application Performance**: Response times and error rates
- **Database Performance**: Query execution times and connection pools
- **User Analytics**: Usage patterns and feature adoption
- **Security Monitoring**: Authentication attempts and suspicious activity

### Backup & Recovery
- **Database Backups**: Daily automated backups with point-in-time recovery
- **Code Repository**: Git-based version control with multiple remotes
- **Environment Configuration**: Infrastructure as Code for reproducibility

### Updates & Patches
- **Dependency Updates**: Monthly security updates and quarterly major updates
- **Feature Releases**: Bi-weekly sprint cycles
- **Hotfixes**: Emergency fixes with 24-hour response time

### Support Documentation
- **Troubleshooting Guide**: Common issues and solutions
- **API Documentation**: Complete endpoint reference
- **Admin Guide**: System administration procedures
- **User Manual**: End-user documentation`;
  }

  private generateLLMPromptsSection(
    artifacts: ProjectArtifactResponse[]
  ): string {
    return `## AI/LLM Prompts Used in Generation

### System Prompts
The project artifacts were generated using carefully crafted prompts to ensure quality and consistency.

### Generation Prompts
${artifacts
  .map(
    (artifact) => `
#### ${artifact.artifactName}
- **Phase**: ${artifact.phase}
- **Validation Status**: ${artifact.validationStatus}
- **Quality Score**: ${artifact.qualityScore || 'N/A'}
`
  )
  .join('')}

### Prompt Engineering Best Practices
- Clear role definitions for each AI agent
- Structured output requirements with validation
- Context-aware prompting based on project phase
- Iterative refinement based on quality scores

### Future AI Enhancements
- Automated code generation for common patterns
- AI-powered testing and QA
- Intelligent error detection and suggestions`;
  }

  private generateAppendices(
    project: ProjectResponse,
    artifacts: ProjectArtifactResponse[]
  ): string {
    return `## Appendices

### A. Project Artifacts Summary
${artifacts
  .map(
    (artifact) => `
**${artifact.artifactName}**
- Phase: ${artifact.phase}
- Status: ${artifact.validationStatus}
- Quality Score: ${artifact.qualityScore || 'N/A'}
- Generated: ${new Date(artifact.createdAt).toLocaleDateString()}
`
  )
  .join('\n')}

### B. Traceability Matrix
- Requirements to implementation mapping
- Test case coverage tracking
- Dependency relationship analysis

### C. Glossary
- **PRD**: Product Requirements Document
- **SBOM**: Software Bill of Materials
- **E2E**: End-to-End testing
- **CI/CD**: Continuous Integration/Continuous Deployment
- **API**: Application Programming Interface

### D. References
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Guide](https://orm.drizzle.team/)
- [Better Auth Documentation](https://better-auth.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Generated by Spec-Driven Orchestrator**
*This document was automatically generated and should be reviewed and customized based on specific project needs.*
`;
  }

  private async generateZIP(
    project: ProjectResponse,
    artifacts: ProjectArtifactResponse[],
    handoffDocument: string,
    options: HandoffOptions
  ): Promise<Buffer> {
    const zip = new JSZip();

    // Add HANDOFF.md
    zip.file('HANDOFF.md', handoffDocument);

    // Add project metadata
    zip.file('project-metadata.json', JSON.stringify(project, null, 2));

    // Add artifacts
    const artifactsFolder = zip.folder('artifacts');
    if (artifactsFolder) {
      artifacts.forEach((artifact) => {
        const content = `# ${artifact.artifactName}\n\nGenerated: ${
          artifact.createdAt
        }\nPhase: ${artifact.phase}\nValidation: ${
          artifact.validationStatus
        }\nQuality Score: ${
          artifact.qualityScore || 'N/A'
        }\n\n[Content would be stored here in a real implementation]`;
        artifactsFolder.file(
          `${artifact.phase}/${artifact.artifactName}`,
          content
        );
      });
    }

    // Add source code template (if requested)
    if (options.includeSourceCode) {
      const sourceFolder = zip.folder('source-code');
      if (sourceFolder) {
        sourceFolder.file(
          'README.md',
          `# ${project.name}\n\nSource code directory structure.`
        );
        sourceFolder.file('components/.gitkeep', '');
        sourceFolder.file('pages/.gitkeep', '');
        sourceFolder.file('api/.gitkeep', '');
      }
    }

    // Add deployment templates (if requested)
    if (options.includeDeploymentGuide) {
      const deployFolder = zip.folder('deployment');
      if (deployFolder) {
        deployFolder.file(
          'vercel.json',
          JSON.stringify(
            {
              version: 2,
              builds: [{ src: 'package.json', use: '@vercel/next' }],
            },
            null,
            2
          )
        );
        deployFolder.file(
          'docker-compose.yml',
          `version: '3.8'\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"`
        );
      }
    }

    return await zip.generateAsync({ type: 'nodebuffer' });
  }

  private calculateMetadata(
    project: ProjectResponse,
    artifacts: ProjectArtifactResponse[]
  ) {
    return {
      totalArtifacts: artifacts.length,
      phasesCompleted: project.phasesCompleted,
      technologyStack: project.stackChoice ? [project.stackChoice] : [],
      estimatedDevelopmentTime: this.estimateDevelopmentTime(
        project,
        artifacts
      ),
    };
  }

  private estimateDevelopmentTime(
    project: ProjectResponse,
    artifacts: ProjectArtifactResponse[]
  ): number {
    // Simple estimation based on project complexity
    const baseTime = 8; // 8 weeks base
    const complexityMultiplier = artifacts.length / 5; // Each 5 artifacts adds complexity
    return Math.round(baseTime * (1 + complexityMultiplier));
  }
}

// Singleton instance
export const handoffGenerator = new HandoffGenerator();
