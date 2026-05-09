import type { FastifyRequest, FastifyReply } from 'fastify'
import { Webhook } from 'svix'
import type { TenantService } from '../../../types/tenant'

interface HandlerOptions {
  tenantService: TenantService
  clerkWebhookSecret: string
}

interface ClerkEvent {
  type: string
  data: Record<string, unknown>
}

export function buildClerkWebhookHandler({ tenantService, clerkWebhookSecret }: HandlerOptions) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const wh = new Webhook(clerkWebhookSecret)
    let event: ClerkEvent

    try {
      event = wh.verify(req.rawBody, {
        'svix-id': req.headers['svix-id'] as string,
        'svix-timestamp': req.headers['svix-timestamp'] as string,
        'svix-signature': req.headers['svix-signature'] as string,
      }) as ClerkEvent
    } catch {
      return reply.code(400).send({ error: 'Invalid webhook signature' })
    }

    try {
      const { type, data } = event

      switch (type) {
        case 'organization.created':
          await tenantService.createTenant({
            clerkOrgId: data.id as string,
            name: data.name as string,
          })
          break

        case 'organizationMembership.created': {
          const org = data.organization as Record<string, unknown>
          const userData = data.public_user_data as Record<string, unknown>
          await tenantService.upsertTenantUser({
            clerkOrgId: org.id as string,
            clerkUserId: userData.user_id as string,
            role: (data.role as string) === 'org:admin' ? 'admin' : 'engineer',
          })
          break
        }

        case 'organizationMembership.deleted': {
          const org = data.organization as Record<string, unknown>
          const userData = data.public_user_data as Record<string, unknown>
          await tenantService.softDeleteTenantUser({
            clerkOrgId: org.id as string,
            clerkUserId: userData.user_id as string,
          })
          break
        }

        case 'user.created':
          // No action — will be linked when organizationMembership.created fires
          break

        // Unknown event types: return 200, never error on future Clerk events
      }

      return reply.code(200).send({ received: true })
    } catch {
      return reply.code(500).send({ error: 'Internal server error' })
    }
  }
}
