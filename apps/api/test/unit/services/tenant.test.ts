import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTenantService } from '../../../src/services/tenant/service'
import type { TenantRepository } from '../../../src/services/tenant/repository'

const mockRepo: TenantRepository = {
  findByClerkOrgId: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  upsertUser: vi.fn(),
  softDeleteUser: vi.fn(),
}

const service = createTenantService(mockRepo)

beforeEach(() => vi.clearAllMocks())

describe('createTenant', () => {
  it('creates row with correct defaults for a new org', async () => {
    vi.mocked(mockRepo.findByClerkOrgId).mockResolvedValue(null)
    vi.mocked(mockRepo.findBySlug).mockResolvedValue(null)
    vi.mocked(mockRepo.create).mockResolvedValue({ id: 'tenant_1' } as never)

    await service.createTenant({ clerkOrgId: 'org_1', name: 'Acme Corp' })

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkOrgId: 'org_1',
        slug: 'acme-corp',
        region: 'au',
        plan: 'trial',
        planStatus: 'active',
      })
    )
    // trialEndsAt should be ~14 days from now
    const call = vi.mocked(mockRepo.create).mock.calls[0][0]
    const diff = call.trialEndsAt.getTime() - Date.now()
    expect(diff).toBeGreaterThan(13 * 24 * 60 * 60 * 1000)
    expect(diff).toBeLessThan(15 * 24 * 60 * 60 * 1000)
  })

  it('returns without inserting when clerkOrgId already exists (idempotent)', async () => {
    vi.mocked(mockRepo.findByClerkOrgId).mockResolvedValue({ id: 'tenant_1' } as never)

    await service.createTenant({ clerkOrgId: 'org_1', name: 'Acme Corp' })

    expect(mockRepo.create).not.toHaveBeenCalled()
  })

  it('appends numeric suffix on slug collision', async () => {
    vi.mocked(mockRepo.findByClerkOrgId).mockResolvedValue(null)
    vi.mocked(mockRepo.findBySlug)
      .mockResolvedValueOnce({ id: 'x' } as never)  // 'acme-corp' taken
      .mockResolvedValueOnce({ id: 'x' } as never)  // 'acme-corp-2' taken
      .mockResolvedValue(null)                        // 'acme-corp-3' free
    vi.mocked(mockRepo.create).mockResolvedValue({ id: 'tenant_2' } as never)

    await service.createTenant({ clerkOrgId: 'org_2', name: 'Acme Corp' })

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'acme-corp-3' })
    )
  })

  it('converts org name to kebab-case slug', async () => {
    vi.mocked(mockRepo.findByClerkOrgId).mockResolvedValue(null)
    vi.mocked(mockRepo.findBySlug).mockResolvedValue(null)
    vi.mocked(mockRepo.create).mockResolvedValue({ id: 'tenant_3' } as never)

    await service.createTenant({ clerkOrgId: 'org_3', name: 'My Awesome  Org!' })

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'my-awesome-org' })
    )
  })
})

describe('upsertTenantUser', () => {
  it('calls upsertUser with correct args', async () => {
    vi.mocked(mockRepo.findByClerkOrgId).mockResolvedValue({ id: 'tenant_1' } as never)
    vi.mocked(mockRepo.upsertUser).mockResolvedValue(undefined as never)

    await service.upsertTenantUser({ clerkOrgId: 'org_1', clerkUserId: 'user_1', role: 'admin' })

    expect(mockRepo.upsertUser).toHaveBeenCalledWith({
      tenantId: 'tenant_1',
      idpUserId: 'user_1',
      role: 'admin',
    })
  })
})

describe('softDeleteTenantUser', () => {
  it('calls softDeleteUser with correct args', async () => {
    vi.mocked(mockRepo.findByClerkOrgId).mockResolvedValue({ id: 'tenant_1' } as never)
    vi.mocked(mockRepo.softDeleteUser).mockResolvedValue(undefined as never)

    await service.softDeleteTenantUser({ clerkOrgId: 'org_1', clerkUserId: 'user_1' })

    expect(mockRepo.softDeleteUser).toHaveBeenCalledWith({
      tenantId: 'tenant_1',
      idpUserId: 'user_1',
    })
  })
})
