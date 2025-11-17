import { z } from 'zod'
import { db } from '@/db'
import { projects, projectArtifacts, phaseHistory } from '@/db/schema'
import { validationEngine, type ValidationReport } from '@/lib/validation'
import { eq, and, inArray } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

// Phase and validation schemas
export const ProjectPhaseSchema = z.enum([
  'analysis', 'stack_selection', 'spec', 'dependencies', 'solutioning', 'done'
])

export const ValidationStatusSchema = z.enum(['pending', 'pass', 'warn', 'fail'])

export const StackChoiceSchema = z.enum([
  'nextjs_neon_drizzle_betterauth', 'custom'
])

// Agent interface
export interface AIAgent {
  name: string
  phase: z.infer<typeof ProjectPhaseSchema>
  execute(input: AgentInput): Promise<AgentOutput>
}

export interface AgentInput {
  projectId: string
  phaseData: Record<string, any>
  artifacts: {
    name: string
    content: string
    phase: string
  }[]
}

export interface AgentOutput {
  artifacts: {
    name: string
    content: string
    frontmatter?: Record<string, any>
    phase: string
    validationErrors?: string[]
  }[]
  nextPhase?: z.infer<typeof ProjectPhaseSchema>
  validationPassed: boolean
  tokensUsed?: number
  qualityScore?: number
}

// Phase configuration
export const PHASE_CONFIG = {
  analysis: {
    name: 'Analysis',
    description: 'Understanding the project vision, users, and constraints',
    requiredArtifacts: ['constitution.md', 'project-brief.md', 'personas.md'],
    gate: null,
    agents: ['analyst']
  },
  stack_selection: {
    name: 'Stack Selection',
    description: 'Choose and approve the technology stack',
    requiredArtifacts: ['plan.md', 'README.md', 'stack-proposal.md', 'stack-scorecard.json'],
    gate: 'stack_approved',
    agents: ['architect']
  },
  spec: {
    name: 'Specification',
    description: 'Create detailed requirements, data model, and API specifications',
    requiredArtifacts: ['PRD.md', 'data-model.md', 'api-spec.json', 'traceability.json'],
    gate: null,
    agents: ['pm', 'architect']
  },
  dependencies: {
    name: 'Dependencies',
    description: 'Define dependencies, security posture, and generate SBOM',
    requiredArtifacts: ['DEPENDENCIES.md', 'dependency-proposal.json', 'sbom.json'],
    gate: 'dependencies_approved',
    agents: ['devops']
  },
  solutioning: {
    name: 'Solutioning',
    description: 'Break down into tasks and create implementation roadmap',
    requiredArtifacts: ['architecture.md', 'epics.md', 'tasks.md', 'traceability.json'],
    gate: null,
    agents: ['architect', 'scrum']
  },
  done: {
    name: 'Complete',
    description: 'Generate final handoff documentation and project artifacts',
    requiredArtifacts: ['HANDOFF.md'],
    gate: null,
    agents: ['orchestrator']
  }
}

// Orchestrator class
export class Orchestrator {
  private agents = new Map<string, AIAgent>()

  registerAgent(agent: AIAgent) {
    this.agents.set(agent.phase, agent)
  }

  async getProject(projectId: string) {
    const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
    return result[0] || null
  }

  async getProjectArtifacts(projectId: string, phase?: string) {
    if (phase) {
      return await db.select()
        .from(projectArtifacts)
        .where(and(
          eq(projectArtifacts.projectId, projectId),
          eq(projectArtifacts.phase, phase)
        ))
    }
    
    return await db.select()
      .from(projectArtifacts)
      .where(eq(projectArtifacts.projectId, projectId))
  }

