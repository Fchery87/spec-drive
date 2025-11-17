import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { projects, projectArtifacts } from '@/db/schema';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  idea: z.string().min(1),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  idea: z.string().min(1).optional(),
});

// GET /api/projects - List all projects for authenticated user
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, req.user.id));
    res.json({ success: true, data: userProjects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { id } = req.params;
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, req.user.id)))
      .limit(1);

    if (!project) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

// POST /api/projects - Create new project
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const validatedData = CreateProjectSchema.parse(req.body);

    const projectData = {
      id: uuidv4(),
      userId: req.user.id,
      slug: validatedData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      ...validatedData,
      currentPhase: 'analysis' as const,
      phasesCompleted: [],
      stackApproved: false,
      dependenciesApproved: false,
      orchestrationState: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [newProject] = await db
      .insert(projects)
      .values(projectData)
      .returning();

    res.status(201).json({ success: true, data: newProject });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

// PATCH /api/projects/:id - Update project
router.patch('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { id } = req.params;
    const validatedData = UpdateProjectSchema.parse(req.body);

    const [updatedProject] = await db
      .update(projects)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.userId, req.user.id)))
      .returning();

    if (!updatedProject) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { id } = req.params;

    // Verify project belongs to user
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, req.user.id)))
      .limit(1);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // First delete associated artifacts
    await db.delete(projectArtifacts).where(eq(projectArtifacts.projectId, id));

    // Then delete the project
    const [deletedProject] = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();

    if (!deletedProject) {
      return res
        .status(404)
        .json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

// POST /api/projects/:id/stack/approve - Approve stack
router.post(
  '/:id/stack/approve',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { id } = req.params;

      const [updatedProject] = await db
        .update(projects)
        .set({
          stackApproved: true,
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, id), eq(projects.userId, req.user.id)))
        .returning();

      if (!updatedProject) {
        return res
          .status(404)
          .json({ success: false, error: 'Project not found' });
      }

      res.json({ success: true, data: updatedProject });
    } catch (error) {
      console.error('Error approving stack:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to approve stack' });
    }
  }
);

// POST /api/projects/:id/dependencies/approve - Approve dependencies
router.post(
  '/:id/dependencies/approve',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { id } = req.params;

      const [updatedProject] = await db
        .update(projects)
        .set({
          dependenciesApproved: true,
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, id), eq(projects.userId, req.user.id)))
        .returning();

      if (!updatedProject) {
        return res
          .status(404)
          .json({ success: false, error: 'Project not found' });
      }

      res.json({ success: true, data: updatedProject });
    } catch (error) {
      console.error('Error approving dependencies:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to approve dependencies' });
    }
  }
);

export { router as projectsRouter };
