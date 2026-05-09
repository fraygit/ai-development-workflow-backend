export interface CreateTenantInput {
  clerkOrgId: string
  name: string
}

export interface UpsertTenantUserInput {
  clerkOrgId: string
  clerkUserId: string
  role: 'admin' | 'engineer' | 'viewer'
}

export interface SoftDeleteTenantUserInput {
  clerkOrgId: string
  clerkUserId: string
}

export interface TenantService {
  createTenant(input: CreateTenantInput): Promise<void>
  upsertTenantUser(input: UpsertTenantUserInput): Promise<void>
  softDeleteTenantUser(input: SoftDeleteTenantUserInput): Promise<void>
}
