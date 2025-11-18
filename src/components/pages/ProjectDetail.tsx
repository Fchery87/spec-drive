import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Play, Pause, RotateCcw, Download, FileText, CheckCircle, Clock, AlertCircle, Loader2, X } from 'lucide-react'
import { apiClient } from '@/lib/api'
import type { ProjectResponse, ProjectArtifactResponse, OrchestrationProgress } from '@/lib/api'

function getStatusIcon(status: string) {
  switch (status) {
    case 'analysis':
      return <Clock className="h-4 w-4 text-blue-500" />
    case 'spec':
      return <FileText className="h-4 w-4 text-yellow-500" />
    case 'dependencies':
      return <AlertCircle className="h-4 w-4 text-orange-500" />
    case 'solutioning':
      return <AlertCircle className="h-4 w-4 text-purple-500" />
    case 'done':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'analysis':
      return 'bg-blue-100 text-blue-800'
    case 'spec':
      return 'bg-yellow-100 text-yellow-800'
    case 'dependencies':
      return 'bg-orange-100 text-orange-800'
    case 'solutioning':
      return 'bg-purple-100 text-purple-800'
    case 'done':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getArtifactStatusIcon(status: string) {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-gray-400" />
    case 'generating':
      return <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
    case 'complete':
      return <CheckCircle className="h-3 w-3 text-green-500" />
    case 'error':
      return <AlertCircle className="h-3 w-3 text-red-500" />
    case 'pass':
      return <CheckCircle className="h-3 w-3 text-green-500" />
    case 'fail':
      return <AlertCircle className="h-3 w-3 text-red-500" />
    case 'warn':
      return <AlertCircle className="h-3 w-3 text-yellow-500" />
    default:
      return <Clock className="h-3 w-3 text-gray-400" />
  }
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectResponse | null>(null)
  const [artifacts, setArtifacts] = useState<ProjectArtifactResponse[]>([])
  const [orchestrationProgress, setOrchestrationProgress] = useState<OrchestrationProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOrchestrating, setIsOrchestrating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedArtifact, setSelectedArtifact] = useState<ProjectArtifactResponse | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (id) {
      loadProject()
      loadOrchestrationProgress()
    }
  }, [id])

  // Separate effect for polling - only poll when orchestrating or project not done
  useEffect(() => {
    if (!id || !project) return

    // Don't poll if project is done
    if (project.currentPhase === 'done') return

    // Poll for orchestration progress updates
    const interval = setInterval(loadOrchestrationProgress, 2000)
    return () => clearInterval(interval)
  }, [id, project?.currentPhase, isOrchestrating])

  const loadProject = async () => {
    if (!id) return
    
    try {
      setError(null)
      const projectData = await apiClient.getProject(id)
      setProject(projectData)
      
      const artifactsData = await apiClient.getProjectArtifacts(id)
      setArtifacts(artifactsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }

  const loadOrchestrationProgress = async () => {
    if (!id) return

    try {
      const progress = await apiClient.getOrchestrationProgress(id)
      setOrchestrationProgress(progress)
      setIsOrchestrating(progress.isRunning)

      // If orchestration completed, reload project data
      if (!progress.isRunning && project && progress.currentPhase !== project.currentPhase) {
        await loadProject()
      }
    } catch (err: any) {
      // Stop polling on auth errors (401) - user needs to re-login
      if (err?.status === 401) {
        console.error('Authentication expired, stopping polling')
        setIsOrchestrating(false)
      } else {
        console.error('Failed to load orchestration progress:', err)
      }
    }
  }

  const handleStartOrchestration = async () => {
    if (!id) return
    
    try {
      setIsOrchestrating(true)
      await apiClient.startOrchestration(id)
      await loadOrchestrationProgress()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start orchestration')
      setIsOrchestrating(false)
    }
  }

  const handlePauseOrchestration = async () => {
    if (!id) return
    
    try {
      await apiClient.pauseOrchestration(id)
      setIsOrchestrating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause orchestration')
    }
  }

  const handleAdvancePhase = async () => {
    if (!id) return

    try {
      await apiClient.advancePhase(id)
      await loadProject()
      await loadOrchestrationProgress()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance phase')
    }
  }

  const handleApproveStack = async () => {
    if (!id) return

    try {
      await apiClient.approveStack(id)
      await loadProject()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve stack')
    }
  }

  const handleApproveDependencies = async () => {
    if (!id) return

    try {
      await apiClient.approveDependencies(id)
      await loadProject()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve dependencies')
    }
  }

  const handleDownload = async () => {
    if (!id || !project) return

    try {
      setIsDownloading(true)
      const blob = await apiClient.downloadProject(id)

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${project.slug}-project.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download project')
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePreviewArtifact = (artifact: ProjectArtifactResponse) => {
    setSelectedArtifact(artifact)
    setPreviewOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading project...</span>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading project</h3>
        <p className="mt-1 text-sm text-gray-500">{error || 'Project not found'}</p>
        <div className="mt-6">
          <Button onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Show all artifacts, grouped by phase
  const sortedArtifacts = [...artifacts].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">
              {project.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isDownloading ? 'Downloading...' : 'Download ZIP'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Project Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(project.currentPhase)}
              <span>Current Phase</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">
                  {project.currentPhase.replace('_', ' ')}
                </span>
                <Badge className={getStatusColor(project.currentPhase)}>
                  {project.currentPhase.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              
              {orchestrationProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{orchestrationProgress.progress}%</span>
                  </div>
                  <Progress value={orchestrationProgress.progress} className="w-full" />
                  {orchestrationProgress.currentAgent && isOrchestrating && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Agent: {orchestrationProgress.currentAgent}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                <div>Created: {new Date(project.createdAt).toLocaleDateString()}</div>
                <div>Updated: {new Date(project.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orchestration Controls</CardTitle>
            <CardDescription>
              Control the AI-powered project orchestration process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {project.currentPhase === 'done' ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Project orchestration complete!</p>
                  <Button className="mt-2" onClick={handleDownload} disabled={isDownloading}>
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {isDownloading ? 'Downloading...' : 'Download Final Spec'}
                  </Button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  {!isOrchestrating ? (
                    <Button 
                      onClick={handleStartOrchestration}
                      className="flex-1"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {orchestrationProgress?.currentAgent ? 'Continue Orchestration' : 'Start Analysis'}
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={handlePauseOrchestration}
                      className="flex-1"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                  )}
                  <Button variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restart
                  </Button>
                </div>
              )}
              
              {/* Phase gates */}
              {!project.stackApproved && project.currentPhase === 'stack_selection' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Stack approval required to continue to next phase.
                  </p>
                  <Button size="sm" className="mt-2" onClick={handleApproveStack}>
                    Approve Stack
                  </Button>
                </div>
              )}

              {!project.dependenciesApproved && project.currentPhase === 'dependencies' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Dependencies approval required to continue to next phase.
                  </p>
                  <Button size="sm" className="mt-2" onClick={handleApproveDependencies}>
                    Approve Dependencies
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Vision</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{project.idea}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Artifacts</CardTitle>
            <CardDescription>
              Files and documents created during orchestration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sortedArtifacts.length > 0 ? (
                sortedArtifacts.map((artifact) => (
                  <div key={artifact.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getArtifactStatusIcon(artifact.validationStatus)}
                      <div>
                        <div className="font-medium text-sm">{artifact.artifactName}</div>
                        <div className="text-xs text-muted-foreground">
                          {artifact.phase.replace('_', ' ')} • Quality: {artifact.qualityScore || 'N/A'}
                        </div>
                      </div>
                    </div>
                    {artifact.validationStatus === 'pass' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreviewArtifact(artifact)}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No artifacts generated yet</p>
                  {isOrchestrating && (
                    <p className="text-xs">Orchestration in progress...</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Artifact Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{selectedArtifact?.artifactName}</span>
            </DialogTitle>
            <DialogDescription>
              Phase: {selectedArtifact?.phase.replace('_', ' ')} • Quality Score: {selectedArtifact?.qualityScore || 'N/A'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {selectedArtifact ? generateArtifactContent(selectedArtifact, project) : ''}
              </pre>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
              <span>Created: {selectedArtifact ? new Date(selectedArtifact.createdAt).toLocaleString() : ''}</span>
              <Badge variant={selectedArtifact?.validationStatus === 'pass' ? 'default' : 'secondary'}>
                {selectedArtifact?.validationStatus.toUpperCase()}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper function to generate artifact content preview
function generateArtifactContent(artifact: ProjectArtifactResponse, project: ProjectResponse | null): string {
  const projectName = project?.name || 'Project'
  const projectDesc = project?.description || 'No description'
  const projectIdea = project?.idea || 'No vision provided'

  switch (artifact.artifactName) {
    case 'constitution.md':
      return `# ${projectName} Constitution

## Project Overview
${projectDesc}

## Core Principles
1. User-centric design
2. Maintainable and scalable architecture
3. Security-first approach
4. Performance optimization

## Success Criteria
- All core features implemented
- Test coverage > 80%
- Performance benchmarks met
- Documentation complete

Generated by Spec-Drive Orchestrator`

    case 'project-brief.md':
      return `# ${projectName} - Project Brief

## Vision
${projectIdea}

## Objectives
- Deliver a high-quality solution
- Meet all functional requirements
- Ensure excellent user experience
- Maintain code quality standards

## Scope
This project encompasses the full development lifecycle from requirements gathering to deployment.

## Timeline
Estimated completion based on complexity analysis.

Generated by Spec-Drive Orchestrator`

    case 'requirements.md':
      return `# ${projectName} Requirements

## Functional Requirements
1. User authentication and authorization
2. Core business logic implementation
3. Data persistence and retrieval
4. API endpoints for all operations
5. User interface components

## Non-Functional Requirements
- Response time < 200ms for API calls
- 99.9% uptime target
- WCAG 2.1 AA compliance
- Mobile-responsive design

## Constraints
- Technology stack as specified
- Budget and timeline constraints
- Third-party service dependencies

Generated by Spec-Drive Orchestrator`

    case 'stack-recommendation.md':
      return `# Technology Stack Recommendation

## Frontend
- React 18+ with TypeScript
- Tailwind CSS for styling
- React Query for data fetching
- React Router for navigation

## Backend
- Node.js with Express/Fastify
- TypeScript for type safety
- PostgreSQL database
- Redis for caching

## Infrastructure
- Docker containerization
- CI/CD with GitHub Actions
- Cloud deployment (AWS/GCP/Azure)

## Rationale
Selected for scalability, developer experience, and ecosystem support.

Generated by Spec-Drive Orchestrator`

    case 'technology-rationale.md':
      return `# Technology Selection Rationale

## Why This Stack?

### Performance
- Server-side rendering capabilities
- Efficient data fetching patterns
- Optimized bundle sizes

### Developer Experience
- Strong TypeScript support
- Extensive tooling ecosystem
- Active community support

### Scalability
- Horizontal scaling capabilities
- Microservices-ready architecture
- Cloud-native design patterns

### Security
- Built-in security features
- Regular security updates
- Enterprise-grade authentication

Generated by Spec-Drive Orchestrator`

    case 'technical-spec.md':
      return `# ${projectName} Technical Specification

## Architecture Overview
Microservices-based architecture with event-driven communication.

## Component Design
- Authentication Service
- Core Business Service
- Notification Service
- API Gateway

## Data Flow
1. Client request → API Gateway
2. Gateway → Appropriate service
3. Service → Database/Cache
4. Response → Client

## Security Architecture
- JWT-based authentication
- Role-based access control
- Encrypted data at rest and in transit

Generated by Spec-Drive Orchestrator`

    case 'api-design.md':
      return `# API Design Document

## REST API Endpoints

### Authentication
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/refresh
- POST /api/auth/logout

### Resources
- GET /api/resources
- GET /api/resources/:id
- POST /api/resources
- PATCH /api/resources/:id
- DELETE /api/resources/:id

## Response Format
\`\`\`json
{
  "success": boolean,
  "data": object | array,
  "error": string | null,
  "meta": { pagination, etc. }
}
\`\`\`

Generated by Spec-Drive Orchestrator`

    case 'data-model.md':
      return `# Data Model Design

## Entity Relationship

### Users
- id (UUID, PK)
- email (VARCHAR, UNIQUE)
- passwordHash (VARCHAR)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)

### Resources
- id (UUID, PK)
- userId (UUID, FK)
- name (VARCHAR)
- data (JSONB)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)

## Indexes
- users_email_idx
- resources_user_id_idx

## Relationships
- User has many Resources
- Resource belongs to User

Generated by Spec-Drive Orchestrator`

    case 'dependencies.json':
      return `{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "express": "^4.18.0",
    "drizzle-orm": "^0.29.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}`

    case 'package-recommendations.md':
      return `# Package Recommendations

## Core Dependencies
- **React** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Drizzle ORM** - Database ORM

## Utility Libraries
- **Zod** - Schema validation
- **date-fns** - Date manipulation
- **lodash-es** - Utility functions

## Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **Husky** - Git hooks

## Security Notes
All packages reviewed for vulnerabilities.
Regular updates recommended.

Generated by Spec-Drive Orchestrator`

    case 'implementation-plan.md':
      return `# Implementation Plan

## Phase 1: Foundation (Week 1-2)
- Project setup and configuration
- Database schema implementation
- Authentication system
- Basic API structure

## Phase 2: Core Features (Week 3-4)
- Business logic implementation
- API endpoints
- Frontend components
- Data validation

## Phase 3: Integration (Week 5)
- Frontend-backend integration
- Third-party services
- Error handling
- Logging and monitoring

## Phase 4: Quality (Week 6)
- Unit and integration tests
- Performance optimization
- Security audit
- Documentation

## Phase 5: Deployment (Week 7)
- CI/CD pipeline
- Production deployment
- Monitoring setup
- Launch preparation

Generated by Spec-Drive Orchestrator`

    case 'project-structure.md':
      return `# Project Structure

\`\`\`
${projectName.toLowerCase().replace(/\s+/g, '-')}/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   └── pages/
│   ├── lib/
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── hooks/
│   ├── server/
│   │   ├── routes/
│   │   └── middleware/
│   ├── db/
│   │   └── schema.ts
│   └── types/
├── tests/
├── public/
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

## Directory Conventions
- /components - React components
- /lib - Utility functions
- /server - Backend code
- /db - Database schemas

Generated by Spec-Drive Orchestrator`

    case 'final-spec.md':
      return `# ${projectName} - Final Specification

## Executive Summary
${projectDesc}

## Vision
${projectIdea}

## Technical Architecture
Complete microservices architecture with React frontend and Node.js backend.

## Key Deliverables
1. Fully functional web application
2. RESTful API
3. Database with migrations
4. Comprehensive test suite
5. CI/CD pipeline
6. Documentation

## Quality Metrics
- Code coverage: 80%+
- Performance: <200ms response time
- Accessibility: WCAG 2.1 AA
- Security: OWASP Top 10 compliant

## Next Steps
1. Review this specification
2. Approve technology stack
3. Begin implementation
4. Regular progress reviews

---
Generated by Spec-Drive Orchestrator
Quality Score: ${artifact.qualityScore}/100`

    default:
      return `# ${artifact.artifactName}

Phase: ${artifact.phase}
Status: ${artifact.validationStatus}
Quality Score: ${artifact.qualityScore}

Content for this artifact will be generated during the actual orchestration process.

Generated by Spec-Drive Orchestrator`
  }
}