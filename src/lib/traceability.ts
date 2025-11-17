import { z } from 'zod'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { eq } from 'drizzle-orm'

export interface RequirementTrace {
  requirementId: string
  requirementTitle: string
  category: string
  apiEndpoints: string[]
  dataEntities: string[]
  tasks: string[]
  coverage: number
  status: 'covered' | 'partial' | 'uncovered'
}

export interface TraceabilityMatrix {
  projectId: string
  projectName: string
  requirements: RequirementTrace[]
  totalRequirements: number
  totalCovered: number
  totalPartial: number
  totalUncovered: number
  overallCoverage: number
  generatedAt: string
  lastUpdated: string
}

export interface CoverageReport {
  projectId: string
  phase: string
  overallCoverage: number
  requirementCoverage: number
  apiCoverage: number
  dataCoverage: number
  taskCoverage: number
  impactAnalysis: ImpactAnalysisItem[]
  recommendations: string[]
}

export interface ImpactAnalysisItem {
  requirement: string
  affectedArtifacts: string[]
  riskLevel: 'high' | 'medium' | 'low'
  impact: string
}

/**
 * Traceability Engine for requirement coverage analysis
 * Tracks how requirements are covered across artifacts
 */
export class TraceabilityEngine {
  /**
   * Generate traceability matrix from project artifacts
   */
  static async generateTraceabilityMatrix(
    projectId: string,
    artifacts: Record<string, string>
  ): Promise<TraceabilityMatrix> {
    try {
      const project = await db.select().from(projects).where(eq(projects.id, projectId))
      const projectName = project[0]?.name || 'Unknown Project'

      const prdContent = artifacts['PRD.md'] || artifacts['prd.md'] || ''
      const apiSpec = artifacts['api-spec.json'] || artifacts['api_spec.json'] || ''
      const dataModel = artifacts['data-model.md'] || artifacts['data_model.md'] || ''
      const tasks = artifacts['tasks.md'] || artifacts['tasks.md'] || ''

      const requirements = this.extractRequirements(prdContent)
      const apiEndpoints = this.extractAPIEndpoints(apiSpec)
      const dataEntities = this.extractDataEntities(dataModel)
      const tasksList = this.extractTasks(tasks)

      const requirementTraces: RequirementTrace[] = requirements.map((req) => {
        const matchedApis = this.findMatchingApis(req, apiEndpoints)
        const matchedEntities = this.findMatchingEntities(req, dataEntities)
        const matchedTasks = this.findMatchingTasks(req, tasksList)

        const coverage = this.calculateCoverage(
          req,
          matchedApis,
          matchedEntities,
          matchedTasks
        )

        return {
          requirementId: req.id,
          requirementTitle: req.title,
          category: req.category,
          apiEndpoints: matchedApis,
          dataEntities: matchedEntities,
          tasks: matchedTasks,
          coverage,
          status:
            coverage === 100 ? 'covered' : coverage >= 50 ? 'partial' : 'uncovered',
        }
      })

      const totalCovered = requirementTraces.filter((r) => r.status === 'covered').length
      const totalPartial = requirementTraces.filter((r) => r.status === 'partial').length
      const totalUncovered = requirementTraces.filter((r) => r.status === 'uncovered').length
      const overallCoverage = this.calculateOverallCoverage(requirementTraces)

      return {
        projectId,
        projectName,
        requirements: requirementTraces,
        totalRequirements: requirements.length,
        totalCovered,
        totalPartial,
        totalUncovered,
        overallCoverage,
        generatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Failed to generate traceability matrix:', error)
      return {
        projectId,
        projectName: 'Unknown',
        requirements: [],
        totalRequirements: 0,
        totalCovered: 0,
        totalPartial: 0,
        totalUncovered: 0,
        overallCoverage: 0,
        generatedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      }
    }
  }

  /**
   * Generate comprehensive coverage report
   */
  static generateCoverageReport(
    projectId: string,
    phase: string,
    matrix: TraceabilityMatrix
  ): CoverageReport {
    const impactAnalysis = this.analyzeImpact(matrix)
    const recommendations = this.generateRecommendations(matrix)

    const apiCoverage = this.calculateApiCoverage(matrix)
    const dataCoverage = this.calculateDataCoverage(matrix)
    const taskCoverage = this.calculateTaskCoverage(matrix)

    return {
      projectId,
      phase,
      overallCoverage: matrix.overallCoverage,
      requirementCoverage: (matrix.totalCovered / matrix.totalRequirements) * 100,
      apiCoverage,
      dataCoverage,
      taskCoverage,
      impactAnalysis,
      recommendations,
    }
  }

  /**
   * Extract requirements from PRD content
   */
  private static extractRequirements(
    content: string
  ): Array<{
    id: string
    title: string
    description: string
    category: string
  }> {
    const requirements: Array<{
      id: string
      title: string
      description: string
      category: string
    }> = []
    const lines = content.split('\n')

    for (const line of lines) {
      const match = line.match(/^(REQ-[A-Z]+-\d+):\s*(.+)/)
      if (match) {
        const [, id, title] = match
        const category = this.categorizeRequirement(title)
        requirements.push({
          id,
          title,
          description: line,
          category,
        })
      }
    }

    return requirements
  }

  /**
   * Extract API endpoints from API spec
   */
  private static extractAPIEndpoints(
    content: string
  ): Array<{ path: string; method: string; description: string }> {
    try {
      const spec = JSON.parse(content)
      const endpoints: Array<{ path: string; method: string; description: string }> = []

      if (spec.paths) {
        Object.entries(spec.paths).forEach(([path, methods]: [string, unknown]) => {
          if (typeof methods === 'object' && methods !== null) {
            Object.entries(methods).forEach(([method, details]: [string, unknown]) => {
              if (typeof details === 'object' && details !== null) {
                const typedDetails = details as Record<string, unknown>
                endpoints.push({
                  path,
                  method: method.toUpperCase(),
                  description: String(typedDetails.summary || typedDetails.description || ''),
                })
              }
            })
          }
        })
      }

      return endpoints
    } catch {
      return []
    }
  }

  /**
   * Extract data entities from data model
   */
  private static extractDataEntities(
    content: string
  ): Array<{ name: string; description: string }> {
    const entities: Array<{ name: string; description: string }> = []
    const lines = content.split('\n')

    for (const line of lines) {
      if (line.match(/^##?\s+\w+\s+(Table|Entity|Schema)/i)) {
        const match = line.match(/^##?\s+(\w+)/)
        if (match) {
          entities.push({
            name: match[1],
            description: line.trim(),
          })
        }
      }
    }

    return entities
  }

  /**
   * Extract tasks from task list
   */
  private static extractTasks(
    content: string
  ): Array<{ id: string; title: string; description: string }> {
    const tasks: Array<{ id: string; title: string; description: string }> = []
    const lines = content.split('\n')

    for (const line of lines) {
      if (line.match(/^-\s*\[|^\*\s*\d+\./)) {
        const taskText = line.replace(/^-\s*\[.*?\]\s*/, '').replace(/^\*\s*\d+\.\s*/, '')
        const idMatch = line.match(/^-\s*\[(.*?)\]/)

        if (taskText.trim()) {
          tasks.push({
            id: idMatch ? idMatch[1] : '',
            title: taskText.trim(),
            description: taskText.trim(),
          })
        }
      }
    }

    return tasks
  }

  /**
   * Find matching API endpoints for a requirement
   */
  private static findMatchingApis(
    requirement: { id: string; title: string },
    endpoints: Array<{ path: string; method: string; description: string }>
  ): string[] {
    const keywords = requirement.title.toLowerCase().split(' ')
    return endpoints
      .filter((api) => {
        const apiText = `${api.path} ${api.description}`.toLowerCase()
        return keywords.some((keyword) => apiText.includes(keyword) && keyword.length > 2)
      })
      .map((api) => `${api.method} ${api.path}`)
  }

  /**
   * Find matching data entities for a requirement
   */
  private static findMatchingEntities(
    requirement: { id: string; title: string },
    entities: Array<{ name: string; description: string }>
  ): string[] {
    const keywords = requirement.title.toLowerCase().split(' ')
    return entities
      .filter((entity) => {
        const entityText = `${entity.name} ${entity.description}`.toLowerCase()
        return keywords.some((keyword) => entityText.includes(keyword) && keyword.length > 2)
      })
      .map((entity) => entity.name)
  }

  /**
   * Find matching tasks for a requirement
   */
  private static findMatchingTasks(
    requirement: { id: string; title: string },
    tasks: Array<{ id: string; title: string }>
  ): string[] {
    const reqKeywords = requirement.title.toLowerCase().split(' ')
    return tasks
      .filter((task) => {
        const taskText = task.title.toLowerCase()
        return reqKeywords.some((keyword) => taskText.includes(keyword) && keyword.length > 3)
      })
      .map((task) => task.title.substring(0, 50))
  }

  /**
   * Calculate individual requirement coverage
   */
  private static calculateCoverage(
    _requirement: { id: string; title: string },
    apis: string[],
    entities: string[],
    tasks: string[]
  ): number {
    let coverage = 0
    let factors = 0

    if (apis.length > 0) {
      coverage += Math.min(100, apis.length * 30)
      factors += 1
    }

    if (entities.length > 0) {
      coverage += Math.min(100, entities.length * 40)
      factors += 1
    }

    if (tasks.length > 0) {
      coverage += Math.min(100, tasks.length * 30)
      factors += 1
    }

    return factors > 0 ? Math.round(coverage / factors) : 0
  }

  /**
   * Calculate overall coverage percentage
   */
  private static calculateOverallCoverage(traces: RequirementTrace[]): number {
    if (traces.length === 0) return 0
    const sum = traces.reduce((acc, trace) => acc + trace.coverage, 0)
    return Math.round(sum / traces.length)
  }

  /**
   * Analyze impact of incomplete requirements
   */
  private static analyzeImpact(matrix: TraceabilityMatrix): ImpactAnalysisItem[] {
    return matrix.requirements
      .filter((req) => req.status !== 'covered')
      .map((req) => {
        const missingArtifacts: string[] = []
        if (req.apiEndpoints.length === 0) missingArtifacts.push('API Endpoints')
        if (req.dataEntities.length === 0) missingArtifacts.push('Data Model')
        if (req.tasks.length === 0) missingArtifacts.push('Implementation Tasks')

        const riskLevel =
          req.status === 'uncovered'
            ? 'high'
            : missingArtifacts.length > 1
              ? 'medium'
              : 'low'

        return {
          requirement: req.requirementTitle,
          affectedArtifacts: missingArtifacts,
          riskLevel,
          impact: `Missing coverage in: ${missingArtifacts.join(', ')}`,
        }
      })
  }

  /**
   * Generate recommendations for improving coverage
   */
  private static generateRecommendations(matrix: TraceabilityMatrix): string[] {
    const recommendations: string[] = []

    if (matrix.totalUncovered > 0) {
      recommendations.push(
        `${matrix.totalUncovered} requirements are uncovered. Review and add corresponding artifacts.`
      )
    }

    if (matrix.totalPartial > 0) {
      recommendations.push(
        `${matrix.totalPartial} requirements have partial coverage. Consider adding missing API endpoints or data entities.`
      )
    }

    if (matrix.overallCoverage < 80) {
      recommendations.push(
        'Overall coverage is below 80%. Consider conducting a requirements refinement session.'
      )
    }

    if (matrix.overallCoverage < 60) {
      recommendations.push(
        'Critical: Coverage is below 60%. Recommend immediate action to improve artifact alignment.'
      )
    }

    return recommendations
  }

  /**
   * Calculate API coverage percentage
   */
  private static calculateApiCoverage(matrix: TraceabilityMatrix): number {
    const withApis = matrix.requirements.filter((r) => r.apiEndpoints.length > 0).length
    return matrix.totalRequirements > 0
      ? Math.round((withApis / matrix.totalRequirements) * 100)
      : 0
  }

  /**
   * Calculate data coverage percentage
   */
  private static calculateDataCoverage(matrix: TraceabilityMatrix): number {
    const withData = matrix.requirements.filter((r) => r.dataEntities.length > 0).length
    return matrix.totalRequirements > 0
      ? Math.round((withData / matrix.totalRequirements) * 100)
      : 0
  }

  /**
   * Calculate task coverage percentage
   */
  private static calculateTaskCoverage(matrix: TraceabilityMatrix): number {
    const withTasks = matrix.requirements.filter((r) => r.tasks.length > 0).length
    return matrix.totalRequirements > 0
      ? Math.round((withTasks / matrix.totalRequirements) * 100)
      : 0
  }

  /**
   * Categorize requirement
   */
  private static categorizeRequirement(title: string): string {
    const categories: Record<string, string[]> = {
      authentication: ['auth', 'login', 'register', 'signin', 'password'],
      data: ['data', 'store', 'database', 'entity', 'model'],
      ui: ['interface', 'ui', 'design', 'layout', 'component'],
      api: ['api', 'endpoint', 'service', 'integration'],
      security: ['security', 'permission', 'access', 'role'],
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => title.toLowerCase().includes(keyword))) {
        return category
      }
    }

    return 'general'
  }
}

export const traceabilityEngine = new TraceabilityEngine()
