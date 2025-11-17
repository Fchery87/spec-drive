import { z } from 'zod';
import { db } from '@/db';
import {
  validationRules,
  validationReports,
  crossArtifactValidations,
  projectArtifacts,
} from '@/db/schema';
import { eq } from 'drizzle-orm';

// Validation schemas
export const ValidationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum([
    'requirement_api',
    'requirement_data',
    'requirement_task',
    'stack_dependency',
  ]),
  severity: z.enum(['error', 'warning', 'info']),
  enabled: z.boolean().default(true),
  rule: z.string(), // JavaScript expression for validation
});

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  affectedArtifacts?: string[];
  affectedRequirements?: string[];
}

export interface ValidationReport {
  id?: string;
  projectId: string;
  phase: string;
  reportName: string;
  overallStatus: 'pass' | 'fail' | 'warning';
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  validationResults: ValidationResult[];
  reportMetadata?: Record<string, any>;
}

export interface ArtifactContent {
  id: string;
  name: string;
  content: string;
  phase: string;
  type: string;
}

// Enhanced validation engine with database integration
export class ValidationEngine {
  private rules: ValidationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
    this.loadRulesFromDatabase();
  }

  private async loadRulesFromDatabase() {
    try {
      const dbRules = await db
        .select()
        .from(validationRules)
        .where(eq(validationRules.enabled, true));
      this.rules = dbRules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        type: rule.type as any,
        severity: rule.severity as any,
        enabled: rule.enabled,
        rule: rule.rule,
      }));
    } catch (error) {
      console.warn(
        'Failed to load validation rules from database, using defaults:',
        error
      );
    }
  }

  private initializeDefaultRules() {
    const defaultRules = [
      // Requirements ↔ APIs validation
      {
        id: 'REQ-API-001',
        name: 'API endpoints match requirements',
        description:
          'Each functional requirement should have corresponding API endpoints',
        type: 'requirement_api',
        severity: 'error' as const,
        enabled: true,
        rule: `
          function validate(prdContent, apiSpecContent) {
            const requirements = extractRequirements(prdContent)
            const endpoints = extractAPIEndpoints(apiSpecContent)
            
            const unmatched = requirements.filter(req =>
              !endpoints.some(endpoint =>
                endpoint.path.toLowerCase().includes(req.title.toLowerCase()) ||
                endpoint.description.toLowerCase().includes(req.title.toLowerCase()) ||
                matchRequirementToEndpoint(req, endpoint)
              )
            )
            
            const coverage = ((requirements.length - unmatched.length) / requirements.length) * 100
            
            return {
              passed: unmatched.length === 0,
              details: {
                total: requirements.length,
                matched: requirements.length - unmatched.length,
                unmatched: unmatched,
                coverage: Math.round(coverage)
              }
            }
          }
          
          function matchRequirementToEndpoint(req, endpoint) {
            const keywords = ['user', 'auth', 'login', 'register', 'data', 'create', 'read', 'update', 'delete', 'list', 'get']
            return keywords.some(keyword =>
              req.title.toLowerCase().includes(keyword) &&
              endpoint.path.toLowerCase().includes(keyword)
            )
          }
        `,
      },

      // Requirements ↔ Data model validation
      {
        id: 'REQ-DATA-001',
        name: 'Data model covers all requirements',
        description: 'Data entities should cover all functional requirements',
        type: 'requirement_data',
        severity: 'error' as const,
        enabled: true,
        rule: `
          function validate(prdContent, dataModelContent) {
            const requirements = extractRequirements(prdContent)
            const entities = extractDataEntities(dataModelContent)
            
            const dataRelated = requirements.filter(req =>
              ['data', 'entity', 'store', 'database', 'information', 'user', 'profile', 'account'].some(keyword =>
                req.description.toLowerCase().includes(keyword)
              )
            )
            
            const entityCoverage = entities.length >= Math.ceil(dataRelated.length / 3)
            
            return {
              passed: entityCoverage,
              details: {
                dataRelatedRequirements: dataRelated.length,
                entities: entities.length,
                entitiesList: entities,
                coverage: entityCoverage ? 'sufficient' : 'insufficient'
              }
            }
          }
        `,
      },

      // Requirements ↔ Tasks validation
      {
        id: 'REQ-TASK-001',
        name: 'Tasks cover all requirements',
        description:
          'Each requirement should have corresponding development tasks',
        type: 'requirement_task',
        severity: 'warning' as const,
        enabled: true,
        rule: `
          function validate(prdContent, tasksContent) {
            const requirements = extractRequirements(prdContent)
            const tasks = extractTasks(tasksContent)
            
            const unmatched = requirements.filter(req =>
              !tasks.some(task =>
                task.description.toLowerCase().includes(req.title.toLowerCase()) ||
                req.title.toLowerCase().includes(task.description.toLowerCase()) ||
                task.title.toLowerCase().includes(req.title.toLowerCase())
              )
            )
            
            const taskCoverage = ((requirements.length - unmatched.length) / requirements.length) * 100
            
            return {
              passed: unmatched.length <= requirements.length * 0.2, // Allow 20% missing tasks
              details: {
                total: requirements.length,
                covered: requirements.length - unmatched.length,
                missing: unmatched,
                coverage: Math.round(taskCoverage)
              }
            }
          }
        `,
      },

      // Stack ↔ Dependencies validation
      {
        id: 'STACK-DEP-001',
        name: 'Dependencies match stack requirements',
        description: 'All dependencies should be justified by the chosen stack',
        type: 'stack_dependency',
        severity: 'warning' as const,
        enabled: true,
        rule: `
          function validate(stackProposal, dependenciesContent) {
            const stack = extractStack(stackProposal)
            const dependencies = extractDependencies(dependenciesContent)
            
            const requiredDependencies = [
              { name: 'next', category: 'framework' },
              { name: 'react', category: 'ui' },
              { name: 'typescript', category: 'language' },
              { name: 'tailwind', category: 'styling' }
            ]
            
            const missingCore = requiredDependencies.filter(reqDep =>
              !dependencies.some(dep =>
                dep.name.toLowerCase().includes(reqDep.name)
              )
            )
            
            return {
              passed: missingCore.length === 0,
              details: {
                stack: stack,
                dependencies: dependencies.length,
                missing: missingCore,
                analysis: missingCore.length > 0 ? 'Missing core dependencies' : 'All core dependencies present'
              }
            }
          }
        `,
      },

      // Cross-artifact consistency validation
      {
        id: 'CROSS-ARTIFACT-001',
        name: 'Artifact consistency check',
        description: 'Verify consistency across all generated artifacts',
        type: 'requirement_api',
        severity: 'error' as const,
        enabled: true,
        rule: `
          function validate(artifacts) {
            const issues = []
            
            // Check for consistent terminology
            const terms = ['user', 'authentication', 'data', 'api', 'database']
            const inconsistent = []
            
            terms.forEach(term => {
              const mentions = Object.entries(artifacts).filter(([name, content]) =>
                content.toLowerCase().includes(term)
              ).map(([name]) => name)
              
              if (mentions.length > 0 && mentions.length < Object.keys(artifacts).length) {
                inconsistent.push({
                  term,
                  mentionedIn: mentions,
                  missingIn: Object.keys(artifacts).filter(name => !mentions.includes(name))
                })
              }
            })
            
            return {
              passed: inconsistent.length === 0,
              details: {
                totalArtifacts: Object.keys(artifacts).length,
                consistencyIssues: inconsistent,
                summary: inconsistent.length > 0 ? 'Inconsistent terminology across artifacts' : 'All artifacts are consistent'
              }
            }
          }
        `,
      },
    ];

    // Only add default rules if database rules are empty
    if (this.rules.length === 0) {
      this.rules = defaultRules;
    }
  }

  // Enhanced extract requirements from PRD content
  private extractRequirements(content: string) {
    const requirements: Array<{
      id: string;
      title: string;
      description: string;
      category?: string;
    }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.match(/^REQ-[A-Z]+-\d+/)) {
        const match = line.match(/^REQ-[A-Z]+-\d+:\s*(.+)/);
        const idMatch = line.match(/^(REQ-[A-Z]+-\d+)/);
        if (match && idMatch) {
          requirements.push({
            id: idMatch[1],
            title: match[1].trim(),
            description: line,
            category: this.categorizeRequirement(match[1].trim()),
          });
        }
      }
    }

    return requirements;
  }

  private categorizeRequirement(title: string): string {
    const categories = {
      authentication: ['auth', 'login', 'register', 'signin', 'password'],
      data: ['data', 'store', 'database', 'entity', 'model'],
      ui: ['interface', 'ui', 'design', 'layout', 'component'],
      api: ['api', 'endpoint', 'service', 'integration'],
      security: ['security', 'permission', 'access', 'role'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => title.toLowerCase().includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  // Enhanced API endpoint extraction
  private extractAPIEndpoints(content: string) {
    try {
      const spec = JSON.parse(content);
      const endpoints: Array<{
        path: string;
        method: string;
        description: string;
        category?: string;
      }> = [];

      if (spec.paths) {
        Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
          Object.entries(methods).forEach(
            ([method, details]: [string, any]) => {
              if (typeof details === 'object') {
                endpoints.push({
                  path,
                  method: method.toUpperCase(),
                  description: details.summary || details.description || '',
                  category: this.categorizeEndpoint(path, method),
                });
              }
            }
          );
        });
      }

      return endpoints;
    } catch {
      return [];
    }
  }

  private categorizeEndpoint(path: string, method: string): string {
    const pathCategories = {
      auth: ['auth', 'login', 'register', 'signin'],
      user: ['user', 'profile', 'account'],
      data: ['data', 'entity', 'record'],
      admin: ['admin', 'manage'],
    };

    for (const [category, keywords] of Object.entries(pathCategories)) {
      if (keywords.some((keyword) => path.toLowerCase().includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  // Enhanced data entities extraction
  private extractDataEntities(content: string) {
    const entities: Array<{
      name: string;
      description?: string;
      fields?: string[];
    }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.match(/^##?\s*\w+\s*Table|^#\s*\w+\s*Entity|^\w+\s*\{/)) {
        const match = line.match(/###?\s*(\w+)/);
        if (match) {
          entities.push({
            name: match[1],
            description: line.trim(),
            fields: this.extractFields(content, match[1]),
          });
        }
      }
    }

    return entities;
  }

  private extractFields(content: string, entityName: string): string[] {
    const fields: string[] = [];
    const lines = content.split('\n');
    let inEntitySection = false;

    for (const line of lines) {
      if (
        line.includes(entityName) &&
        (line.includes('Table') || line.includes('Entity'))
      ) {
        inEntitySection = true;
        continue;
      }

      if (inEntitySection) {
        if (line.startsWith('#') && !line.includes(entityName)) {
          break;
        }

        const fieldMatch = line.match(/^\s*(\w+)\s*:?\s*(\w+)/);
        if (fieldMatch) {
          fields.push(fieldMatch[1]);
        }
      }
    }

    return fields;
  }

  // Enhanced tasks extraction
  private extractTasks(content: string) {
    const tasks: Array<{
      title: string;
      description: string;
      id?: string;
      complexity?: number;
    }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.match(/^-\s*\[|^\*\s*\d+\./)) {
        const task = line
          .replace(/^-\s*\[.*?\]\s*/, '')
          .replace(/^\*\s*\d+\.\s*/, '');
        const idMatch = line.match(/^-\s*\[(.*?)\]/);

        if (task.trim()) {
          tasks.push({
            title: task.trim(),
            description: task.trim(),
            id: idMatch ? idMatch[1] : undefined,
            complexity: this.estimateComplexity(task.trim()),
          });
        }
      }
    }

    return tasks;
  }

  private estimateComplexity(task: string): number {
    const complexityKeywords = {
      5: ['integration', 'authentication', 'security', 'performance'],
      4: ['database', 'api', 'component', 'service'],
      3: ['interface', 'form', 'validation', 'filter'],
      2: ['style', 'layout', 'config', 'setup'],
      1: ['simple', 'basic', 'minimal'],
    };

    for (const [level, keywords] of Object.entries(complexityKeywords)) {
      if (keywords.some((keyword) => task.toLowerCase().includes(keyword))) {
        return parseInt(level);
      }
    }

    return 3; // Default complexity
  }

  // Extract stack information
  private extractStack(content: string) {
    const stack: string[] = [];
    const techKeywords = [
      'Next.js',
      'React',
      'TypeScript',
      'Tailwind',
      'Neon',
      'Drizzle',
      'PostgreSQL',
    ];

    techKeywords.forEach((tech) => {
      if (content.toLowerCase().includes(tech.toLowerCase())) {
        stack.push(tech);
      }
    });

    return stack;
  }

  // Extract dependencies
  private extractDependencies(content: string) {
    const dependencies: Array<{
      name: string;
      version?: string;
      category?: string;
    }> = [];

    // Package.json format
    const packageJsonMatch = content.match(/"dependencies":\s*{([^}]+)}/);
    if (packageJsonMatch) {
      const deps = packageJsonMatch[1].match(/"([^"]+)":\s*"([^"]+)"/g);
      if (deps) {
        deps.forEach((dep) => {
          const match = dep.match(/"([^"]+)":\s*"([^"]+)"/);
          if (match) {
            dependencies.push({
              name: match[1],
              version: match[2],
              category: this.categorizeDependency(match[1]),
            });
          }
        });
      }
    }

    // Markdown format
    const mdDeps = content.match(/[a-z-]+@[0-9.]+/g);
    if (mdDeps) {
      mdDeps.forEach((dep) => {
        const [name, version] = dep.split('@');
        dependencies.push({
          name,
          version,
          category: this.categorizeDependency(name),
        });
      });
    }

    return dependencies;
  }

  private categorizeDependency(name: string): string {
    const categories = {
      framework: ['next', 'react', 'vue', 'angular'],
      database: ['drizzle', 'prisma', 'mongoose', 'sequelize'],
      styling: ['tailwind', 'styled-components', 'emotion'],
      auth: ['next-auth', 'auth0', 'clerk'],
      build: ['typescript', 'eslint', 'prettier', 'vite'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => name.toLowerCase().includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  // Main validation method
  async validateArtifacts(
    projectId: string,
    phase: string,
    artifacts: Record<string, ArtifactContent>
  ): Promise<ValidationReport> {
    const results: ValidationResult[] = [];

    // Prepare artifact content map
    const artifactContentMap: Record<string, string> = {};
    Object.entries(artifacts).forEach(([key, artifact]) => {
      artifactContentMap[artifact.name] = artifact.content;
    });

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        const validationResult = await this.runValidationRule(
          rule,
          artifactContentMap
        );

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          passed: validationResult.passed,
          severity: rule.severity,
          message: validationResult.passed
            ? `✅ ${rule.name} passed`
            : `❌ ${rule.name} failed`,
          details: validationResult.details,
          affectedArtifacts: this.getAffectedArtifacts(
            rule.type,
            artifactContentMap
          ),
          affectedRequirements: this.getAffectedRequirements(
            rule.type,
            artifactContentMap
          ),
        });
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          passed: false,
          severity: 'error',
          message: `Rule ${rule.name} failed to execute: ${error}`,
        });
      }
    }

    // Calculate report statistics
    const passedRules = results.filter((r) => r.passed).length;
    const failedRules = results.filter(
      (r) => !r.passed && r.severity === 'error'
    ).length;
    const warningRules = results.filter(
      (r) => !r.passed && r.severity === 'warning'
    ).length;
    const overallStatus =
      failedRules > 0 ? 'fail' : warningRules > 0 ? 'warning' : 'pass';

    const report: ValidationReport = {
      projectId,
      phase,
      reportName: `Validation Report - ${phase}`,
      overallStatus,
      totalRules: results.length,
      passedRules,
      failedRules,
      warningRules,
      validationResults: results,
      reportMetadata: {
        validatedAt: new Date().toISOString(),
        artifactsValidated: Object.keys(artifacts).length,
        validationEngine: 'Cross-Artifact Validation v1.0',
      },
    };

    // Save to database
    await this.saveValidationReport(report);

    return report;
  }

  private async runValidationRule(
    rule: ValidationRule,
    artifacts: Record<string, string>
  ) {
    // Create validation context
    const context = {
      prdContent: artifacts['PRD.md'] || artifacts['prd.md'] || '',
      apiSpecContent:
        artifacts['api-spec.json'] || artifacts['api_spec.json'] || '',
      dataModelContent:
        artifacts['data-model.md'] || artifacts['data_model.md'] || '',
      tasksContent: artifacts['tasks.md'] || artifacts['tasks.md'] || '',
      stackProposal:
        artifacts['stack-proposal.md'] || artifacts['stack_proposal.md'] || '',
      dependenciesContent:
        artifacts['DEPENDENCIES.md'] || artifacts['dependencies.md'] || '',
      artifacts: artifacts,
    };

    // Execute validation rule
    const validationFunction = new Function(
      'context',
      `
      ${rule.rule}
      return validate(context.prdContent, context.apiSpecContent, context.dataModelContent,
                     context.tasksContent, context.stackProposal, context.dependenciesContent, context.artifacts)
    `
    );

    return await validationFunction(context);
  }

  private getAffectedArtifacts(
    ruleType: string,
    artifacts: Record<string, string>
  ): string[] {
    const artifactMapping = {
      requirement_api: ['PRD.md', 'api-spec.json'],
      requirement_data: ['PRD.md', 'data-model.md'],
      requirement_task: ['PRD.md', 'tasks.md'],
      stack_dependency: ['stack-proposal.md', 'DEPENDENCIES.md'],
    };

    return (
      artifactMapping[ruleType as keyof typeof artifactMapping]?.filter(
        (artifact) => artifacts[artifact] && artifacts[artifact].length > 0
      ) || []
    );
  }

  private getAffectedRequirements(
    ruleType: string,
    artifacts: Record<string, string>
  ): string[] {
    // Extract requirement IDs from PRD content
    const prdContent = artifacts['PRD.md'] || artifacts['prd.md'] || '';
    const requirements = this.extractRequirements(prdContent);

    return requirements.map((req) => req.id);
  }

  private async saveValidationReport(report: ValidationReport) {
    try {
      await db.insert(validationReports).values({
        projectId: report.projectId,
        phase: report.phase,
        reportName: report.reportName,
        overallStatus: report.overallStatus,
        totalRules: report.totalRules,
        passedRules: report.passedRules,
        failedRules: report.failedRules,
        warningRules: report.warningRules,
        validationResults: report.validationResults,
        reportMetadata: report.reportMetadata,
      });
    } catch (error) {
      console.error('Failed to save validation report:', error);
    }
  }

  // Database operations
  async loadRulesFromDatabase() {
    try {
      const dbRules = await db
        .select()
        .from(validationRules)
        .where(eq(validationRules.enabled, true));
      this.rules = dbRules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        type: rule.type as any,
        severity: rule.severity as any,
        enabled: rule.enabled,
        rule: rule.rule,
      }));
    } catch (error) {
      console.warn('Failed to load validation rules from database:', error);
    }
  }

  async saveRulesToDatabase() {
    try {
      // Clear existing rules
      await db.delete(validationRules);

      // Insert current rules
      for (const rule of this.rules) {
        await db.insert(validationRules).values({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          type: rule.type,
          severity: rule.severity,
          enabled: rule.enabled,
          rule: rule.rule,
        });
      }
    } catch (error) {
      console.error('Failed to save validation rules to database:', error);
    }
  }

  // Add custom rule
  addRule(rule: ValidationRule) {
    this.rules.push(rule);
  }

  // Get all rules
  getRules(): ValidationRule[] {
    return [...this.rules];
  }

  // Enable/disable rule
  setRuleEnabled(ruleId: string, enabled: boolean) {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  // Get validation history for a project
  async getValidationHistory(projectId: string, limit: number = 10) {
    try {
      const reports = await db
        .select()
        .from(validationReports)
        .where(eq(validationReports.projectId, projectId))
        .orderBy(validationReports.createdAt)
        .limit(limit);

      return reports.reverse(); // Most recent first
    } catch (error) {
      console.error('Failed to get validation history:', error);
      return [];
    }
  }

  // Get validation report by ID
  async getValidationReport(reportId: string) {
    try {
      const [report] = await db
        .select()
        .from(validationReports)
        .where(eq(validationReports.id, reportId));

      return report;
    } catch (error) {
      console.error('Failed to get validation report:', error);
      return null;
    }
  }
}

// Singleton instance
export const validationEngine = new ValidationEngine();
