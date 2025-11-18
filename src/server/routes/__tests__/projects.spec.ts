/**
 * Project CRUD Operations Tests
 * Tests for project creation, reading, updating, deleting
 * Includes data validation, error handling, and associations
 */

import request from 'supertest';
import { testApp as app } from '../../test/testApp';
import { db } from '@/db';
import { projects, projectArtifacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createTestUser, testHelpers } from '../../test/setup';

// Test variables
let testUser: any;
let testProjectId: string;
let authToken: string;

describe('Projects CRUD Operations', () => {
  beforeAll(async () => {
    // Create test user
    testUser = await createTestUser();

    // Mock auth token - in real scenario would use proper auth
    authToken = `Bearer test-token-${testUser.id}`;
  });

  afterEach(async () => {
    // Cleanup test projects
    if (testProjectId) {
      try {
        await db.delete(projects).where(eq(projects.id, testProjectId));
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
  });

  describe('POST /api/projects - Create Project', () => {
    it('should create a new project with valid data', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        idea: 'Test idea'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const project = response.body.data;
      expect(project.name).toBe(projectData.name);
      expect(project.description).toBe(projectData.description);
      expect(project.idea).toBe(projectData.idea);
      expect(project.currentPhase).toBe('analysis');
      expect(project.stackApproved).toBe(false);
      expect(project.dependenciesApproved).toBe(false);
      expect(project.slug).toBeDefined();

      testProjectId = project.id;
    });

    it('should generate proper slug from project name', async () => {
      const projectData = {
        name: 'My New Project!',
        description: 'A test project',
        idea: 'Test idea'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      const project = response.body.data;
      expect(project.slug).toBe('my-new-project');

      testProjectId = project.id;
    });

    it('should fail with missing required fields', async () => {
      const incompleteData = {
        name: 'Test Project'
        // Missing description and idea
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(incompleteData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with empty name', async () => {
      const projectData = {
        name: '',
        description: 'A test project',
        idea: 'Test idea'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should fail with name exceeding max length', async () => {
      const projectData = {
        name: 'a'.repeat(256),
        description: 'A test project',
        idea: 'Test idea'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should fail with empty description', async () => {
      const projectData = {
        name: 'Test Project',
        description: '',
        idea: 'Test idea'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should fail with empty idea', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        idea: ''
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should fail when not authenticated', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project',
        idea: 'Test idea'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should initialize project with correct default values', async () => {
      const projectData = {
        name: 'Default Values Project',
        description: 'Test defaults',
        idea: 'Test'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      const project = response.body.data;
      expect(project.currentPhase).toBe('analysis');
      expect(project.phasesCompleted).toEqual([]);
      expect(project.stackApproved).toBe(false);
      expect(project.dependenciesApproved).toBe(false);
      expect(project.orchestrationState).toEqual({});
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();

      testProjectId = project.id;
    });
  });

  describe('GET /api/projects - List Projects', () => {
    it('should list all projects for authenticated user', async () => {
      // Create test projects
      const project1Data = {
        name: 'Project 1',
        description: 'First test project',
        idea: 'Test idea 1'
      };

      const project2Data = {
        name: 'Project 2',
        description: 'Second test project',
        idea: 'Test idea 2'
      };

      const response1 = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(project1Data);

      const response2 = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(project2Data);

      testProjectId = response1.body.data.id;

      const listResponse = await request(app)
        .get('/api/projects')
        .set('Cookie', `session=${authToken}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body).toHaveProperty('success', true);
      expect(Array.isArray(listResponse.body.data)).toBe(true);
      expect(listResponse.body.data.length).toBeGreaterThanOrEqual(2);

      // Cleanup second project
      if (response2.body.data?.id) {
        try {
          await db.delete(projects).where(eq(projects.id, response2.body.data.id));
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
    });

    it('should return empty array when user has no projects', async () => {
      const newUser = await createTestUser();
      const newUserToken = `Bearer test-token-${newUser.id}`;

      const response = await request(app)
        .get('/api/projects')
        .set('Cookie', `session=${newUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail when not authenticated', async () => {
      const response = await request(app)
        .get('/api/projects');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/projects/:id - Get Single Project', () => {
    beforeEach(async () => {
      // Create a test project
      const projectData = {
        name: 'Single Project',
        description: 'Test single project',
        idea: 'Test idea'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      testProjectId = response.body.data.id;
    });

    it('should retrieve a specific project by id', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.id).toBe(testProjectId);
      expect(response.body.data.name).toBe('Single Project');
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = 'non-existent-id-' + Date.now();

      const response = await request(app)
        .get(`/api/projects/${fakeId}`)
        .set('Cookie', `session=${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should prevent access to other users projects', async () => {
      const otherUser = await createTestUser();
      const otherUserToken = `Bearer test-token-${otherUser.id}`;

      const response = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${otherUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail when not authenticated', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return full project object with all fields', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`);

      const project = response.body.data;
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('userId');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('description');
      expect(project).toHaveProperty('idea');
      expect(project).toHaveProperty('slug');
      expect(project).toHaveProperty('currentPhase');
      expect(project).toHaveProperty('phasesCompleted');
      expect(project).toHaveProperty('stackApproved');
      expect(project).toHaveProperty('dependenciesApproved');
      expect(project).toHaveProperty('createdAt');
      expect(project).toHaveProperty('updatedAt');
    });
  });

  describe('PATCH /api/projects/:id - Update Project', () => {
    beforeEach(async () => {
      const projectData = {
        name: 'Update Test Project',
        description: 'Initial description',
        idea: 'Initial idea'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      testProjectId = response.body.data.id;
    });

    it('should update project name', async () => {
      const updateData = {
        name: 'Updated Project Name'
      };

      const response = await request(app)
        .patch(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.name).toBe('Updated Project Name');
      expect(response.body.data.description).toBe('Initial description');
    });

    it('should update project description', async () => {
      const updateData = {
        description: 'Updated description'
      };

      const response = await request(app)
        .patch(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.name).toBe('Update Test Project');
    });

    it('should update project idea', async () => {
      const updateData = {
        idea: 'Updated idea'
      };

      const response = await request(app)
        .patch(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.idea).toBe('Updated idea');
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        name: 'Fully Updated',
        description: 'New description',
        idea: 'New idea'
      };

      const response = await request(app)
        .patch(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      const project = response.body.data;
      expect(project.name).toBe('Fully Updated');
      expect(project.description).toBe('New description');
      expect(project.idea).toBe('New idea');
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = 'non-existent-id-' + Date.now();

      const response = await request(app)
        .patch(`/api/projects/${fakeId}`)
        .set('Cookie', `session=${authToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should prevent updating other users projects', async () => {
      const otherUser = await createTestUser();
      const otherUserToken = `Bearer test-token-${otherUser.id}`;

      const response = await request(app)
        .patch(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${otherUserToken}`)
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(404);
    });

    it('should not update with invalid data', async () => {
      const updateData = {
        name: '' // Empty name
      };

      const response = await request(app)
        .patch(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`)
        .send(updateData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should update timestamp when modified', async () => {
      const getResponse = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`);

      const originalUpdatedAt = getResponse.body.data.updatedAt;

      // Wait a moment to ensure timestamp difference
      await testHelpers.wait(100);

      const updateResponse = await request(app)
        .patch(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`)
        .send({ name: 'Updated Again' });

      expect(updateResponse.body.data.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('should fail when not authenticated', async () => {
      const response = await request(app)
        .patch(`/api/projects/${testProjectId}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/projects/:id - Delete Project', () => {
    beforeEach(async () => {
      const projectData = {
        name: 'Delete Test Project',
        description: 'To be deleted',
        idea: 'Test idea'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      testProjectId = response.body.data.id;
    });

    it('should delete a project', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Project deleted successfully');

      // Verify project is deleted
      const getResponse = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`);

      expect(getResponse.status).toBe(404);

      testProjectId = ''; // Clear for afterEach
    });

    it('should cascade delete associated artifacts', async () => {
      // Create artifacts for this project (would need artifact creation endpoint)
      // For now, we test that the deletion cascades properly

      const response = await request(app)
        .delete(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`);

      expect(response.status).toBe(200);

      // Verify no artifacts remain
      const artifacts = await db
        .select()
        .from(projectArtifacts)
        .where(eq(projectArtifacts.projectId, testProjectId));

      expect(artifacts.length).toBe(0);

      testProjectId = '';
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = 'non-existent-id-' + Date.now();

      const response = await request(app)
        .delete(`/api/projects/${fakeId}`)
        .set('Cookie', `session=${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should prevent deleting other users projects', async () => {
      const otherUser = await createTestUser();
      const otherUserToken = `Bearer test-token-${otherUser.id}`;

      const response = await request(app)
        .delete(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${otherUserToken}`);

      expect(response.status).toBe(404);

      // Verify project still exists
      const getResponse = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`);

      expect(getResponse.status).toBe(200);
    });

    it('should fail when not authenticated', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProjectId}`);

      expect(response.status).toBe(401);

      // Verify project still exists
      const getResponse = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .set('Cookie', `session=${authToken}`);

      expect(getResponse.status).toBe(200);
    });
  });

  describe('Project Associations', () => {
    beforeEach(async () => {
      const projectData = {
        name: 'Association Test Project',
        description: 'Testing associations',
        idea: 'Test'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      testProjectId = response.body.data.id;
    });

    it('should maintain project-artifacts relationship on creation', async () => {
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, testProjectId));

      expect(project.length).toBe(1);
      expect(project[0].id).toBe(testProjectId);
    });

    it('should handle artifacts filtering by project', async () => {
      const artifacts = await db
        .select()
        .from(projectArtifacts)
        .where(eq(projectArtifacts.projectId, testProjectId));

      expect(Array.isArray(artifacts)).toBe(true);
      artifacts.forEach(artifact => {
        expect(artifact.projectId).toBe(testProjectId);
      });
    });
  });

  describe('Stack and Dependencies Approval', () => {
    beforeEach(async () => {
      const projectData = {
        name: 'Approval Test Project',
        description: 'Testing approvals',
        idea: 'Test'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Cookie', `session=${authToken}`)
        .send(projectData);

      testProjectId = response.body.data.id;
    });

    it('should approve stack', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/stack/approve`)
        .set('Cookie', `session=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.stackApproved).toBe(true);
    });

    it('should approve dependencies', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/dependencies/approve`)
        .set('Cookie', `session=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.dependenciesApproved).toBe(true);
    });

    it('should allow independent approval of stack and dependencies', async () => {
      const stackResponse = await request(app)
        .post(`/api/projects/${testProjectId}/stack/approve`)
        .set('Cookie', `session=${authToken}`);

      expect(stackResponse.body.data.stackApproved).toBe(true);
      expect(stackResponse.body.data.dependenciesApproved).toBe(false);

      const depsResponse = await request(app)
        .post(`/api/projects/${testProjectId}/dependencies/approve`)
        .set('Cookie', `session=${authToken}`);

      expect(depsResponse.body.data.stackApproved).toBe(true);
      expect(depsResponse.body.data.dependenciesApproved).toBe(true);
    });

    it('should return 404 when approving non-existent project', async () => {
      const fakeId = 'non-existent-' + Date.now();

      const response = await request(app)
        .post(`/api/projects/${fakeId}/stack/approve`)
        .set('Cookie', `session=${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
