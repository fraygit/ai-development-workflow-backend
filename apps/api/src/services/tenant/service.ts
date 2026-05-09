import type { TenantService } from '../../types/tenant'
import type { TenantRepository } from './repository'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function deriveUniqueSlug(base: string, repo: TenantRepository): Promise<string> {
  if (!(await repo.findBySlug(base))) return base
  let counter = 2
  while (await repo.findBySlug(`${base}-${counter}`)) counter++
  return `${base}-${counter}`
}

export function createTenantService(repo: TenantRepository): TenantService {
  return {
    async createTenant({ clerkOrgId, name }) {
      const existing = await repo.findByClerkOrgId(clerkOrgId)
      if (existing) return

      const slug = await deriveUniqueSlug(toSlug(name), repo)

      await repo.create({
        clerkOrgId,
        slug,
        region: 'au',
        plan: 'trial',
        planStatus: 'active',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      })
    },

    async upsertTenantUser({ clerkOrgId, clerkUserId, role }) {
      const tenant = await repo.findByClerkOrgId(clerkOrgId)
      if (!tenant) return
      await repo.upsertUser({ tenantId: tenant.id, idpUserId: clerkUserId, role })
    },

    async softDeleteTenantUser({ clerkOrgId, clerkUserId }) {
      const tenant = await repo.findByClerkOrgId(clerkOrgId)
      if (!tenant) return
      await repo.softDeleteUser({ tenantId: tenant.id, idpUserId: clerkUserId })
    },
  }
}
