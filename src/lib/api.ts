import { z } from 'zod';
import type { ProjectPhase } from '@/db/schema';
import { getAuthToken } from '@/lib/auth';

// API Response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Project API types
export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  idea: z.string().min(1),
});

export const UpdateProjectRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  idea: z.string().min(1).optional(),
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

// Project response types
export interface ProjectResponse {
  id: string;
  slug: string;
  name: string;
  description: string;
  idea: string;
  currentPhase: ProjectPhase;
  phasesCompleted: string[];
  stackChoice?: string;
  stackApproved: boolean;
  dependenciesApproved: boolean;
  githubRepoUrl?: string;
  orchestrationState: {
    artifactVersions: Record<string, string>;
    validationResults: Record<string, any>;
    tokenUsage: Record<string, number>;
  };
  createdAt: string;
  updatedAt: string;
}

// Artifact types
export interface ProjectArtifactResponse {
  id: string;
  projectId: string;
  phase: string;
  artifactName: string;
  version: string;
  filePath?: string;
  fileSize?: number;
  contentHash?: string;
  frontmatter?: Record<string, any>;
  validationStatus: 'pending' | 'pass' | 'warn' | 'fail';
  validationErrors: string[];
  qualityScore?: number;
  createdAt: string;
  updatedAt: string;
}

// Phase history types
export interface PhaseHistoryResponse {
  id: string;
  projectId: string;
  fromPhase?: string;
  toPhase: string;
  artifactsGenerated: string[];
  validationPassed: boolean;
  tokensUsed?: number;
  costEstimateUsd?: number;
  transitionedAt: string;
}

