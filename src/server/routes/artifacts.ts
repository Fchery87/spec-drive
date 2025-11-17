import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { projects, projectArtifacts } from '@/db/schema';
import JSZip from 'jszip';

const router = Router();

// GET /api/projects/:id/artifacts - Get project artifacts
router.get('/projects/:id/artifacts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { phase } = req.query;

    let query = db
      .select()
      .from(projectArtifacts)
      .where(eq(projectArtifacts.projectId, id));

    if (phase) {
      query = db
        .select()
        .from(projectArtifacts)
        .where(
          eq(projectArtifacts.projectId, id) &&
            eq(projectArtifacts.phase, phase as string)
        );
    }

    const artifacts = await query;

    res.json({ success: true, data: artifacts });
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to fetch artifacts' });
  }
});

// GET /api/projects/:id/download - Download project as ZIP
router.get('/projects/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get project data
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    // Get project artifacts
    const artifacts = await db
      .select()
      .from(projectArtifacts)
      .where(eq(projectArtifacts.projectId, id));

    // Create ZIP file
    const zip = new JSZip();

    // Add project metadata
    zip.file('project.json', JSON.stringify(project, null, 2));

    // Add artifacts
    for (const artifact of artifacts) {
      const content = `# ${artifact.artifactName}\n\nGenerated: ${artifact.createdAt}\nPhase: ${artifact.phase}\nValidation: ${artifact.validationStatus}\n\n[Content would go here]`;
      zip.file(`artifacts/${artifact.phase}/${artifact.artifactName}`, content);
    }

    // Add README
    const readme = `# ${project.name}\n\n${
      project.description
    }\n\nThis project was generated using Spec-Driven Orchestrator.\n\n## Project Structure\n- Artifacts generated during orchestration\n- Phase-by-phase development artifacts\n- Traceability and validation results\n\n## Phases Completed\n${
      Array.isArray(project.phasesCompleted)
        ? project.phasesCompleted.join(', ')
        : 'None'
    }\n`;
    zip.file('README.md', readme);

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${project.slug}-project.zip"`
    );
    res.send(zipContent);
  } catch (error) {
    console.error('Error generating download:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to generate download' });
  }
});

export { router as artifactsRouter };
