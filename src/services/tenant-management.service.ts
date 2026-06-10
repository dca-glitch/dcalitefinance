import { AuditAction, AuditActorType, MembershipStatus, TenantStatus, UserStatus, type Prisma } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';

export interface SafePermissionResponse {
  key: string;
  description: string | null;
}

export interface SafeRoleSummaryResponse {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export interface SafeRoleResponse extends SafeRoleSummaryResponse {
  permissions: SafePermissionResponse[];
}

export interface SafeUserResponse {
  id: string;
  email: string;
  displayName: string | null;
  status: UserStatus;
}

export interface SafeMembershipResponse {
  id: string;
  status: MembershipStatus;
  roles: SafeRoleSummaryResponse[];
}

export interface SafeTenantCurrentResponse {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
  };
  user: SafeUserResponse;
  membership: SafeMembershipResponse;
}

export interface SafeTenantMemberResponse {
  membershipId: string;
  status: MembershipStatus;
  user: SafeUserResponse;
  roles: SafeRoleSummaryResponse[];
}

export interface TenantRoleInput {
  tenantId: string;
  actorUserId: string;
  targetUserId: string;
  roleIds: string[];
  request?: Request;
}

export interface TenantStatusInput {
  tenantId: string;
  actorUserId: string;
  targetUserId: string;
  status: MembershipStatus;
  request?: Request;
}

export interface RoleWriteInput {
  tenantId: string;
  actorUserId: string;
  key: string;
  name: string;
  description?: string | null;
  permissionKeys: string[];
  request?: Request;
}

export interface RoleUpdateInput {
  tenantId: string;
  actorUserId: string;
  roleId: string;
  name?: string;
  description?: string | null;
  permissionKeys?: string[];
  request?: Request;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function mapPermission(permission: { key: string; description: string | null }): SafePermissionResponse {
  return {
    key: permission.key,
    description: permission.description,
  };
}

function mapRoleSummary(role: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}): SafeRoleSummaryResponse {
  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
  };
}

function mapRole(role: {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  rolePermissions: Array<{
    permission: {
      key: string;
      description: string | null;
    };
  }>;
}): SafeRoleResponse {
  return {
    ...mapRoleSummary(role),
    permissions: role.rolePermissions.map((rolePermission) => mapPermission(rolePermission.permission)),
  };
}

function memberNotFoundError(): AppError {
  return new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
}

function invalidRoleSelectionError(): AppError {
  return new AppError('Invalid role selection', 400, 'INVALID_ROLE_SELECTION');
}

function selfRemovalError(): AppError {
  return new AppError('Cannot remove all of your own roles', 400, 'CANNOT_REMOVE_OWN_ROLES');
}

function selfDeactivationError(): AppError {
  return new AppError('Cannot deactivate your own membership', 400, 'CANNOT_DEACTIVATE_SELF');
}

async function requireTenantMembership(tx: Prisma.TransactionClient, tenantId: string, userId: string) {
  const membership = await tx.tenantMembership.findFirst({
    where: {
      tenantId,
      userId,
      deletedAt: null,
      tenant: {
        status: TenantStatus.ACTIVE,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!membership) {
    throw memberNotFoundError();
  }

  return membership;
}

export async function getCurrentTenant(input: { tenantId: string; userId: string }): Promise<SafeTenantCurrentResponse> {
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
      deletedAt: null,
      tenant: {
        status: TenantStatus.ACTIVE,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      status: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          roles: {
            where: {
              tenantId: input.tenantId,
              deletedAt: null,
              role: {
                deletedAt: null,
              },
            },
            select: {
              role: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                  description: true,
                  isSystem: true,
                },
              },
            },
            orderBy: {
              role: {
                name: 'asc',
              },
            },
          },
        },
      },
    },
  });

  if (!membership) {
    throw memberNotFoundError();
  }

  return {
    tenant: membership.tenant,
    user: {
      id: membership.user.id,
      email: membership.user.email,
      displayName: membership.user.displayName,
      status: membership.user.status,
    },
    membership: {
      id: membership.id,
      status: membership.status,
      roles: membership.user.roles.map((userRole) => mapRoleSummary(userRole.role)),
    },
  };
}