// Orchestration types
export interface OrchestrationProgress {
  projectId: string;
  currentPhase: ProjectPhase;
  progress: number;
  isRunning: boolean;
  currentAgent?: string;
  estimatedTimeRemaining?: number;
  phaseHistory: PhaseHistoryResponse[];
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Base API client
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getAuthToken();

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.error || 'Request failed',
          response.status,
          data.code
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  // Project API methods
  async createProject(data: CreateProjectRequest): Promise<ProjectResponse> {
    const response = await this.request<ProjectResponse>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async getProjects(): Promise<ProjectResponse[]> {
    const response = await this.request<ProjectResponse[]>('/projects');
    return response.data || [];
  }

  async getProject(id: string): Promise<ProjectResponse> {
    const response = await this.request<ProjectResponse>(`/projects/${id}`);
    return response.data!;
  }

  async updateProject(
    id: string,
    data: UpdateProjectRequest
  ): Promise<ProjectResponse> {
    const response = await this.request<ProjectResponse>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Artifact API methods
  async getProjectArtifacts(
    projectId: string
  ): Promise<ProjectArtifactResponse[]> {
    const response = await this.request<ProjectArtifactResponse[]>(
      `/projects/${projectId}/artifacts`
    );
    return response.data || [];
  }

  async getProjectArtifactsByPhase(
    projectId: string,
    phase: string
  ): Promise<ProjectArtifactResponse[]> {
    const response = await this.request<ProjectArtifactResponse[]>(
      `/projects/${projectId}/artifacts?phase=${phase}`
    );
    return response.data || [];
  }

  // Orchestration API methods
  async startOrchestration(projectId: string): Promise<OrchestrationProgress> {
    const response = await this.request<OrchestrationProgress>(
      `/projects/${projectId}/orchestration/start`,
      {
        method: 'POST',
      }
    );
    return response.data!;
  }

  async getOrchestrationProgress(
    projectId: string
  ): Promise<OrchestrationProgress> {
    const response = await this.request<OrchestrationProgress>(
      `/projects/${projectId}/orchestration/progress`
    );
    return response.data!;
  }

  async pauseOrchestration(projectId: string): Promise<OrchestrationProgress> {
    const response = await this.request<OrchestrationProgress>(
      `/projects/${projectId}/orchestration/pause`,
      {
        method: 'POST',
      }
    );
    return response.data!;
  }

  async advancePhase(projectId: string): Promise<ProjectResponse> {
    const response = await this.request<ProjectResponse>(
      `/projects/${projectId}/phases/advance`,
      {
        method: 'POST',
      }
    );
    return response.data!;
  }

  // Stack and dependencies approval
  async approveStack(projectId: string): Promise<ProjectResponse> {
    const response = await this.request<ProjectResponse>(
      `/projects/${projectId}/stack/approve`,
      {
        method: 'POST',
      }
    );
    return response.data!;
  }

  async approveDependencies(projectId: string): Promise<ProjectResponse> {
    const response = await this.request<ProjectResponse>(
      `/projects/${projectId}/dependencies/approve`,
      {
        method: 'POST',
      }
    );
    return response.data!;
  }

  // Phase history
  async getPhaseHistory(projectId: string): Promise<PhaseHistoryResponse[]> {
    const response = await this.request<PhaseHistoryResponse[]>(
      `/projects/${projectId}/phases/history`
    );
    return response.data || [];
  }

  // Download project artifacts
  async downloadProject(projectId: string): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/projects/${projectId}/download`
    );

    if (!response.ok) {
      throw new ApiError('Download failed', response.status);
    }

    return response.blob();
  }

  // GitHub integration
  async createGitHubRepo(projectId: string): Promise<{ url: string }> {
    const response = await this.request<{ url: string }>(
      `/projects/${projectId}/github/create`,
      {
        method: 'POST',
      }
    );
    return response.data!;
  }

  // Validation API methods
  async runValidation(projectId: string, phase: string): Promise<any> {
    const response = await this.request('/validation/run', {
      method: 'POST',
      body: JSON.stringify({ projectId, phase }),
    });
    return response.data;
  }

  async getValidationDashboard(projectId: string): Promise<any> {
    const response = await this.request(`/validation/dashboard/${projectId}`);
    return response.data;
  }

  async getValidationHistory(projectId: string, limit = 10): Promise<any[]> {
    const response = await this.request(`/validation/reports/${projectId}?limit=${limit}`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async getValidationReport(reportId: string): Promise<any> {
    const response = await this.request(`/validation/reports/report/${reportId}`);
    return response.data;
  }
}

// Mock API client for development
export class MockApiClient extends ApiClient {
  private projects = new Map<string, ProjectResponse>();
  private artifacts = new Map<string, ProjectArtifactResponse[]>();
  private phaseHistory = new Map<string, PhaseHistoryResponse[]>();

  constructor() {
    super(); // Don't call super() with baseUrl
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async createProject(data: CreateProjectRequest): Promise<ProjectResponse> {
    const id = this.generateId();
    const slug = this.generateSlug(data.name);
    const now = new Date().toISOString();

    const project: ProjectResponse = {
      id,
      slug,
      name: data.name,
      description: data.description,
      idea: data.idea,
      currentPhase: 'analysis',
      phasesCompleted: [],
      stackApproved: false,
      dependenciesApproved: false,
      orchestrationState: {
        artifactVersions: {},
        validationResults: {},
        tokenUsage: {},
      },
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(id, project);
    this.artifacts.set(id, []);
    this.phaseHistory.set(id, []);

    return project;
  }

  async getProjects(): Promise<ProjectResponse[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: string): Promise<ProjectResponse> {
    const project = this.projects.get(id);
    if (!project) {
      throw new ApiError('Project not found', 404);
    }
    return project;
  }

  async getProjectArtifacts(
    projectId: string
  ): Promise<ProjectArtifactResponse[]> {
    return this.artifacts.get(projectId) || [];
  }

  async startOrchestration(projectId: string): Promise<OrchestrationProgress> {
    const project = await this.getProject(projectId);

    const progress: OrchestrationProgress = {
      projectId,
      currentPhase: project.currentPhase,
      progress: this.calculateProgress(project.currentPhase),
      isRunning: true,
      currentAgent: 'Analyst',
      phaseHistory: this.phaseHistory.get(projectId) || [],
    };

    // Simulate orchestration
    setTimeout(async () => {
      await this.simulateOrchestration(projectId);
    }, 100);

    return progress;
  }

  private calculateProgress(phase: ProjectPhase): number {
    const phaseOrder: ProjectPhase[] = [
      'analysis',
      'stack_selection',
      'spec',
      'dependencies',
      'solutioning',
      'done',
    ];
    const currentIndex = phaseOrder.indexOf(phase);
    return Math.round(((currentIndex + 1) / phaseOrder.length) * 100);
  }

  private async simulateOrchestration(projectId: string) {
    const project = this.projects.get(projectId);
    if (!project) return;

    // Simulate artifacts generation
    const mockArtifacts: ProjectArtifactResponse[] = [
      {
        id: this.generateId(),
        projectId,
        phase: 'analysis',
        artifactName: 'constitution.md',
        version: '1.0.0',
        validationStatus: 'pass',
        validationErrors: [],
        qualityScore: 85,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: this.generateId(),
        projectId,
        phase: 'analysis',
        artifactName: 'project-brief.md',
        version: '1.0.0',
        validationStatus: 'pass',
        validationErrors: [],
        qualityScore: 90,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    this.artifacts.set(projectId, mockArtifacts);

    // Update project phase
    const updatedProject = { ...project, currentPhase: 'spec' as ProjectPhase };
    this.projects.set(projectId, updatedProject);
  }

  async getOrchestrationProgress(
    projectId: string
  ): Promise<OrchestrationProgress> {
    const project = await this.getProject(projectId);
    return {
      projectId,
      currentPhase: project.currentPhase,
      progress: this.calculateProgress(project.currentPhase),
      isRunning: false,
      phaseHistory: this.phaseHistory.get(projectId) || [],
    };
  }
}

// Export the real API client for production use
export const apiClient = new ApiClient();
