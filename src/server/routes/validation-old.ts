import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  validationRules,
  validationReports,
  projectArtifacts,
} from '@/db/schema';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  validationEngine,
  type ValidationReport,
  type ValidationRule,
} from '@/lib/validation';

const router = Router();

// Validation schemas
const RunValidationSchema = z.object({
  projectId: z.string().uuid(),
  phase: z.string(),
  artifactIds: z.array(z.string().uuid()).optional(),
});

const UpdateRuleSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  severity: z.enum(['error', 'warning', 'info']).optional(),
});

// GET /api/validation/rules - Get all validation rules
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const rules = validationEngine.getRules();
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Error fetching validation rules:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch validation rules' });
  }
});

// POST /api/validation/rules - Create new validation rule
router.post('/rules', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = ValidationRuleSchema.parse(req.body);

    // Add to engine
    validationEngine.addRule(validatedData);

    // Save to database
    await db.insert(validationRules).values({
      id: validatedData.id,
      name: validatedData.name,
      description: validatedData.description,
      type: validatedData.type,
      severity: validatedData.severity,
      enabled: validatedData.enabled,
      rule: validatedData.rule,
    });

    res.status(201).json({ success: true, data: validatedData });
  } catch (error) {
    console.error('Error creating validation rule:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to create validation rule' });
  }
});

// PATCH /api/validation/rules/:id - Update validation rule
router.patch('/rules/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = UpdateRuleSchema.parse(req.body);

    // Update in engine
    if (validatedData.enabled !== undefined) {
      validationEngine.setRuleEnabled(id, validatedData.enabled);
    }

    // Update in database
    const updateData: any = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description)
      updateData.description = validatedData.description;
    if (validatedData.enabled !== undefined)
      updateData.enabled = validatedData.enabled;
    if (validatedData.severity) updateData.severity = validatedData.severity;

    await db
      .update(validationRules)
      .set(updateData)
      .where(eq(validationRules.id, id));

    res.json({ success: true, message: 'Rule updated successfully' });
  } catch (error) {
    console.error('Error updating validation rule:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to update validation rule' });
  }
});

// DELETE /api/validation/rules/:id - Delete validation rule
router.delete(
  '/rules/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Disable in engine
      validationEngine.setRuleEnabled(id, false);

      // Remove from database
      await db.delete(validationRules).where(eq(validationRules.id, id));

      res.json({ success: true, message: 'Rule deleted successfully' });
    } catch (error) {
      console.error('Error deleting validation rule:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to delete validation rule' });
    }
  }
);

// POST /api/validation/run - Run validation on project artifacts
router.post('/run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = RunValidationSchema.parse(req.body);
    const { projectId, phase, artifactIds } = validatedData;

    // Get project artifacts
    let artifactQuery = db
      .select()
      .from(projectArtifacts)
      .where(eq(projectArtifacts.projectId, projectId));

    if (artifactIds) {
      artifactQuery = artifactQuery.where(
        eq(projectArtifacts.id, artifactIds[0])
      );
    } else {
      artifactQuery = artifactQuery.where(eq(projectArtifacts.phase, phase));
    }

    const artifacts = await artifactQuery;

    if (artifacts.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: 'No artifacts found for validation' });
    }

    // Convert artifacts to the format expected by validation engine
    const artifactMap: Record<
      string,
      { id: string; name: string; content: string; phase: string; type: string }
    > = {};

    artifacts.forEach((artifact) => {
      const artifactName = getArtifactFileName(artifact.artifactName);
      artifactMap[artifactName] = {
        id: artifact.id,
        name: artifact.artifactName,
        content: artifact.content || '',
        phase: artifact.phase,
        type: getArtifactType(artifact.artifactName),
      };
    });

    // Run validation
    const report = await validationEngine.validateArtifacts(
      projectId,
      phase,
      artifactMap
    );

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error running validation:', error);
    res.status(500).json({ success: false, error: 'Failed to run validation' });
  }
});

// Helper function to map artifact names to file names
function getArtifactFileName(artifactName: string): string {
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
    Dependencies: 'DEPENDENCIES.md',
  };

  return mapping[artifactName] || artifactName;
}

// Helper function to get artifact type
function getArtifactType(artifactName: string): string {
  if (artifactName.includes('PRD') || artifactName.includes('Requirements'))
    return 'requirements';
  if (artifactName.includes('API') || artifactName.includes('spec'))
    return 'api';
  if (artifactName.includes('data') || artifactName.includes('model'))
    return 'data';
  if (artifactName.includes('task')) return 'tasks';
  if (artifactName.includes('stack')) return 'stack';
  if (artifactName.includes('dependency')) return 'dependencies';
  return 'general';
}
// GET /api/validation/reports/:projectId - Get validation reports for a project
router.get('/reports/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { limit } = req.query;

    const reports = await validationEngine.getValidationHistory(
      projectId,
      limit ? parseInt(limit as string) : 10
    );

    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Error fetching validation reports:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch validation reports' });
  }
});

