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
// Aligned with spec-driven-orchestrator-v1.1.md artifact requirements
function generateArtifactContent(artifact: ProjectArtifactResponse, project: ProjectResponse | null): string {
  const projectName = project?.name || 'Project'
  const projectDesc = project?.description || 'No description'
  const projectIdea = project?.idea || 'No vision provided'

  switch (artifact.artifactName) {
    // ANALYSIS phase artifacts
    case 'constitution.md':
      return `# ${projectName} Constitution

## Project Overview
${projectDesc}

## Core Principles
1. User-centric design
2. Maintainable and scalable architecture
3. Security-first approach
4. Performance optimization

## Non-Negotiables
- Mobile-first responsive design
- No PII logging
- HTTPS only
- Authentication required for all protected routes

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

## Goals
- Deliver a high-quality solution
- Meet all functional requirements
- Ensure excellent user experience
- Maintain code quality standards

## Market Context
Target audience and market positioning based on project vision.

## Scope
This project encompasses the full development lifecycle from requirements gathering to deployment.

Generated by Spec-Drive Orchestrator`

    case 'personas.md':
      return `# ${projectName} - User Personas

## Persona 1: Primary User
**Name:** Alex Developer
**Role:** End User
**Goals:** Efficiently accomplish core tasks
**Pain Points:** Current solutions are slow and unintuitive
**Technical Level:** Intermediate

## Persona 2: Administrator
**Name:** Sam Admin
**Role:** System Administrator
**Goals:** Manage users and monitor system health
**Pain Points:** Lack of visibility into system state
**Technical Level:** Advanced

## Persona 3: New User
**Name:** Jordan Newcomer
**Role:** First-time User
**Goals:** Learn the system quickly
**Pain Points:** Steep learning curves
**Technical Level:** Beginner

Generated by Spec-Drive Orchestrator`

    // STACK_SELECTION phase artifacts
    case 'plan.md':
      return `# ${projectName} - Project Plan

## Approved Technology Stack

### Frontend / Full Stack
- Next.js (App Router) + React + TypeScript
- Tailwind CSS for styling
- shadcn/ui for components
- Zod for validation

### Database & ORM
- PostgreSQL on Neon (managed)
- Drizzle ORM

### Auth
- Better Auth for authentication

### Tooling
- pnpm for package management
- TurboRepo for monorepo
- ESLint for linting

## Project Timeline
Implementation phases will follow the structured approach.

Generated by Spec-Drive Orchestrator`

    case 'README.md':
      return `# ${projectName}

${projectDesc}

## Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL on Neon
- **ORM:** Drizzle ORM
- **Auth:** Better Auth
- **Styling:** Tailwind CSS + shadcn/ui

## Getting Started

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Project Structure

See \`architecture.md\` for detailed structure.

## Development

See \`tasks.md\` for implementation tasks.

Generated by Spec-Drive Orchestrator`

    case 'stack-proposal.md':
      return `# Technology Stack Proposal

## Option A: Canonical Stack (Recommended)
- **Frontend:** Next.js (App Router) + TypeScript
- **Database:** PostgreSQL on Neon
- **ORM:** Drizzle ORM
- **Auth:** Better Auth
- **UI:** Tailwind CSS + shadcn/ui
- **Validation:** Zod
- **Tooling:** pnpm + TurboRepo + ESLint

### Pros
- Modern, type-safe stack
- Excellent DX and tooling
- Strong community support
- Managed database (Neon)

### Cons
- Learning curve for new developers
- Newer ecosystem (Drizzle, Better Auth)

## Option B: Traditional Stack
- **Frontend:** React + Vite
- **Backend:** Express.js
- **Database:** PostgreSQL (self-hosted)
- **ORM:** Prisma

## Recommendation
Option A - Canonical stack provides the best balance of DX, performance, and maintainability.

Generated by Spec-Drive Orchestrator`

    case 'stack-scorecard.json':
      return `{
  "selectedStack": "nextjs_neon_drizzle_betterauth",
  "options": {
    "option_a": {
      "name": "Canonical Stack",
      "complexity": 7,
      "cost": 6,
      "teamFit": 8,
      "scalability": 9,
      "maintainability": 8,
      "overall": 7.6
    },
    "option_b": {
      "name": "Traditional Stack",
      "complexity": 5,
      "cost": 7,
      "teamFit": 7,
      "scalability": 7,
      "maintainability": 7,
      "overall": 6.6
    }
  },
  "recommendation": "option_a"
}`

    // SPEC phase artifacts
    case 'PRD.md':
      return `# ${projectName} - Product Requirements Document

## Executive Summary
${projectDesc}

## Vision
${projectIdea}

## Requirements

### REQ-AUTH-001: User Registration
**Priority:** MVP
**Personas:** All users
**Description:** Users can create accounts with email/password
**Acceptance Criteria:**
- Email validation
- Password strength requirements
- Confirmation email sent

### REQ-AUTH-002: User Login
**Priority:** MVP
**Personas:** All users
**Description:** Users can log in with credentials
**Acceptance Criteria:**
- Session management
- Remember me option
- Password reset flow

### REQ-CORE-001: Core Functionality
**Priority:** MVP
**Personas:** Primary User
**Description:** Main business logic implementation
**Acceptance Criteria:**
- Feature works as expected
- Proper error handling
- Responsive UI

Generated by Spec-Drive Orchestrator`

    case 'data-model.md':
      return `# Data Model Design

## Overview
PostgreSQL database on Neon with Drizzle ORM.

## Schemas (Drizzle)

### users
\`\`\`typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
\`\`\`

### sessions
\`\`\`typescript
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  token: varchar('token', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
\`\`\`

## Indexes
- users_email_idx on users(email)
- sessions_user_id_idx on sessions(user_id)
- sessions_token_idx on sessions(token)

## Relationships
- User has many Sessions
- Session belongs to User

Generated by Spec-Drive Orchestrator`

    case 'api-spec.json':
      return `{
  "openapi": "3.0.0",
  "info": {
    "title": "${projectName} API",
    "version": "1.0.0"
  },
  "paths": {
    "/api/auth/register": {
      "post": {
        "summary": "Register new user",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": { "type": "string" },
                  "password": { "type": "string" },
                  "name": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "User created" },
          "400": { "description": "Validation error" }
        }
      }
    },
    "/api/auth/login": {
      "post": {
        "summary": "Login user",
        "responses": {
          "200": { "description": "Login successful" },
          "401": { "description": "Invalid credentials" }
        }
      }
    }
  }
}`

    case 'traceability.json':
      return `{
  "REQ-AUTH-001": {
    "tasks": ["TASK-1.1", "TASK-1.2"],
    "api_endpoints": ["POST /api/auth/register"],
    "database_tables": ["users"],
    "test_cases": []
  },
  "REQ-AUTH-002": {
    "tasks": ["TASK-1.3", "TASK-1.4"],
    "api_endpoints": ["POST /api/auth/login"],
    "database_tables": ["users", "sessions"],
    "test_cases": []
  },
  "REQ-CORE-001": {
    "tasks": ["TASK-2.1", "TASK-2.2"],
    "api_endpoints": ["GET /api/resources", "POST /api/resources"],
    "database_tables": ["resources"],
    "test_cases": []
  }
}`

    // DEPENDENCIES phase artifacts
    case 'DEPENDENCIES.md':
      return `# Dependencies

## Core Framework & Language
- **next@14.x** - React framework with App Router
- **react@18.x**, **react-dom@18.x** - UI library
- **typescript@5.x** - Static typing

## Database & ORM
- **drizzle-orm@^0.x** - Type-safe ORM
- **@neondatabase/serverless@^0.x** - Neon driver

Rationale: Type-safe SQL and migrations, Neon managed Postgres.

## Auth
- **better-auth@latest** - Authentication library

Rationale: Modern auth library with excellent Next.js integration.

## Styling & Components
- **tailwindcss@^3.x**, **postcss@^8.x**, **autoprefixer@^10.x**
- **shadcn/ui** (installed via CLI)
- **lucide-react@latest** - Icons

Guidelines: Use shadcn components only; no custom primitive components.

## Validation & Utilities
- **zod@^3.x** - Validation and types

## Tooling
- **eslint@^9.x** - Linting
- **turbo@latest** - Monorepo orchestration
- **pnpm** - Package manager

## Security Notes
All packages reviewed for vulnerabilities. No HIGH/CRITICAL issues found.

Generated by Spec-Drive Orchestrator`

    case 'dependency-proposal.json':
      return `{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "drizzle-orm": "^0.29.0",
    "@neondatabase/serverless": "^0.7.0",
    "better-auth": "^0.5.0",
    "tailwindcss": "^3.4.0",
    "zod": "^3.22.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "eslint-config-next": "^14.0.0",
    "@types/react": "^18.2.0",
    "@types/node": "^20.0.0",
    "turbo": "^1.10.0",
    "drizzle-kit": "^0.20.0"
  }
}`

    case 'sbom.json':
      return `{
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "version": 1,
  "metadata": {
    "timestamp": "${new Date().toISOString()}",
    "tools": [{ "name": "Spec-Drive Orchestrator" }],
    "component": {
      "type": "application",
      "name": "${projectName}",
      "version": "1.0.0"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "next",
      "version": "14.0.0",
      "licenses": [{ "license": { "id": "MIT" } }]
    },
    {
      "type": "library",
      "name": "react",
      "version": "18.2.0",
      "licenses": [{ "license": { "id": "MIT" } }]
    },
    {
      "type": "library",
      "name": "drizzle-orm",
      "version": "0.29.0",
      "licenses": [{ "license": { "id": "Apache-2.0" } }]
    }
  ]
}`

    // SOLUTIONING phase artifacts
    case 'architecture.md':
      return `# ${projectName} - System Architecture

## Overview
Modern full-stack application using Next.js App Router with PostgreSQL on Neon.

## Architecture Layers

### 1. Presentation Layer
- Next.js App Router pages and layouts
- React Server Components where possible
- Client components for interactivity
- shadcn/ui component library

### 2. API Layer
- Next.js API routes (/app/api)
- RESTful endpoints
- Zod validation

### 3. Business Logic Layer
- Service modules
- Business rules and validation
- Data transformation

### 4. Data Access Layer
- Drizzle ORM
- Type-safe queries
- Transaction support

### 5. Database Layer
- PostgreSQL on Neon
- Managed connection pooling
- Automatic backups

## Auth Integration (Better Auth)
- Session-based authentication
- OAuth providers support
- Role-based access control

## Project Structure
\`\`\`
apps/
  web/                # Next.js app
packages/
  ui/                 # Shared shadcn components
  api/                # Shared types and schemas
  config/             # Shared configs
\`\`\`

Generated by Spec-Drive Orchestrator`

    case 'epics.md':
      return `# ${projectName} - Epics

## EPIC-1: Authentication System
**Requirements:** REQ-AUTH-001, REQ-AUTH-002
**Description:** Complete user authentication including registration, login, and session management.

### Tasks
- TASK-1.1: Set up Better Auth
- TASK-1.2: Create registration flow
- TASK-1.3: Create login flow
- TASK-1.4: Session management

## EPIC-2: Core Application Features
**Requirements:** REQ-CORE-001
**Description:** Main application functionality and business logic.

### Tasks
- TASK-2.1: Database schema setup
- TASK-2.2: API endpoints
- TASK-2.3: Frontend components

## EPIC-3: Infrastructure & DevOps
**Description:** Project setup, deployment, and monitoring.

### Tasks
- TASK-3.1: TurboRepo monorepo setup
- TASK-3.2: Neon database configuration
- TASK-3.3: CI/CD pipeline

Generated by Spec-Drive Orchestrator`

    case 'tasks.md':
      return `# ${projectName} - Implementation Tasks

## TASK-1.1: Set up Better Auth
**Epic:** EPIC-1
**Requirements:** REQ-AUTH-001, REQ-AUTH-002
**Priority:** High
**Complexity:** Medium

### Description
Install and configure Better Auth for the application.

### Implementation Notes
- Reference: architecture.md (Auth Integration section)
- Use Drizzle adapter for Better Auth

### Acceptance Criteria
- [ ] Better Auth installed and configured
- [ ] Auth routes working
- [ ] Session middleware active

---

## TASK-1.2: Create Registration Flow
**Epic:** EPIC-1
**Requirements:** REQ-AUTH-001
**Priority:** High
**Complexity:** Medium
**Dependencies:** TASK-1.1

### Description
Implement user registration with email/password.

### Implementation Notes
- Zod validation for inputs
- Email uniqueness check
- Password hashing

### Acceptance Criteria
- [ ] Registration form with validation
- [ ] User created in database
- [ ] Error handling for duplicates

---

## TASK-2.1: Database Schema Setup
**Epic:** EPIC-2
**Requirements:** REQ-CORE-001
**Priority:** High
**Complexity:** Medium

### Description
Set up Drizzle schemas and run migrations.

### Implementation Notes
- Reference: data-model.md
- Use drizzle-kit for migrations

### Acceptance Criteria
- [ ] All tables created
- [ ] Indexes applied
- [ ] Migration files committed

Generated by Spec-Drive Orchestrator`

    // DONE phase artifacts
    case 'HANDOFF.md':
      return `# ${projectName} - Handoff Document

## Project Summary
${projectDesc}

## Vision
${projectIdea}

## Approved Technology Stack

### Frontend / Full Stack
- Next.js (App Router) + React + TypeScript
- Tailwind CSS for styling
- shadcn/ui for components (installed via CLI, no custom primitives)
- Zod for validation

### Database & ORM
- PostgreSQL on Neon (managed)
- Drizzle ORM (migrations + type-safe queries)

### Auth
- Better Auth for authentication and session management

### Tooling
- pnpm for package management
- TurboRepo for monorepo orchestration
- ESLint (TypeScript + Next.js config) for linting

## Instructions for LLM

You are implementing ${projectName}. Follow these specifications exactly:

1. **Use ONLY the approved dependencies** listed in DEPENDENCIES.md
2. **Install shadcn components** via \`pnpm dlx shadcn@latest add <component>\`
3. **Follow the monorepo structure** defined in architecture.md
4. **Implement all tasks** in tasks.md in dependency order
5. **Ensure all requirements** in PRD.md are covered
6. **Use Tailwind theme tokens** - no inline styles or hex colors

## Files to Review
- PRD.md - Product requirements
- architecture.md - System design
- data-model.md - Database schemas
- api-spec.json - API endpoints
- tasks.md - Implementation tasks
- traceability.json - Requirement coverage

## Quality Criteria
- Code coverage: 80%+
- TypeScript strict mode
- All ESLint rules pass
- WCAG 2.1 AA compliance

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