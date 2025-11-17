import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Play, Pause, RotateCcw, Download, FileText, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
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

  useEffect(() => {
    if (id) {
      loadProject()
      loadOrchestrationProgress()
      
      // Poll for orchestration progress updates
      const interval = setInterval(loadOrchestrationProgress, 2000)
      return () => clearInterval(interval)
    }
  }, [id])

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
    } catch (err) {
      console.error('Failed to load orchestration progress:', err)
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

  const currentPhaseArtifacts = artifacts.filter(a => a.phase === project.currentPhase)

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
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download ZIP
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            View Specs
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
                  <Button className="mt-2">
                    <Download className="h-4 w-4 mr-2" />
                    Download Final Spec
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
                  <Button size="sm" className="mt-2">
                    Approve Stack
                  </Button>
                </div>
              )}
              
              {!project.dependenciesApproved && project.currentPhase === 'dependencies' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Dependencies approval required to continue to next phase.
                  </p>
                  <Button size="sm" className="mt-2">
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
            <div className="space-y-3">
              {currentPhaseArtifacts.length > 0 ? (
                currentPhaseArtifacts.map((artifact) => (
                  <div key={artifact.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getArtifactStatusIcon(artifact.validationStatus)}
                      <div>
                        <div className="font-medium text-sm">{artifact.artifactName}</div>
                        <div className="text-xs text-muted-foreground">
                          Quality: {artifact.qualityScore || 'N/A'}
                        </div>
                      </div>
                    </div>
                    {artifact.validationStatus === 'pass' && (
                      <Button variant="ghost" size="sm">
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
    </div>
  )
}