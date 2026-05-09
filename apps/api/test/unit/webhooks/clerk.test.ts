import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../../src/app'

vi.mock('svix')
import { Webhook } from 'svix'

const SVIX_HEADERS = {
  'svix-id': 'msg_test_123',
  'svix-timestamp': '1700000000',
  'svix-signature': 'v1,test_sig',
  'content-type': 'application/json',
}

const mockTenantService = {
  createTenant: vi.fn().mockResolvedValue(undefined),
  upsertTenantUser: vi.fn().mockResolvedValue(undefined),
  softDeleteTenantUser: vi.fn().mockResolvedValue(undefined),
}

describe('POST /webhooks/clerk', () => {
  let mockVerify: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockVerify = vi.fn()
    vi.mocked(Webhook).mockImplementation(() => ({ verify: mockVerify } as unknown as Webhook))
  })

  async function makeApp() {
    return createApp({ tenantService: mockTenantService, clerkWebhookSecret: 'test_secret' })
  }

  it('returns 400 on invalid signature', async () => {
    mockVerify.mockImplementation(() => { throw new Error('Invalid signature') })
    const app = await makeApp()

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/clerk',
      headers: SVIX_HEADERS,
      payload: JSON.stringify({ type: 'organization.created', data: { id: 'org_1', name: 'Acme' } }),
    })

    expect(res.statusCode).toBe(400)
    expect(mockTenantService.createTenant).not.toHaveBeenCalled()
  })

  it('calls createTenant with correct args on organization.created', async () => {
    mockVerify.mockReturnValue({ type: 'organization.created', data: { id: 'org_1', name: 'Acme Corp' } })
    const app = await makeApp()

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/clerk',
      headers: SVIX_HEADERS,
      payload: JSON.stringify({ type: 'organization.created', data: { id: 'org_1', name: 'Acme Corp' } }),
    })

    expect(res.statusCode).toBe(200)
    expect(mockTenantService.createTenant).toHaveBeenCalledWith({ clerkOrgId: 'org_1', name: 'Acme Corp' })
  })

  it('handles duplicate organization.created — service called both times, both return 200', async () => {
    mockVerify.mockReturnValue({ type: 'organization.created', data: { id: 'org_1', name: 'Acme Corp' } })
    const app = await makeApp()

    const payload = JSON.stringify({ type: 'organization.created', data: { id: 'org_1', name: 'Acme Corp' } })
    const r1 = await app.inject({ method: 'POST', url: '/webhooks/clerk', headers: SVIX_HEADERS, payload })
    const r2 = await app.inject({ method: 'POST', url: '/webhooks/clerk', headers: SVIX_HEADERS, payload })

    expect(r1.statusCode).toBe(200)
    expect(r2.statusCode).toBe(200)
    // Handler delegates both calls to the service — idempotency lives in the service (Task 1.6)
    expect(mockTenantService.createTenant).toHaveBeenCalledTimes(2)
  })

  it('calls upsertTenantUser on organizationMembership.created', async () => {
    mockVerify.mockReturnValue({
      type: 'organizationMembership.created',
      data: {
        role: 'org:admin',
        organization: { id: 'org_1' },
        public_user_data: { user_id: 'user_1' },
      },
    })
    const app = await makeApp()

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/clerk',
      headers: SVIX_HEADERS,
      payload: JSON.stringify({ type: 'organizationMembership.created', data: {} }),
    })

    expect(res.statusCode).toBe(200)
    expect(mockTenantService.upsertTenantUser).toHaveBeenCalledWith({
      clerkOrgId: 'org_1',
      clerkUserId: 'user_1',
      role: 'admin',
    })
  })

  it('calls softDeleteTenantUser on organizationMembership.deleted', async () => {
    mockVerify.mockReturnValue({
      type: 'organizationMembership.deleted',
      data: {
        organization: { id: 'org_1' },
        public_user_data: { user_id: 'user_1' },
      },
    })
    const app = await makeApp()

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/clerk',
      headers: SVIX_HEADERS,
      payload: JSON.stringify({ type: 'organizationMembership.deleted', data: {} }),
    })

    expect(res.statusCode).toBe(200)
    expect(mockTenantService.softDeleteTenantUser).toHaveBeenCalledWith({
      clerkOrgId: 'org_1',
      clerkUserId: 'user_1',
    })
  })

  it('returns 200 without action for unknown event types', async () => {
    mockVerify.mockReturnValue({ type: 'some.future.event', data: {} })
    const app = await makeApp()

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/clerk',
      headers: SVIX_HEADERS,
      payload: JSON.stringify({ type: 'some.future.event', data: {} }),
    })

    expect(res.statusCode).toBe(200)
    expect(mockTenantService.createTenant).not.toHaveBeenCalled()
  })

  it('returns 500 when service throws', async () => {
    mockVerify.mockReturnValue({ type: 'organization.created', data: { id: 'org_1', name: 'Acme' } })
    mockTenantService.createTenant.mockRejectedValueOnce(new Error('DB error'))
    const app = await makeApp()

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/clerk',
      headers: SVIX_HEADERS,
      payload: JSON.stringify({ type: 'organization.created', data: { id: 'org_1', name: 'Acme' } }),
    })

    expect(res.statusCode).toBe(500)
  })
})