export async function listTenantMembers(tenantId: string): Promise<SafeTenantMemberResponse[]> {
  const memberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId,
      deletedAt: null,
      tenant: {
        status: TenantStatus.ACTIVE,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      status: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          roles: {
            where: {
              tenantId,
              deletedAt: null,
              role: {
                deletedAt: null,
              },
            },
            select: {
              role: {
                select: {
                  id: true,
                  key: true,
                  name: true,
                  description: true,
                  isSystem: true,
                },
              },
            },
            orderBy: {
              role: {
                name: 'asc',
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return memberships
    .map((membership) => ({
      membershipId: membership.id,
      status: membership.status,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        displayName: membership.user.displayName,
        status: membership.user.status,
      },
      roles: membership.user.roles.map((userRole) => mapRoleSummary(userRole.role)),
    }))
    .sort((a, b) => a.user.email.localeCompare(b.user.email));
}

export async function updateMemberRoles(input: TenantRoleInput): Promise<{ membershipId: string; roleCount: number }> {
  const roleIds = uniqueStrings(input.roleIds);

  if (input.targetUserId === input.actorUserId && roleIds.length === 0) {
    throw selfRemovalError();
  }

  const result = await prisma.$transaction(async (tx) => {
    const membership = await requireTenantMembership(tx, input.tenantId, input.targetUserId);

    const validatedRoles =
      roleIds.length > 0
        ? await tx.role.findMany({
            where: {
              tenantId: input.tenantId,
              id: { in: roleIds },
              deletedAt: null,
            },
            select: {
              id: true,
            },
          })
        : [];

    if (validatedRoles.length !== roleIds.length) {
      throw invalidRoleSelectionError();
    }

    const currentRoles = await tx.userRole.findMany({
      where: {
        tenantId: input.tenantId,
        userId: input.targetUserId,
        deletedAt: null,
      },
      select: {
        roleId: true,
      },
    });

    const currentRoleIds = currentRoles.map((role) => role.roleId);
    const removedRoleIds = currentRoleIds.filter((roleId) => !roleIds.includes(roleId));
    const addedRoleIds = roleIds.filter((roleId) => !currentRoleIds.includes(roleId));
    const now = new Date();

    if (removedRoleIds.length > 0) {
      await tx.userRole.updateMany({
        where: {
          tenantId: input.tenantId,
          userId: input.targetUserId,
          roleId: { in: removedRoleIds },
          deletedAt: null,
        },
        data: {
          deletedAt: now,
        },
      });
    }

    for (const roleId of roleIds) {
      await tx.userRole.upsert({
        where: {
          tenantId_userId_roleId: {
            tenantId: input.tenantId,
            userId: input.targetUserId,
            roleId,
          },
        },
        update: {
          deletedAt: null,
        },
        create: {
          tenantId: input.tenantId,
          userId: input.targetUserId,
          roleId,
        },
      });
    }

    return {
      membershipId: membership.id,
      roleCount: roleIds.length,
      addedRoleCount: addedRoleIds.length,
      removedRoleCount: removedRoleIds.length,
    };
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'TenantMembership',
    entityId: result.membershipId,
    metadata: {
      targetUserId: input.targetUserId,
      roleCount: result.roleCount,
      addedRoleCount: result.addedRoleCount,
      removedRoleCount: result.removedRoleCount,
    } satisfies Prisma.InputJsonValue,
  });

  return {
    membershipId: result.membershipId,
    roleCount: result.roleCount,
  };
}

export async function updateMemberStatus(input: TenantStatusInput): Promise<{ membershipId: string; status: MembershipStatus }> {
  if (input.targetUserId === input.actorUserId && input.status !== MembershipStatus.ACTIVE) {
    throw selfDeactivationError();
  }

  const result = await prisma.$transaction(async (tx) => {
    const membership = await requireTenantMembership(tx, input.tenantId, input.targetUserId);

    const updated = await tx.tenantMembership.update({
      where: {
        id: membership.id,
      },
      data: {
        status: input.status,
      },
      select: {
        id: true,
        status: true,
      },
    });

    return updated;
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'TenantMembership',
    entityId: result.id,
    metadata: {
      targetUserId: input.targetUserId,
      status: result.status,
    } satisfies Prisma.InputJsonValue,
  });

  return {
    membershipId: result.id,
    status: result.status,
  };
}

export async function listRoles(tenantId: string): Promise<SafeRoleResponse[]> {
  const roles = await prisma.role.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isSystem: true,
      rolePermissions: {
        select: {
          permission: {
            select: {
              key: true,
              description: true,
            },
          },
        },
        orderBy: {
          permission: {
            key: 'asc',
          },
        },
      },
    },
    orderBy: [
      {
        name: 'asc',
      },
      {
        key: 'asc',
      },
    ],
  });

  return roles.map(mapRole);
}

