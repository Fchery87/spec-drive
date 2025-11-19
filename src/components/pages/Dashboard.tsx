import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Loader2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react'
import { apiClient } from '@/lib/api'
import type { ProjectResponse } from '@/lib/api'
import { cn } from '@/lib/utils'

function getStatusIcon(status: string) {
  switch (status) {
    case 'analysis':
      return <Clock className="h-4 w-4 text-primary" />
    case 'spec':
      return <FileText className="h-4 w-4 text-primary" />
    case 'dependencies':
      return <AlertCircle className="h-4 w-4 text-accent-foreground" />
    case 'solutioning':
      return <AlertCircle className="h-4 w-4 text-accent-foreground" />
    case 'done':
      return <CheckCircle className="h-4 w-4 text-primary" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'analysis':
      return 'bg-primary/10 text-primary'
    case 'spec':
      return 'bg-secondary text-secondary-foreground'
    case 'dependencies':
      return 'bg-accent/60 text-accent-foreground'
    case 'solutioning':
      return 'bg-accent/60 text-accent-foreground'
    case 'done':
      return 'bg-primary text-primary-foreground'
    default:
      return 'bg-muted text-foreground/80'
  }
}

export function Dashboard() {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getProjects()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading projects...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading projects</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6">
          <Button onClick={loadProjects} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <Card className="border border-border/80 bg-gradient-to-br from-background via-card to-secondary/40 shadow-[var(--shadow-lg)]">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Spec-driven workspace</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Projects</h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Manage AI-guided specs, validations, and handoffs from one place. Kick off a new project or jump back into an active phase.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-[var(--shadow)] hover:from-primary hover:to-primary/90">
                <Link to="/projects/new" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Project
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-lg border-border/80 bg-background/80 shadow-[var(--shadow-sm)]">
                <Link to="/overview" className="flex items-center gap-1">
                  Browse templates
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Active', value: projects.filter(p => p.currentPhase !== 'done').length || '—' },
                { label: 'Completed', value: projects.filter(p => p.currentPhase === 'done').length || '—' },
                { label: 'In validation', value: projects.filter(p => p.currentPhase === 'dependencies' || p.currentPhase === 'solutioning').length || '—' },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-border/70 bg-card/70 px-4 py-3 shadow-[var(--shadow-xs)]">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
          <Card className="w-full max-w-sm border border-border/80 shadow-[var(--shadow-md)]">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Recent activity</p>
              </div>
              {projects.slice(0, 3).map((proj) => (
                <div key={proj.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/60 px-3 py-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(proj.currentPhase)}
                    <div>
                      <p className="text-sm font-medium text-foreground truncate max-w-[160px]">{proj.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{proj.currentPhase.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(proj.currentPhase)}>View</Badge>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent activity yet.</p>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="border border-border/80 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[var(--shadow)]"
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-foreground">{project.name}</CardTitle>
                  <span
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                      getStatusColor(project.currentPhase)
                    )}
                  >
                    {getStatusIcon(project.currentPhase)}
                    {project.currentPhase.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <CardDescription className="text-sm text-muted-foreground">
                  {project.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/80">Created:</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/80">Updated:</span>
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/80">Phase:</span>
                    <span className="capitalize">{project.currentPhase.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild variant="outline" className="flex-1 rounded-lg">
                    <Link to={`/projects/${project.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="border border-border/80 shadow-[var(--shadow-sm)]">
          <CardContent className="py-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/60 text-accent-foreground shadow-[var(--shadow-sm)]">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
            <p className="text-sm text-muted-foreground">
              Get started by creating your first spec-driven project.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button asChild className="rounded-lg">
                <Link to="/projects/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-lg">
                <Link to="/overview">See how it works</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
