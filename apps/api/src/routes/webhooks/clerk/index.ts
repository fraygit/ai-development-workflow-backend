import type { FastifyInstance } from 'fastify'
import type { TenantService } from '../../../types/tenant'
import { buildClerkWebhookHandler } from './handler'

interface ClerkWebhookPluginOptions {
  tenantService: TenantService
  clerkWebhookSecret: string
}

export async function clerkWebhookRoutes(
  app: FastifyInstance,
  options: ClerkWebhookPluginOptions
) {
  app.post('/webhooks/clerk', buildClerkWebhookHandler(options))
}