function validatePermissionSet(
  requestedKeys: string[],
  permissions: Array<{ id: string; key: string; description: string | null }>,
): void {
  const uniqueRequested = uniqueStrings(requestedKeys);
  if (permissions.length !== uniqueRequested.length) {
    throw new AppError('Invalid permission selection', 400, 'INVALID_PERMISSION_SELECTION');
  }
}

async function resolvePermissions(tx: Prisma.TransactionClient, permissionKeys: string[]) {
  const keys = uniqueStrings(permissionKeys);
  if (keys.length === 0) {
    return [];
  }

  const permissions = await tx.permission.findMany({
    where: {
      key: {
        in: keys,
      },
    },
    select: {
      id: true,
      key: true,
      description: true,
    },
  });

  validatePermissionSet(keys, permissions);
  return permissions;
}

export async function createRole(input: RoleWriteInput): Promise<SafeRoleResponse> {
  const result = await prisma.$transaction(async (tx) => {
    const permissions = await resolvePermissions(tx, input.permissionKeys);

    const existingRole = await tx.role.findFirst({
      where: {
        tenantId: input.tenantId,
        key: input.key,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (existingRole && existingRole.deletedAt === null) {
      throw new AppError('Role already exists', 409, 'ROLE_ALREADY_EXISTS');
    }

    const role = existingRole
      ? await tx.role.update({
          where: { id: existingRole.id },
          data: {
            name: input.name,
            description: input.description ?? null,
            deletedAt: null,
          },
          select: {
            id: true,
            key: true,
            name: true,
            description: true,
            isSystem: true,
          },
        })
      : await tx.role.create({
          data: {
            tenantId: input.tenantId,
            key: input.key,
            name: input.name,
            description: input.description ?? null,
            isSystem: false,
          },
          select: {
            id: true,
            key: true,
            name: true,
            description: true,
            isSystem: true,
          },
        });

    await tx.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    });

    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      });
    }

    return {
      ...role,
      permissions,
    };
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.CREATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Role',
    entityId: result.id,
    metadata: {
      permissionCount: result.permissions.length,
      roleKey: result.key,
    } satisfies Prisma.InputJsonValue,
  });

  return {
    ...mapRoleSummary(result),
    permissions: result.permissions.map(mapPermission),
  };
}

export async function updateRole(input: RoleUpdateInput): Promise<SafeRoleResponse> {
  const result = await prisma.$transaction(async (tx) => {
    const existingRole = await tx.role.findFirst({
      where: {
        tenantId: input.tenantId,
        id: input.roleId,
        deletedAt: null,
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        isSystem: true,
      },
    });

    if (!existingRole) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    const permissions =
      input.permissionKeys !== undefined ? await resolvePermissions(tx, input.permissionKeys) : null;

    const updated = await tx.role.update({
      where: {
        id: existingRole.id,
      },
      data: {
        name: input.name ?? existingRole.name,
        description: input.description === undefined ? existingRole.description : input.description,
      },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        isSystem: true,
      },
    });

    if (permissions) {
      await tx.rolePermission.deleteMany({
        where: {
          roleId: updated.id,
        },
      });

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: updated.id,
            permissionId: permission.id,
          })),
        });
      }
    }

    return {
      ...updated,
      permissions:
        permissions ??
        (
          await tx.rolePermission.findMany({
            where: {
              roleId: updated.id,
            },
            select: {
              permission: {
                select: {
                  key: true,
                  description: true,
                },
              },
            },
            orderBy: {
              permission: {
                key: 'asc',
              },
            },
          })
        ).map((rolePermission) => rolePermission.permission),
    };
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: AuditAction.UPDATE,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'Role',
    entityId: result.id,
    metadata: {
      permissionCount: result.permissions.length,
      roleKey: result.key,
    } satisfies Prisma.InputJsonValue,
  });

  return {
    ...mapRoleSummary(result),
    permissions: result.permissions.map(mapPermission),
  };
}