  async advancePhase(projectId: string): Promise<boolean> {
    const project = await this.getProject(projectId)
    if (!project) throw new Error('Project not found')

    const currentPhase = project.currentPhase as z.infer<typeof ProjectPhaseSchema>
    const nextPhase = this.getNextPhase(currentPhase)

    if (!nextPhase) return false

    // Check if gate is satisfied
    const gate = PHASE_CONFIG[currentPhase].gate
    if (gate && !project[gate as keyof typeof project]) {
      throw new Error(`Gate not satisfied: ${gate}`)
    }

    // Execute agents for the current phase
    const phaseData = await this.collectPhaseData(projectId, currentPhase)
    const artifacts = await this.getProjectArtifacts(projectId)

    const agentOutputs = await this.executePhaseAgents(currentPhase, {
      projectId,
      phaseData,
      artifacts: artifacts.map(a => ({
        name: a.artifactName,
        content: a.filePath || '',
        phase: a.phase
      }))
    })

    // Validate all artifacts
    const validationPassed = await this.validatePhaseArtifacts(currentPhase, agentOutputs)

    if (!validationPassed) {
      throw new Error('Phase validation failed')
    }

    // Save artifacts to database
    await this.savePhaseArtifacts(projectId, currentPhase, agentOutputs)

    // Update project phase
    const currentPhases = (project.phasesCompleted as string[]) || []
    await db.update(projects)
      .set({
        currentPhase: nextPhase,
        phasesCompleted: [...currentPhases, currentPhase] as any,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId))

    // Record phase transition
    await db.insert(phaseHistory).values({
      id: uuidv4(),
      projectId,
      fromPhase: currentPhase,
      toPhase: nextPhase,
      artifactsGenerated: agentOutputs.flatMap(output =>
        output.artifacts.map(artifact => artifact.name)
      ) as unknown[],
      validationPassed,
      transitionedAt: new Date()
    })

    // Run cross-artifact validation if we have multiple artifacts
    await this.runCrossArtifactValidation(projectId, currentPhase)

    return true
  }

  private getNextPhase(currentPhase: z.infer<typeof ProjectPhaseSchema>): z.infer<typeof ProjectPhaseSchema> | null {
    const phases = Object.keys(PHASE_CONFIG) as z.infer<typeof ProjectPhaseSchema>[]
    const currentIndex = phases.indexOf(currentPhase)
    return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null
  }

  private async collectPhaseData(projectId: string, phase: z.infer<typeof ProjectPhaseSchema>) {
    // Collect data needed for the specific phase
    const project = await this.getProject(projectId)
    return {
      project,
      phase,
      config: PHASE_CONFIG[phase]
    }
  }

  private async executePhaseAgents(
    phase: z.infer<typeof ProjectPhaseSchema>, 
    input: AgentInput
  ): Promise<AgentOutput[]> {
    const agentNames = PHASE_CONFIG[phase].agents
    const outputs: AgentOutput[] = []

    for (const agentName of agentNames) {
      const agent = this.agents.get(agentName)
      if (agent) {
        const output = await agent.execute(input)
        outputs.push(output)
      }
    }

    return outputs
  }

  private async validatePhaseArtifacts(
    phase: z.infer<typeof ProjectPhaseSchema>,
    outputs: AgentOutput[]
  ): Promise<boolean> {
    const requiredArtifacts = PHASE_CONFIG[phase].requiredArtifacts
    const generatedArtifacts = outputs.flatMap(output => 
      output.artifacts.map(artifact => artifact.name)
    )

    // Check if all required artifacts are present
    const missingArtifacts = requiredArtifacts.filter(
      required => !generatedArtifacts.includes(required)
    )

    if (missingArtifacts.length > 0) {
      console.warn(`Missing artifacts for phase ${phase}:`, missingArtifacts)
      return false
    }

    // Run custom validation logic for specific phases
    return this.runPhaseValidation(phase, outputs)
  }

  private async runPhaseValidation(
    phase: z.infer<typeof ProjectPhaseSchema>,
    outputs: AgentOutput[]
  ): Promise<boolean> {
    // Phase-specific validation logic
    switch (phase) {
      case 'spec':
        return this.validateSpecPhase(outputs)
      case 'dependencies':
        return this.validateDependenciesPhase(outputs)
      case 'solutioning':
        return this.validateSolutioningPhase(outputs)
      default:
        return true
    }
  }

  private validateSpecPhase(outputs: AgentOutput[]): boolean {
    // Validate PRD, API spec, data model consistency
    const artifacts = outputs.flatMap(output => output.artifacts)
    const hasPRD = artifacts.some(a => a.name === 'PRD.md')
    const hasAPISpec = artifacts.some(a => a.name === 'api-spec.json')
    const hasDataModel = artifacts.some(a => a.name === 'data-model.md')

    return hasPRD && hasAPISpec && hasDataModel
  }

