import { apiClient } from './api-client';
import type { ApiResponse } from '../types/api';
import type { ListProjectsParams, ProjectData, ProjectMutationInput, ProjectsListData } from '../types/project';

function assertSuccess<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }

  return response.data;
}

function buildQuery(params: ListProjectsParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const queryString = searchParams.toString();
  return queryString ? `/projects?${queryString}` : '/projects';
}

export async function listProjects(params: ListProjectsParams = {}): Promise<ProjectsListData> {
  const response = await apiClient.get<ApiResponse<ProjectsListData>>(buildQuery(params));
  return assertSuccess(response);
}

export async function createProject(input: ProjectMutationInput): Promise<ProjectData['project']> {
  const response = await apiClient.post<ApiResponse<ProjectData>>('/projects', input);
  return assertSuccess(response).project;
}

export async function updateProject(projectId: string, input: Partial<ProjectMutationInput>): Promise<ProjectData['project']> {
  const response = await apiClient.patch<ApiResponse<ProjectData>>(`/projects/${projectId}`, input);
  return assertSuccess(response).project;
}

export async function archiveProject(projectId: string): Promise<ProjectData['project']> {
  const response = await apiClient.delete<ApiResponse<ProjectData>>(`/projects/${projectId}`);
  return assertSuccess(response).project;
}
