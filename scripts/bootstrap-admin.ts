import { AuditActorType, AuditAction, MembershipStatus, TenantStatus, UserStatus } from '@prisma/client';
import { prisma } from '../src/config/prisma';
import { hashPassword } from '../src/utils/crypto';

async function main() {
  const tenantName = process.env.BOOTSTRAP_TENANT_NAME || 'Digital Cube Agency';
  const tenantSlug = process.env.BOOTSTRAP_TENANT_SLUG || 'digital-cube-agency';
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!adminPassword || adminPassword.length < 12) {
    throw new Error('Set BOOTSTRAP_ADMIN_PASSWORD with at least 12 characters.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { slug: tenantSlug },
      update: { name: tenantName, status: TenantStatus.ACTIVE },
      create: { name: tenantName, slug: tenantSlug, status: TenantStatus.ACTIVE },
    });

    const user = await tx.user.upsert({
      where: { email: adminEmail },
      update: {
        status: UserStatus.ACTIVE,
        passwordHash: await hashPassword(adminPassword),
        passwordUpdatedAt: new Date(),
      },
      create: {
        email: adminEmail,
        displayName: 'Bootstrap Admin',
        status: UserStatus.ACTIVE,
        passwordHash: await hashPassword(adminPassword),
        passwordUpdatedAt: new Date(),
      },
    });

    const membership = await tx.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: { status: MembershipStatus.ACTIVE, deletedAt: null },
      create: { tenantId: tenant.id, userId: user.id, status: MembershipStatus.ACTIVE },
    });

    const permissionKeys = [
      'auth:read:self',
      'auth:update:self',
      'tenant:read:self',
      'tenant:read:members',
      'tenant:manage:members',
      'role:read',
      'role:manage',
    ];

    const permissionIds = new Map<string, string>();

    for (const key of permissionKeys) {
      const permission = await tx.permission.upsert({
        where: { key },
        update: {},
        create: { key },
      });
      permissionIds.set(key, permission.id);
    }

    const ownerRole = await tx.role.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: 'owner' } },
      update: { name: 'Owner', isSystem: true, deletedAt: null },
      create: { tenantId: tenant.id, key: 'owner', name: 'Owner', isSystem: true },
    });

    for (const permissionId of permissionIds.values()) {
      await tx.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId } },
        update: {},
        create: { roleId: ownerRole.id, permissionId },
      });
    }

    await tx.userRole.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: ownerRole.id,
        },
      },
      update: { deletedAt: null },
      create: { tenantId: tenant.id, userId: user.id, roleId: ownerRole.id },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: user.id,
        actorType: AuditActorType.SYSTEM,
        action: AuditAction.BOOTSTRAP_ADMIN,
        entityType: 'User',
        entityId: user.id,
        metadata: { tenantSlug, membershipId: membership.id },
      },
    });

    return { tenantId: tenant.id, userId: user.id, email: user.email };
  });

  console.log(result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });