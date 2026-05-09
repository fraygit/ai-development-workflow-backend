import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'

const TEST_DB_URL = 'postgresql://aidevflow:aidevflow@localhost:5432/aidevflow_test'

const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } }
})

afterEach(async () => {
  await prisma.tenantUser.deleteMany()
  await prisma.tenant.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

describe('tenants', () => {
  it('inserts with correct defaults', async () => {
    const tenant = await prisma.tenant.create({
      data: { slug: 'test-org', clerkOrgId: 'org_123', trialEndsAt }
    })
    expect(tenant.plan).toBe('trial')
    expect(tenant.region).toBe('au')
    expect(tenant.planStatus).toBe('active')
  })

  it('throws P2002 on duplicate clerkOrgId', async () => {
    await prisma.tenant.create({ data: { slug: 'org-a', clerkOrgId: 'org_dup', trialEndsAt } })
    await expect(
      prisma.tenant.create({ data: { slug: 'org-b', clerkOrgId: 'org_dup', trialEndsAt } })
    ).rejects.toMatchObject({ code: 'P2002' })
  })

  it('throws P2002 on duplicate slug', async () => {
    await prisma.tenant.create({ data: { slug: 'same-slug', clerkOrgId: 'org_1', trialEndsAt } })
    await expect(
      prisma.tenant.create({ data: { slug: 'same-slug', clerkOrgId: 'org_2', trialEndsAt } })
    ).rejects.toMatchObject({ code: 'P2002' })
  })
})

describe('tenant_users', () => {
  let tenantId: string

  // beforeEach (not beforeAll) because the outer afterEach deletes all tenants after every test
  beforeEach(async () => {
    const uid = Math.random().toString(36).slice(2)
    const tenant = await prisma.tenant.create({
      data: { slug: `users-org-${uid}`, clerkOrgId: `org_users_${uid}`, trialEndsAt }
    })
    tenantId = tenant.id
  })

  it('creates with a valid tenantId', async () => {
    const user = await prisma.tenantUser.create({
      data: { tenantId, idpUserId: 'user_1', role: 'admin' }
    })
    expect(user.tenantId).toBe(tenantId)
  })

  it('throws P2003 with non-existent tenantId', async () => {
    await expect(
      prisma.tenantUser.create({
        data: {
          tenantId: '00000000-0000-0000-0000-000000000000',
          idpUserId: 'user_x',
          role: 'admin'
        }
      })
    ).rejects.toMatchObject({ code: 'P2003' })
  })

  it('throws P2002 on duplicate (tenantId, idpUserId)', async () => {
    await prisma.tenantUser.create({ data: { tenantId, idpUserId: 'user_dup', role: 'admin' } })
    await expect(
      prisma.tenantUser.create({ data: { tenantId, idpUserId: 'user_dup', role: 'engineer' } })
    ).rejects.toMatchObject({ code: 'P2002' })
  })
})
