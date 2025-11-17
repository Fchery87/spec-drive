import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api'
import type { ProjectResponse } from '@/lib/api'

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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your spec-driven projects and orchestrate development
          </p>
        </div>
        <Button asChild>
          <Link to="/projects/new" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </Link>
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  {getStatusIcon(project.currentPhase)}
                </div>
                <CardDescription className="text-sm">
                  {project.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Phase:</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.currentPhase)}`}>
                      {project.currentPhase.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <div>Created: {new Date(project.createdAt).toLocaleDateString()}</div>
                    <div>Updated: {new Date(project.updatedAt).toLocaleDateString()}</div>
                  </div>

                  <div className="flex space-x-2">
                    <Button asChild variant="outline" className="flex-1">
                      <Link to={`/projects/${project.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No projects</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first spec-driven project.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link to="/projects/new">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}