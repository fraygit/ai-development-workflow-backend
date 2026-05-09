import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify'
import type { TenantService } from './types/tenant'
import { clerkWebhookRoutes } from './routes/webhooks/clerk'

declare module 'fastify' {
  interface FastifyRequest {
    rawBody: Buffer
  }
}

interface AppOptions {
  tenantService: TenantService
  clerkWebhookSecret?: string
}

export async function createApp({ tenantService, clerkWebhookSecret }: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  // Preserve raw body buffer — required for svix signature verification
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req: FastifyRequest, body: Buffer, done: (err: Error | null, body?: unknown) => void) => {
      req.rawBody = body
      try {
        done(null, JSON.parse(body.toString()))
      } catch (err) {
        done(err as Error)
      }
    }
  )

  await app.register(clerkWebhookRoutes, {
    tenantService,
    clerkWebhookSecret: clerkWebhookSecret ?? process.env.CLERK_WEBHOOK_SECRET ?? '',
  })

  return app
}
