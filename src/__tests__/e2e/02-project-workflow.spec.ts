import { test, expect } from '@playwright/test';

/**
 * E2E Test: Project Workflow
 * Tests project creation, artifact upload, and validation execution
 */

test.describe('Project Workflow', () => {
  const testUser = {
    email: `project-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Project Test User',
  };

  const testProject = {
    name: 'E2E Test Project',
    description: 'A test project for E2E testing',
    idea: 'Test idea for the project',
  };

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/signup');
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', `${Date.now()}-${Math.random()}@example.com`);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard|projects/, { timeout: 10000 });
  });

  test('should create a new project', async ({ page }) => {
    // 1. Click on create project button
    await page.click('text=New Project, text=Create Project');

    // 2. Fill out project form
    await page.fill('input[name="name"]', testProject.name);
    await page.fill('textarea[name="description"], input[name="description"]', testProject.description);
    await page.fill('textarea[name="idea"], input[name="idea"]', testProject.idea);

    // 3. Submit form
    await page.click('button[type="submit"]');

    // 4. Should show project in list or redirect to project page
    await expect(page.locator(`text=${testProject.name}`)).toBeVisible({ timeout: 5000 });
  });

  test('should view project details', async ({ page }) => {
    // Create a project first
    await page.click('text=New Project, text=Create Project');
    await page.fill('input[name="name"]', testProject.name);
    await page.fill('textarea[name="description"], input[name="description"]', testProject.description);
    await page.fill('textarea[name="idea"], input[name="idea"]', testProject.idea);
    await page.click('button[type="submit"]');

    // Wait for project to appear
    await page.waitForSelector(`text=${testProject.name}`, { timeout: 5000 });

    // Click on project to view details
    await page.click(`text=${testProject.name}`);

    // Should show project details
    await expect(page.locator(`text=${testProject.description}`)).toBeVisible();
    await expect(page.locator(`text=${testProject.idea}`)).toBeVisible();
  });

  test('should update project information', async ({ page }) => {
    // Create a project
    await page.click('text=New Project, text=Create Project');
    await page.fill('input[name="name"]', 'Original Project Name');
    await page.fill('textarea[name="description"], input[name="description"]', 'Original description');
    await page.fill('textarea[name="idea"], input[name="idea"]', 'Original idea');
    await page.click('button[type="submit"]');

    await page.waitForSelector('text=Original Project Name', { timeout: 5000 });

    // Click on project
    await page.click('text=Original Project Name');

    // Click edit button
    await page.click('text=Edit, button:has-text("Edit")');

    // Update project name
    const updatedName = 'Updated Project Name';
    await page.fill('input[name="name"]', updatedName);
    await page.click('button[type="submit"], text=Save');

    // Should show updated name
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 5000 });
  });

  test('should delete project', async ({ page }) => {
    // Create a project
    const projectName = `Delete Test ${Date.now()}`;
    await page.click('text=New Project, text=Create Project');
    await page.fill('input[name="name"]', projectName);
    await page.fill('textarea[name="description"], input[name="description"]', 'To be deleted');
    await page.fill('textarea[name="idea"], input[name="idea"]', 'Delete test');
    await page.click('button[type="submit"]');

    await page.waitForSelector(`text=${projectName}`, { timeout: 5000 });

    // Click on project
    await page.click(`text=${projectName}`);

    // Click delete button
    await page.click('text=Delete, button:has-text("Delete")');

    // Confirm deletion (if confirmation dialog appears)
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Should redirect and project should not be visible
    await page.waitForURL(/.*projects|dashboard/, { timeout: 5000 });
    await expect(page.locator(`text=${projectName}`)).not.toBeVisible();
  });

  test('should list all user projects', async ({ page }) => {
    // Create multiple projects
    const projectNames = ['Project One', 'Project Two', 'Project Three'];

    for (const name of projectNames) {
      await page.click('text=New Project, text=Create Project');
      await page.fill('input[name="name"]', `${name} ${Date.now()}`);
      await page.fill('textarea[name="description"], input[name="description"]', `Description for ${name}`);
      await page.fill('textarea[name="idea"], input[name="idea"]', `Idea for ${name}`);
      await page.click('button[type="submit"]');

      // Wait a moment between creations
      await page.waitForTimeout(500);
    }

    // Navigate to projects list
    await page.goto('/projects');

    // All projects should be visible
    for (const name of projectNames) {
      await expect(page.locator(`text=/.*${name}.*/`)).toBeVisible();
    }
  });

  test('should show empty state when no projects exist', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');

    // Should show empty state or "no projects" message
    const emptyStateVisible = await page.locator('text=/no projects|create.*first project|get started/i').isVisible();
    expect(emptyStateVisible).toBeTruthy();
  });

  test('should validate required fields when creating project', async ({ page }) => {
    // Try to create project without filling fields
    await page.click('text=New Project, text=Create Project');
    await page.click('button[type="submit"]');

    // Should show validation errors
    const errorVisible = await page.locator('text=/required|cannot be empty|field.*required/i').isVisible();
    expect(errorVisible).toBeTruthy();
  });

  test('should navigate through project phases', async ({ page }) => {
    // Create a project
    await page.click('text=New Project, text=Create Project');
    await page.fill('input[name="name"]', 'Phase Test Project');
    await page.fill('textarea[name="description"], input[name="description"]', 'Testing phase navigation');
    await page.fill('textarea[name="idea"], input[name="idea"]', 'Phase navigation test');
    await page.click('button[type="submit"]');

    await page.waitForSelector('text=Phase Test Project', { timeout: 5000 });
    await page.click('text=Phase Test Project');

    // Check if phases are visible
    const phasesVisible = await page.locator('text=/ideation|specification|design|implementation|validation/i').count();
    expect(phasesVisible).toBeGreaterThan(0);
  });
});
