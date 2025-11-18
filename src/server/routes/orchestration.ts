import { Router, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { projects, projectArtifacts, phaseHistory } from '@/db/schema'
import { AuthenticatedRequest } from '../middleware/auth'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Track orchestration state in memory (in production, use Redis or similar)
const orchestrationStates = new Map<string, {
  isRunning: boolean
  currentPhase: string
  progress: number
  currentAgent?: string
  estimatedTimeRemaining?: number
  startTime?: Date
}>()

// GET /api/projects/:id/orchestration/progress - Get orchestration progress
router.get('/projects/:id/orchestration/progress', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const state = orchestrationStates.get(id)

    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' })
    }
    
    const history = await db.select().from(phaseHistory).where(eq(phaseHistory.projectId, id))
    
    res.json({
      success: true,
      data: {
        projectId: id,
        currentPhase: project.currentPhase,
        progress: calculateProgress(project.currentPhase, state),
        isRunning: state?.isRunning || false,
        currentAgent: state?.currentAgent,
        estimatedTimeRemaining: state?.estimatedTimeRemaining,
        phaseHistory: history
      }
    })
  } catch (error) {
    console.error('Error fetching orchestration progress:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch progress' })
  }
})

// POST /api/projects/:id/orchestration/start - Start orchestration
router.post('/projects/:id/orchestration/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' })
    }
    
    // Set orchestration state
    orchestrationStates.set(id, {
      isRunning: true,
      currentPhase: project.currentPhase,
      progress: calculateProgress(project.currentPhase),
      currentAgent: 'Analyst',
      startTime: new Date()
    })
    
    // Simulate orchestration process
    simulateOrchestration(id)
    
    res.json({
      success: true,
      data: {
        projectId: id,
        currentPhase: project.currentPhase,
        progress: calculateProgress(project.currentPhase),
        isRunning: true,
        currentAgent: 'Analyst'
      }
    })
  } catch (error) {
    console.error('Error starting orchestration:', error)
    res.status(500).json({ success: false, error: 'Failed to start orchestration' })
  }
})

// POST /api/projects/:id/orchestration/pause - Pause orchestration
router.post('/projects/:id/orchestration/pause', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const state = orchestrationStates.get(id)
    
    if (!state || !state.isRunning) {
      return res.status(400).json({ success: false, error: 'Orchestration is not running' })
    }
    
    state.isRunning = false
    
    res.json({
      success: true,
      data: { message: 'Orchestration paused' }
    })
  } catch (error) {
    console.error('Error pausing orchestration:', error)
    res.status(500).json({ success: false, error: 'Failed to pause orchestration' })
  }
})

// POST /api/projects/:id/phases/advance - Advance to next phase
router.post('/projects/:id/phases/advance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' })
    }
    
    const currentPhase = project.currentPhase as string
    const nextPhase = getNextPhase(currentPhase)
    
    if (!nextPhase) {
      return res.status(400).json({ success: false, error: 'Already at final phase' })
    }
    
    // Update project phase
    const currentPhases = (project.phasesCompleted as string[]) || []
    const [updatedProject] = await db
      .update(projects)
      .set({
        currentPhase: nextPhase as typeof project.currentPhase,
        phasesCompleted: [...currentPhases, currentPhase],
        updatedAt: new Date()
      })
      .where(eq(projects.id, id))
      .returning()
    
    // Record phase transition
    await db.insert(phaseHistory).values({
      id: uuidv4(),
      projectId: id,
      fromPhase: currentPhase,
      toPhase: nextPhase,
      artifactsGenerated: [] as unknown as string[],
      validationPassed: true,
      transitionedAt: new Date()
    })
    
    // Update orchestration state
    const state = orchestrationStates.get(id)
    if (state) {
      state.currentPhase = nextPhase
      state.progress = calculateProgress(state.currentPhase, state)
    }
    
    res.json({
      success: true,
      data: updatedProject
    })
  } catch (error) {
    console.error('Error advancing phase:', error)
    res.status(500).json({ success: false, error: 'Failed to advance phase' })
  }
})

// POST /api/projects/:id/github/create - Create GitHub repository
router.post('/projects/:id/github/create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    
    const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' })
    }
    
    // Mock GitHub repository creation
    const githubUrl = `https://github.com/${project.slug}/spec-drive-project`
    
    // Update project with GitHub URL
    await db
      .update(projects)
      .set({
        githubRepoUrl: githubUrl,
        updatedAt: new Date()
      })
      .where(eq(projects.id, id))
    
    res.json({
      success: true,
      data: { url: githubUrl }
    })
  } catch (error) {
    console.error('Error creating GitHub repo:', error)
    res.status(500).json({ success: false, error: 'Failed to create GitHub repository' })
  }
})

// GET /api/projects/:id/phases/history - Get phase history
router.get('/projects/:id/phases/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    const history = await db.select().from(phaseHistory).where(eq(phaseHistory.projectId, id))

    res.json({
      success: true,
      data: history
    })
  } catch (error) {
    console.error('Error fetching phase history:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch phase history' })
  }
})

// Helper functions
function calculateProgress(currentPhase: string, state?: OrchestrationState): number {
  const phases = ['analysis', 'stack_selection', 'spec', 'dependencies', 'solutioning', 'done']
  const currentIndex = phases.indexOf(currentPhase)
  const progress = ((currentIndex + 1) / phases.length) * 100
  
  if (state?.isRunning) {
    // Add some dynamic progress for running orchestration
    return Math.min(progress + 10, 95)
  }
  
  return Math.round(progress)
}

function getNextPhase(currentPhase: string): string | null {
  const phaseOrder = ['analysis', 'stack_selection', 'spec', 'dependencies', 'solutioning', 'done']
  const currentIndex = phaseOrder.indexOf(currentPhase)
  return currentIndex < phaseOrder.length - 1 ? phaseOrder[currentIndex + 1] : null
}

interface OrchestrationState {
  isRunning: boolean
  currentPhase: string
  progress: number
  currentAgent?: string
  estimatedTimeRemaining?: number
  startTime?: Date
}

async function simulateOrchestration(projectId: string) {
  const state = orchestrationStates.get(projectId)
  if (!state) return
  
  try {
    // Simulate artifact generation
    const mockArtifacts = [
      {
        id: uuidv4(),
        projectId,
        phase: state.currentPhase,
        artifactName: `${state.currentPhase}-artifact.md`,
        validationStatus: 'pass' as const,
        validationErrors: [] as string[],
        qualityScore: 85,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    
    for (const artifact of mockArtifacts) {
      await db.insert(projectArtifacts).values(artifact)
    }
    
    // Update state
    state.isRunning = false
    state.progress = calculateProgress(state.currentPhase, state)
    
  } catch (error) {
    console.error('Error in orchestration simulation:', error)
    state.isRunning = false
  }
}

export { router as orchestrationRouter }
