export interface ProjectClientReference {
  id: string;
  name: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  clientId: string | null;
  client: ProjectClientReference | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectsListData {
  projects: ProjectRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface ProjectData {
  project: ProjectRecord;
}

export interface ListProjectsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProjectMutationInput {
  name: string;
  description?: string | null;
  clientId?: string | null;
}
