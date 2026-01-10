// BuildOS - Project Service
// Business logic for Project management

import {
  ProjectRepository,
  CreateProjectInput,
  UpdateProjectInput,
  prisma,
  Project,
} from "@buildos/database";
import { RepositoryContext, PaginationParams, PaginationResult } from "@buildos/database";

/**
 * Project Service
 * Handles ALL business logic for projects
 * NEVER access Prisma directly - only through repositories
 */
export class ProjectService {
  private projectRepo: ProjectRepository;

  constructor(context: RepositoryContext) {
    this.projectRepo = new ProjectRepository(prisma, context);
  }

  /**
   * Get all projects
   */
  async getAllProjects(params?: PaginationParams): Promise<PaginationResult<Project>> {
    return this.projectRepo.findAll(params);
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: string): Promise<Project | null> {
    return this.projectRepo.findById(id);
  }

  /**
   * Get projects for a client by email
   */
  async getProjectsForClient(
    clientEmail: string,
    params?: PaginationParams
  ): Promise<PaginationResult<Project>> {
    if (!clientEmail || clientEmail.trim() === "") {
      throw new Error("Client email is required");
    }
    return this.projectRepo.findByClientEmail(clientEmail, params);
  }

  /**
   * Get project by ID for a specific client email
   */
  async getProjectForClient(id: string, clientEmail: string): Promise<Project | null> {
    if (!clientEmail || clientEmail.trim() === "") {
      throw new Error("Client email is required");
    }
    return this.projectRepo.findByIdForClient(id, clientEmail);
  }

  /**
   * Create new project
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    // Validate input
    if (!input.name || input.name.trim() === "") {
      throw new Error("Project name is required");
    }

    // Business logic: Set default status if not provided
    const projectInput: CreateProjectInput = {
      ...input,
      status: input.status || "draft",
    };

    return this.projectRepo.create(projectInput);
  }

  /**
   * Update project
   */
  async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
    // Validate input
    if (input.name !== undefined && input.name.trim() === "") {
      throw new Error("Project name cannot be empty");
    }

    return this.projectRepo.update(id, input);
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(id: string): Promise<Project> {
    return this.projectRepo.softDelete(id);
  }

  /**
   * Restore deleted project
   */
  async restoreProject(id: string): Promise<Project> {
    return this.projectRepo.restore(id);
  }

  /**
   * Get projects by status
   */
  async getProjectsByStatus(
    status: string,
    params?: PaginationParams
  ): Promise<PaginationResult<Project>> {
    return this.projectRepo.findByStatus(status, params);
  }

  /**
   * Search projects
   */
  async searchProjects(
    query: string,
    params?: PaginationParams
  ): Promise<PaginationResult<Project>> {
    if (!query || query.trim() === "") {
      throw new Error("Search query cannot be empty");
    }

    return this.projectRepo.search(query, params);
  }

  /**
   * Update project status
   */
  async updateProjectStatus(id: string, status: string): Promise<Project> {
    // Validate status transitions
    const validStatuses = ["draft", "active", "completed", "archived"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    return this.projectRepo.update(id, { status });
  }

  /**
   * Get active projects only
   */
  async getActiveProjects(params?: PaginationParams): Promise<PaginationResult<Project>> {
    return this.projectRepo.findByStatus("active", params);
  }
}