// GET /api/validation/reports/:reportId - Get specific validation report
router.get('/reports/report/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;

    const report = await validationEngine.getValidationReport(reportId);

    if (!report) {
      return res
        .status(404)
        .json({ success: false, error: 'Validation report not found' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error fetching validation report:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch validation report' });
  }
});

// GET /api/validation/dashboard/:projectId - Get validation dashboard data
router.get('/dashboard/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Get recent validation history
    const recentReports = await validationEngine.getValidationHistory(
      projectId,
      5
    );

    // Calculate dashboard metrics
    const metrics = {
      totalValidations: recentReports.length,
      passedValidations: recentReports.filter((r) => r.overallStatus === 'pass')
        .length,
      failedValidations: recentReports.filter((r) => r.overallStatus === 'fail')
        .length,
      warningValidations: recentReports.filter(
        (r) => r.overallStatus === 'warning'
      ).length,
      lastValidation:
        recentReports.length > 0 ? recentReports[0].createdAt : null,
      trend: calculateTrend(recentReports),
    };

    // Get rule statistics
    const rules = validationEngine.getRules();
    const ruleStats = {
      total: rules.length,
      enabled: rules.filter((r) => r.enabled).length,
      byType: {
        requirement_api: rules.filter((r) => r.type === 'requirement_api')
          .length,
        requirement_data: rules.filter((r) => r.type === 'requirement_data')
          .length,
        requirement_task: rules.filter((r) => r.type === 'requirement_task')
          .length,
        stack_dependency: rules.filter((r) => r.type === 'stack_dependency')
          .length,
      },
      bySeverity: {
        error: rules.filter((r) => r.severity === 'error').length,
        warning: rules.filter((r) => r.severity === 'warning').length,
        info: rules.filter((r) => r.severity === 'info').length,
      },
    };

    res.json({
      success: true,
      data: {
        metrics,
        ruleStats,
        recentReports: recentReports.slice(0, 3), // Latest 3 reports
      },
    });
  } catch (error) {
    console.error('Error fetching validation dashboard:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch validation dashboard' });
  }
});

// Helper function to calculate validation trend
function calculateTrend(reports: any[]): 'improving' | 'declining' | 'stable' {
  if (reports.length < 2) return 'stable';

  const recent = reports.slice(0, 2);
  const passRate = recent.map((r) => r.passedRules / r.totalRules);

  if (passRate[0] > passRate[1]) return 'improving';
  if (passRate[0] < passRate[1]) return 'declining';
  return 'stable';
}

// POST /api/validation/auto-run - Auto-run validation when artifacts are updated
router.post('/auto-run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, phase } = req.body;

    if (!projectId || !phase) {
      return res
        .status(400)
        .json({ success: false, error: 'projectId and phase are required' });
    }

    // Get all artifacts for the phase
    const artifacts = await db
      .select()
      .from(projectArtifacts)
      .where(eq(projectArtifacts.projectId, projectId));

    // Filter by phase
    const phaseArtifacts = artifacts.filter((a) => a.phase === phase);

    if (phaseArtifacts.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          error: 'No artifacts found for auto-validation',
        });
    }

    // Convert to validation format
    const artifactMap: Record<
      string,
      { id: string; name: string; content: string; phase: string; type: string }
    > = {};

    phaseArtifacts.forEach((artifact) => {
      const artifactName = getArtifactFileName(artifact.artifactName);
      artifactMap[artifactName] = {
        id: artifact.id,
        name: artifact.artifactName,
        content: artifact.content || '',
        phase: artifact.phase,
        type: getArtifactType(artifact.artifactName),
      };
    });

    // Run validation
    const report = await validationEngine.validateArtifacts(
      projectId,
      phase,
      artifactMap
    );

    // Update artifact validation status
    for (const artifact of phaseArtifacts) {
      const hasErrors = report.validationResults.some(
        (result) =>
          !result.passed &&
          result.affectedArtifacts?.includes(artifact.artifactName)
      );

      await db
        .update(projectArtifacts)
        .set({
          validationStatus: hasErrors ? 'fail' : 'pass',
          validationErrors: hasErrors
            ? JSON.stringify(report.validationResults.filter((r) => !r.passed))
            : null,
        })
        .where(eq(projectArtifacts.id, artifact.id));
    }

    res.json({
      success: true,
      data: report,
      message: `Auto-validation completed for ${phase} phase`,
    });
  } catch (error) {
    console.error('Error running auto-validation:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to run auto-validation' });
  }
});

export { router as validationRouter };
