import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditAction, AuditActorType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';

export interface SafeProjectClientResponse {
  id: string;
  name: string;
}

export interface SafeProjectResponse {
  id: string;
  name: string;
  description: string | null;
  clientId: string | null;
  client: SafeProjectClientResponse | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ListProjectsInput {
  tenantId: string;
  search?: string;
  page: number;
  limit: number;
}

export interface CreateProjectInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  name: string;
  description?: string | null;
  clientId?: string | null;
}

export interface UpdateProjectInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  projectId: string;
  name?: string;
  description?: string | null;
  clientId?: string | null;
}

export interface ProjectListResult {
  projects: SafeProjectResponse[];
  page: number;
  limit: number;
  total: number;
}

const projectSelect = {
  id: true,
  name: true,
  description: true,
  clientId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  client: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ProjectSelect;

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapProject(project: {
  id: string;
  name: string;
  description: string | null;
  clientId: string | null;
  client: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): SafeProjectResponse {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    clientId: project.clientId,
    client: project.client,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    deletedAt: project.deletedAt,
  };
}

function projectNotFoundError(): AppError {
  return new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
}

function clientNotFoundError(): AppError {
  return new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
}

async function resolveClientId(tx: Prisma.TransactionClient, tenantId: string, clientId?: string | null): Promise<string | null | undefined> {
  if (clientId === undefined) {
    return undefined;
  }

  if (clientId === null) {
    return null;
  }

  const client = await tx.client.findFirst({
    where: {
      tenantId,
      id: clientId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!client) {
    throw clientNotFoundError();
  }

  return client.id;
}

function buildProjectWhere(input: Pick<ListProjectsInput, 'tenantId' | 'search'>): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = {
    tenantId: input.tenantId,
    deletedAt: null,
  };

  const search = normalizeOptionalText(input.search);
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

function projectChangeData(input: {
  name?: string;
  description?: string | null;
  clientId?: string | null;
}): Prisma.ProjectUpdateInput {
  const data: Prisma.ProjectUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = normalizeOptionalText(input.description);
  if (input.clientId !== undefined) data.client = input.clientId === null ? { disconnect: true } : { connect: { id: input.clientId } };

  return data;
}

export async function listProjects(input: ListProjectsInput): Promise<ProjectListResult> {
  const where = buildProjectWhere(input);

  const [total, projects] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      select: projectSelect,
      orderBy: [
        { name: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
  ]);

  return {
    projects: projects.map(mapProject),
    page: input.page,
    limit: input.limit,
    total,
  };
}

export async function getProject(input: { tenantId: string; projectId: string }): Promise<SafeProjectResponse> {
  const project = await prisma.project.findFirst({
    where: {
      tenantId: input.tenantId,
      id: input.projectId,
      deletedAt: null,
    },
    select: projectSelect,
  });

  if (!project) {
    throw projectNotFoundError();
  }

  return mapProject(project);
}

export async function createProject(input: CreateProjectInput): Promise<SafeProjectResponse> {
  const project = await prisma.$transaction(async (tx) => {
    const clientId = await resolveClientId(tx, input.tenantId, input.clientId);

    return tx.project.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        description: normalizeOptionalText(input.description),
        clientId,
      },
      select: projectSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.CREATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Project',
    entityId: project.id,
    metadata: {
      projectId: project.id,
      name: project.name,
      clientId: project.clientId,
    } satisfies Prisma.InputJsonValue,
  });

  return mapProject(project);
}

export async function updateProject(input: UpdateProjectInput): Promise<SafeProjectResponse> {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.project.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.projectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw projectNotFoundError();
    }

    const data = projectChangeData({
      name: input.name,
      description: input.description,
      clientId: await resolveClientId(tx, input.tenantId, input.clientId),
    });

    if (Object.keys(data).length === 0) {
      throw new AppError('No project fields to update', 400, 'NO_PROJECT_FIELDS_TO_UPDATE');
    }

    return tx.project.update({
      where: { id: existing.id },
      data,
      select: projectSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Project',
    entityId: result.id,
    metadata: {
      projectId: result.id,
      changedFields: Object.keys(
        projectChangeData({
          name: input.name,
          description: input.description,
          clientId: input.clientId,
        }),
      ),
      clientId: result.clientId,
    } satisfies Prisma.InputJsonValue,
  });

  return mapProject(result);
}

export async function archiveProject(input: {
  tenantId: string;
  actorUserId: string;
  projectId: string;
  request: Request;
}): Promise<SafeProjectResponse> {
  const now = new Date();

  const project = await prisma.$transaction(async (tx) => {
    const existing = await tx.project.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.projectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw projectNotFoundError();
    }

    return tx.project.update({
      where: { id: existing.id },
      data: {
        deletedAt: now,
      },
      select: projectSelect,
    });
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.DELETE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Project',
    entityId: project.id,
    metadata: {
      projectId: project.id,
      clientId: project.clientId,
    } satisfies Prisma.InputJsonValue,
  });

  return mapProject(project);
}
