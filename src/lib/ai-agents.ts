import { z } from 'zod'
import type { AgentInput, AgentOutput } from './orchestrator'

// Gemini AI client
export class GeminiClient {
  private apiKey: string
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateContent(prompt: string, options?: {
    temperature?: number
    maxOutputTokens?: number
    topK?: number
    topP?: number
  }): Promise<string> {
    const model = 'gemini-2.5-flash'
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: options?.temperature || 0.7,
        maxOutputTokens: options?.maxOutputTokens || 2048,
        topK: options?.topK || 1,
        topP: options?.topP || 1,
      }
    }

    const response = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Gemini')
    }

    return data.candidates[0].content.parts[0].text
  }

  async countTokens(text: string): Promise<number> {
    // Rough token estimation (4 chars per token on average)
    return Math.ceil(text.length / 4)
  }
}

// Base AI Agent class
export abstract class BaseAIAgent {
  protected gemini: GeminiClient
  public readonly name: string
  public readonly phase: string

  constructor(name: string, phase: string, geminiApiKey: string) {
    this.name = name
    this.phase = phase
    this.gemini = new GeminiClient(geminiApiKey)
  }

  abstract execute(input: AgentInput): Promise<AgentOutput>

  protected buildPrompt(template: string, context: Record<string, any>): string {
    let prompt = template

    // Replace placeholders with context data
    Object.entries(context).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value))
    })

    return prompt
  }

  protected async generateArtifact(
    prompt: string, 
    artifactName: string, 
    artifactType: 'markdown' | 'json' = 'markdown',
    options?: {
      temperature?: number
      maxTokens?: number
    }
  ): Promise<{ name: string; content: string; frontmatter?: Record<string, any>; phase: string; validationErrors?: string[] }> {
    try {
      const content = await this.gemini.generateContent(prompt, {
        temperature: options?.temperature || 0.7,
        maxOutputTokens: options?.maxTokens || 2048
      })

      // Extract frontmatter if present
      let frontmatter: Record<string, any> | undefined
      let processedContent = content

      if (content.startsWith('---')) {
        const parts = content.split('---')
        if (parts.length >= 3) {
          const frontmatterText = parts[1].trim()
          processedContent = parts[2].trim()
          
          // Parse YAML frontmatter (simplified)
          frontmatter = this.parseFrontmatter(frontmatterText)
        }
      }

      return {
        name: artifactName,
        content: processedContent,
        frontmatter,
        phase: this.phase
      }
    } catch (error) {
      console.error(`Error generating artifact ${artifactName}:`, error)
      return {
        name: artifactName,
        content: `# Error generating ${artifactName}\n\nAn error occurred while generating this artifact.`,
        frontmatter: {
          error: true,
          timestamp: new Date().toISOString()
        },
        phase: this.phase,
        validationErrors: [`Generation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  protected parseFrontmatter(frontmatterText: string): Record<string, any> {
    const result: Record<string, any> = {}
    
    // Simple YAML parser for common fields
    const lines = frontmatterText.split('\n')
    for (const line of lines) {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim()
        let value = line.slice(colonIndex + 1).trim()
        
        // Parse different value types
        if (value === 'true' || value === 'false') {
          result[key] = value === 'true'
        } else if (/^\d+$/.test(value)) {
          result[key] = parseInt(value, 10)
        } else if (/^\d*\.\d+$/.test(value)) {
          result[key] = parseFloat(value)
        } else {
          result[key] = value
        }
      }
    }
    
    return result
  }

  protected calculateQualityScore(content: string): number {
    // Basic quality scoring based on content length and structure
    const lines = content.split('\n').filter(line => line.trim())
    const hasStructure = lines.some(line => line.startsWith('#'))
    const hasContent = content.length > 100
    const isDetailed = lines.length > 10

    let score = 50 // Base score
    
    if (hasStructure) score += 15
    if (hasContent) score += 20
    if (isDetailed) score += 15
    
    return Math.min(score, 100)
  }

  protected async estimateTokensUsed(content: string): Promise<number> {
    return this.gemini.countTokens(content)
  }

  protected generateRequirementId(area: string, sequence: number): string {
    return `REQ-${area.toUpperCase()}-${sequence.toString().padStart(3, '0')}`
  }
}

// Mock AI Agents for demonstration
export class MockAnalystAgent extends BaseAIAgent {
  constructor() {
    super('Analyst', 'analysis', process.env.GEMINI_API_KEY || 'mock-key')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    // Generate analysis artifacts
    const constitution = await this.generateArtifact(
      this.buildPrompt(this.getConstitutionPrompt(), {
        projectIdea: input.phaseData.project?.idea || '',
        projectName: input.phaseData.project?.name || ''
      }),
      'constitution.md'
    )

    const brief = await this.generateArtifact(
      this.buildPrompt(this.getBriefPrompt(), {
        projectDescription: input.phaseData.project?.description || '',
        projectName: input.phaseData.project?.name || ''
      }),
      'project-brief.md'
    )

    const personas = await this.generateArtifact(
      this.buildPrompt(this.getPersonasPrompt(), {
        projectDescription: input.phaseData.project?.description || ''
      }),
      'personas.md'
    )

    const totalTokens = await this.estimateTokensUsed(
      constitution.content + brief.content + personas.content
    )
    const avgQuality = (
      this.calculateQualityScore(constitution.content) +
      this.calculateQualityScore(brief.content) +
      this.calculateQualityScore(personas.content)
    ) / 3

    return {
      artifacts: [constitution, brief, personas],
      validationPassed: true,
      tokensUsed: totalTokens,
      qualityScore: Math.round(avgQuality)
    }
  }

  private getConstitutionPrompt(): string {
    return `
Generate a project constitution for "{{projectName}}" based on this idea: "{{projectIdea}}"

The constitution should include:
1. Mission statement
2. Core values and principles
3. Non-negotiable constraints
4. Success criteria
5. Risk considerations

Format as a markdown file with clear sections.
`
  }

  private getBriefPrompt(): string {
    return `
Create a comprehensive project brief for "{{projectName}}": "{{projectDescription}}"

Include:
1. Executive summary
2. Problem statement
3. Market analysis
4. Target audience
5. Value proposition
6. Success metrics
7. Timeline estimates

Format as a markdown file.
`
  }

  private getPersonasPrompt(): string {
    return `
Create 3-5 detailed user personas for: "{{projectDescription}}"

Each persona should include:
1. Name and role
2. Demographics
3. Goals and motivations
4. Pain points
5. Technology usage
6. User stories

Format as a markdown file with clear sections for each persona.
`
  }
}

export class MockArchitectAgent extends BaseAIAgent {
  constructor() {
    super('Architect', 'stack_selection', process.env.GEMINI_API_KEY || 'mock-key')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    // Implementation for architect agent
    const stackProposal = await this.generateArtifact(
      this.buildPrompt(this.getStackProposalPrompt(), {
        projectDescription: input.phaseData.project?.description || ''
      }),
      'stack-proposal.md'
    )

    const plan = await this.generateArtifact(
      this.buildPrompt(this.getPlanPrompt(), {
        projectName: input.phaseData.project?.name || ''
      }),
      'plan.md'
    )

    const readme = await this.generateArtifact(
      this.buildPrompt(this.getReadmePrompt(), {
        projectName: input.phaseData.project?.name || '',
        projectDescription: input.phaseData.project?.description || ''
      }),
      'README.md'
    )

    const scorecard = await this.generateArtifact(
      this.buildPrompt(this.getScorecardPrompt(), {
        projectDescription: input.phaseData.project?.description || ''
      }),
      'stack-scorecard.json',
      'json'
    )

    const totalTokens = await this.estimateTokensUsed(
      stackProposal.content + plan.content + readme.content + scorecard.content
    )
    const avgQuality = (
      this.calculateQualityScore(stackProposal.content) +
      this.calculateQualityScore(plan.content) +
      this.calculateQualityScore(readme.content)
    ) / 3

    return {
      artifacts: [stackProposal, plan, readme, scorecard],
      validationPassed: true,
      tokensUsed: totalTokens,
      qualityScore: Math.round(avgQuality)
    }
  }

  private getStackProposalPrompt(): string {
    return `
Create a technology stack proposal for: "{{projectDescription}}"

Recommend the canonical Next.js stack (Next.js + Neon + Drizzle + Better Auth + shadcn/ui) with:
1. Stack overview
2. Component benefits
3. Trade-offs analysis
4. Implementation roadmap
5. Cost considerations

Format as a markdown file.
`
  }

  private getPlanPrompt(): string {
    return `
Create a development plan for: "{{projectName}}"

Include:
1. Architecture overview
2. Key components
3. Data flow
4. Security considerations
5. Performance requirements
6. Scalability plan

Format as a markdown file.
`
  }

  private getReadmePrompt(): string {
    return `
Create a README.md for: "{{projectName}}"

Description: "{{projectDescription}}"

Include:
1. Project overview
2. Tech stack
3. Getting started
4. Development workflow
5. Deployment
6. Contributing guidelines

Format as markdown.
`
  }

  private getScorecardPrompt(): string {
    return `
Create a stack scorecard JSON for: "{{projectDescription}}"

Evaluate the Next.js stack (Next.js + Neon + Drizzle + Better Auth + shadcn/ui) with scores (1-10) for:
1. Development speed
2. Scalability
3. Security
4. Maintainability
5. Community support
6. Cost efficiency
7. Learning curve

Format as valid JSON with scores and brief justifications.
`
  }
}

// PM Agent (Product Manager) - High Priority Implementation
export class MockPMAgent extends BaseAIAgent {
  constructor() {
    super('PM', 'spec', process.env.GEMINI_API_KEY || 'mock-key')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    // Extract project data
    const project = input.phaseData.project
    const previousArtifacts = input.artifacts

    // Generate PRD with requirement numbering system
    const prd = await this.generateArtifact(
      this.buildPrompt(this.getPRDPrompt(), {
        projectName: project?.name || '',
        projectDescription: project?.description || '',
        projectIdea: project?.idea || '',
        requirements: this.generateRequirementNumbering([
          'User Authentication',
          'Data Management', 
          'User Interface',
          'Performance',
          'Security',
          'Integration'
        ])
      }),
      'PRD.md'
    )

    // Generate data model
    const dataModel = await this.generateArtifact(
      this.buildPrompt(this.getDataModelPrompt(), {
        projectDescription: project?.description || ''
      }),
      'data-model.md'
    )

    // Generate API spec
    const apiSpec = await this.generateArtifact(
      this.buildPrompt(this.getAPISpecPrompt(), {
        projectDescription: project?.description || ''
      }),
      'api-spec.json',
      'json'
    )

    // Generate traceability matrix
    const traceability = await this.generateArtifact(
      this.buildPrompt(this.getTraceabilityPrompt(), {
        projectName: project?.name || ''
      }),
      'traceability.json',
      'json'
    )

    const totalTokens = await this.estimateTokensUsed(
      prd.content + dataModel.content + apiSpec.content + traceability.content
    )
    const avgQuality = (
      this.calculateQualityScore(prd.content) +
      this.calculateQualityScore(dataModel.content) +
      this.calculateQualityScore(apiSpec.content)
    ) / 3

    return {
      artifacts: [prd, dataModel, apiSpec, traceability],
      validationPassed: true,
      tokensUsed: totalTokens,
      qualityScore: Math.round(avgQuality)
    }
  }

  private generateRequirementNumbering(areas: string[]): string {
    return areas.map((area, index) => 
      `${this.generateRequirementId(area, 1)}: ${area} requirement`
    ).join('\n')
  }

  private getPRDPrompt(): string {
    return `
Create a comprehensive Product Requirements Document (PRD) for: "{{projectName}}"

Project Description: "{{projectDescription}}"
Project Idea: "{{projectIdea}}"

Requirements Overview:
{{requirements}}

Include:
1. Executive Summary
2. Product Overview
3. User Stories and Acceptance Criteria
4. Functional Requirements
5. Non-functional Requirements
6. User Interface Requirements
7. Data Requirements
8. Security Requirements
9. Performance Requirements
10. MVP vs Phase 2 Scope
11. Success Metrics
12. Risk Assessment

Use the REQ-AREA-XXX numbering system for requirements and include acceptance criteria for each.
`
  }

  private getDataModelPrompt(): string {
    return `
Create a detailed data model for: "{{projectDescription}}"

Include:
1. Entity Relationship Diagram (textual)
2. Database schema design
3. Data flow diagrams
4. Data validation rules
5. Privacy and security considerations
6. Scalability planning

Format as a markdown file with clear sections.
`
  }

  private getAPISpecPrompt(): string {
    return `
Create an API specification for: "{{projectDescription}}"

Include:
1. API Overview
2. Authentication
3. Endpoints
4. Request/Response formats
5. Error handling
6. Rate limiting
7. Data validation

Format as valid JSON OpenAPI-like specification.
`
  }

  private getTraceabilityPrompt(): string {
    return `
Create a requirement traceability matrix for: "{{projectName}}"

Include:
1. Requirements tracking
2. Implementation status
3. Test coverage
4. Stakeholder approval
5. Traceability links

Format as valid JSON.
`
  }
}

// DevOps Agent - High Priority Implementation
export class MockDevOpsAgent extends BaseAIAgent {
  constructor() {
    super('DevOps', 'dependencies', process.env.GEMINI_API_KEY || 'mock-key')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    // Extract project data
    const project = input.phaseData.project

    // Generate DEPENDENCIES.md with rationale
    const dependencies = await this.generateArtifact(
      this.buildPrompt(this.getDependenciesPrompt(), {
        projectName: project?.name || '',
        projectDescription: project?.description || ''
      }),
      'DEPENDENCIES.md'
    )

    // Generate dependency proposal JSON
    const dependencyProposal = await this.generateArtifact(
      this.buildPrompt(this.getDependencyProposalPrompt(), {
        projectDescription: project?.description || ''
      }),
      'dependency-proposal.json',
      'json'
    )

    // Generate SBOM (CycloneDX format)
    const sbom = await this.generateArtifact(
      this.buildPrompt(this.getSBOMPrompt(), {
        projectName: project?.name || ''
      }),
      'sbom.json',
      'json'
    )

    const totalTokens = await this.estimateTokensUsed(
      dependencies.content + dependencyProposal.content + sbom.content
    )
    const avgQuality = (
      this.calculateQualityScore(dependencies.content) +
      this.calculateQualityScore(dependencyProposal.content) +
      this.calculateQualityScore(sbom.content)
    ) / 3

    return {
      artifacts: [dependencies, dependencyProposal, sbom],
      validationPassed: true,
      tokensUsed: totalTokens,
      qualityScore: Math.round(avgQuality)
    }
  }

  private getDependenciesPrompt(): string {
    return `
Create a comprehensive DEPENDENCIES.md file for: "{{projectName}}"

Project Description: "{{projectDescription}}"

Include:
1. Runtime Dependencies
2. Development Dependencies
3. Build Dependencies
4. Security Dependencies
5. Each dependency with:
   - Purpose and rationale
   - Version selection reasoning
   - Security considerations
   - Maintenance status
   - Alternative options considered
6. Dependency management strategy
7. Security update procedures
8. License compatibility

Format as markdown with clear sections.
`
  }

  private getDependencyProposalPrompt(): string {
    return `
Create a dependency proposal JSON for: "{{projectDescription}}"

Include detailed analysis of:
1. Core dependencies (Next.js, React, TypeScript)
2. Database dependencies (Drizzle ORM, Neon)
3. Authentication (Better Auth)
4. UI dependencies (shadcn/ui, Tailwind CSS)
5. Development tools
6. Security tools

Each dependency should include:
- name, version, purpose
- security_rating
- maintenance_score
- alternative_count
- risk_assessment

Format as valid JSON.
`
  }

  private getSBOMPrompt(): string {
    return `
Create a Software Bill of Materials (SBOM) in CycloneDX format for: "{{projectName}}"

Include:
1. Project metadata
2. Component dependencies
3. License information
4. Security vulnerabilities
5. Version information
6. Dependency tree

Generate a valid CycloneDX JSON SBOM with realistic dependencies for a Next.js application.
`
  }
}

// Scrum Master Agent - High Priority Implementation
export class MockScrumMasterAgent extends BaseAIAgent {
  constructor() {
    super('Scrum', 'solutioning', process.env.GEMINI_API_KEY || 'mock-key')
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    // Extract project data
    const project = input.phaseData.project

    // Generate architecture document
    const architecture = await this.generateArtifact(
      this.buildPrompt(this.getArchitecturePrompt(), {
        projectName: project?.name || '',
        projectDescription: project?.description || ''
      }),
      'architecture.md'
    )

    // Generate epics
    const epics = await this.generateArtifact(
      this.buildPrompt(this.getEpicsPrompt(), {
        projectDescription: project?.description || ''
      }),
      'epics.md'
    )

    // Generate tasks breakdown
    const tasks = await this.generateArtifact(
      this.buildPrompt(this.getTasksPrompt(), {
        projectDescription: project?.description || ''
      }),
      'tasks.md'
    )

    // Generate updated traceability with task mapping
    const traceability = await this.generateArtifact(
      this.buildPrompt(this.getTaskTraceabilityPrompt(), {
        projectName: project?.name || ''
      }),
      'traceability.json',
      'json'
    )

    const totalTokens = await this.estimateTokensUsed(
      architecture.content + epics.content + tasks.content + traceability.content
    )
    const avgQuality = (
      this.calculateQualityScore(architecture.content) +
      this.calculateQualityScore(epics.content) +
      this.calculateQualityScore(tasks.content)
    ) / 3

    return {
      artifacts: [architecture, epics, tasks, traceability],
      validationPassed: true,
      tokensUsed: totalTokens,
      qualityScore: Math.round(avgQuality)
    }
  }

  private getArchitecturePrompt(): string {
    return `
Create a comprehensive architecture document for: "{{projectName}}"

Project Description: "{{projectDescription}}"

Include:
1. System Architecture Overview
2. Component Architecture
3. Data Architecture
4. Security Architecture
5. Integration Architecture
6. Deployment Architecture
7. Scalability Considerations
8. Performance Considerations
9. Technology Decisions
10. Architecture Principles

Format as markdown with clear sections and diagrams (textual).
`
  }

  private getEpicsPrompt(): string {
    return `
Create detailed epics for: "{{projectDescription}}"

Break down the project into 5-8 meaningful epics. Each epic should include:
1. Epic ID and Title
2. Business Value
3. User Stories (3-5 per epic)
4. Acceptance Criteria
5. Dependencies
6. Estimated Effort
7. Priority Level
8. Definition of Done

Format as markdown with clear sections for each epic.
`
  }

  private getTasksPrompt(): string {
    return `
Create a detailed task breakdown for: "{{projectDescription}}"

Include:
1. Development Tasks
2. Testing Tasks
3. Documentation Tasks
4. Deployment Tasks
5. Each task should have:
   - Task ID and Title
   - Description
   - Estimated Hours
   - Complexity (1-5)
   - Dependencies
   - Assigned Role
   - Acceptance Criteria

Format as markdown with clear sections.
`
  }

  private getTaskTraceabilityPrompt(): string {
    return `
Create a task traceability matrix for: "{{projectName}}"

Map requirements to tasks, tests, and implementation status.
Include:
1. Requirement to Task mapping
2. Task to Test case mapping
3. Implementation status tracking
4. Dependency tracking
5. Effort estimation

Format as valid JSON.
`
  }
}

// Export all agents
export const agents = {
  analyst: new MockAnalystAgent(),
  architect: new MockArchitectAgent(),
  pm: new MockPMAgent(),
  devops: new MockDevOpsAgent(),
  scrum: new MockScrumMasterAgent()
}

export function getAgent(agentName: string): BaseAIAgent | null {
  return agents[agentName as keyof typeof agents] || null
}