  private validateDependenciesPhase(outputs: AgentOutput[]): boolean {
    // Validate SBOM and dependency security
    const artifacts = outputs.flatMap(output => output.artifacts)
    const hasSBOM = artifacts.some(a => a.name === 'sbom.json')
    const hasDependencies = artifacts.some(a => a.name === 'DEPENDENCIES.md')

    return hasSBOM && hasDependencies
  }

  private validateSolutioningPhase(outputs: AgentOutput[]): boolean {
    // Validate task breakdown and architecture
    const artifacts = outputs.flatMap(output => output.artifacts)
    const hasTasks = artifacts.some(a => a.name === 'tasks.md')
    const hasArchitecture = artifacts.some(a => a.name === 'architecture.md')

    return hasTasks && hasArchitecture
  }

  private async savePhaseArtifacts(
    projectId: string,
    phase: z.infer<typeof ProjectPhaseSchema>,
    outputs: AgentOutput[]
  ) {
    const artifacts = outputs.flatMap(output => output.artifacts)

    for (const artifact of artifacts) {
      await db.insert(projectArtifacts).values({
        id: uuidv4(),
        projectId,
        phase,
        artifactName: artifact.name,
        contentHash: this.generateHash(artifact.content),
        validationErrors: artifact.validationErrors || [],
        validationStatus: artifact.validationErrors?.length ? 'fail' : 'pass',
        qualityScore: outputs.find(o => o.artifacts.some(a => a.name === artifact.name))?.qualityScore || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  }

  private generateHash(content: string): string {
    // Simple hash generation for content
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  private async runCrossArtifactValidation(projectId: string, phase: z.infer<typeof ProjectPhaseSchema>): Promise<void> {
    try {
      // Get all artifacts for the project
      const artifacts = await this.getProjectArtifacts(projectId)
      
      if (artifacts.length < 2) {
        // Need at least 2 artifacts to run cross-validation
        return
      }

      // Convert artifacts to validation engine format
      const artifactMap: Record<string, { id: string; name: string; content: string; phase: string; type: string }> = {}
      
      for (const artifact of artifacts) {
        const artifactName = this.getArtifactFileName(artifact.artifactName)
        artifactMap[artifactName] = {
          id: artifact.id,
          name: artifact.artifactName,
          content: artifact.content || '',
          phase: artifact.phase,
          type: this.getArtifactType(artifact.artifactName)
        }
      }

      // Run validation
      const report = await validationEngine.validateArtifacts(projectId, phase, artifactMap)
      
      console.log(`Cross-artifact validation completed for project ${projectId}:`, report.overallStatus)
    } catch (error) {
      console.error('Cross-artifact validation failed:', error)
    }
  }

  private getArtifactFileName(artifactName: string): string {
    const mapping: Record<string, string> = {
      'PRD.md': 'PRD.md',
      'Project Requirements Document': 'PRD.md',
      'api-spec.json': 'api-spec.json',
      'API Specification': 'api-spec.json',
      'data-model.md': 'data-model.md',
      'Data Model': 'data-model.md',
      'tasks.md': 'tasks.md',
      'Task Breakdown': 'tasks.md',
      'stack-proposal.md': 'stack-proposal.md',
      'Stack Proposal': 'stack-proposal.md',
      'DEPENDENCIES.md': 'DEPENDENCIES.md',
      'Dependencies': 'DEPENDENCIES.md'
    }

    return mapping[artifactName] || artifactName
  }

  private getArtifactType(artifactName: string): string {
    if (artifactName.includes('PRD') || artifactName.includes('Requirements')) return 'requirements'
    if (artifactName.includes('API') || artifactName.includes('spec')) return 'api'
    if (artifactName.includes('data') || artifactName.includes('model')) return 'data'
    if (artifactName.includes('task')) return 'tasks'
    if (artifactName.includes('stack')) return 'stack'
    if (artifactName.includes('dependency')) return 'dependencies'
    return 'general'
  }
}