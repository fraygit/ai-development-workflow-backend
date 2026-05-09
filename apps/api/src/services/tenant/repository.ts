import type { PrismaClient, Tenant, TenantUser } from '@prisma/client'

export interface TenantRepository {
  findByClerkOrgId(clerkOrgId: string): Promise<Tenant | null>
  findBySlug(slug: string): Promise<Tenant | null>
  create(data: CreateTenantData): Promise<Tenant>
  upsertUser(data: UpsertUserData): Promise<TenantUser>
  softDeleteUser(data: SoftDeleteUserData): Promise<void>
}

export interface CreateTenantData {
  clerkOrgId: string
  slug: string
  region: string
  plan: string
  planStatus: string
  trialEndsAt: Date
}

export interface UpsertUserData {
  tenantId: string
  idpUserId: string
  role: string
}

export interface SoftDeleteUserData {
  tenantId: string
  idpUserId: string
}

export function createPrismaTenantRepository(db: PrismaClient): TenantRepository {
  return {
    findByClerkOrgId: (clerkOrgId) =>
      db.tenant.findUnique({ where: { clerkOrgId } }),

    findBySlug: (slug) =>
      db.tenant.findUnique({ where: { slug } }),

    create: (data) =>
      db.tenant.create({ data }),

    upsertUser: ({ tenantId, idpUserId, role }) =>
      db.tenantUser.upsert({
        where: { tenantId_idpUserId: { tenantId, idpUserId } },
        update: { role, deletedAt: null },
        create: { tenantId, idpUserId, role },
      }),

    softDeleteUser: async ({ tenantId, idpUserId }) => {
      await db.tenantUser.update({
        where: { tenantId_idpUserId: { tenantId, idpUserId } },
        data: { deletedAt: new Date() },
      })
    },
  }
}
