import type { HttpHandler } from 'msw'
import type { VaultSecret } from './vault-client.service'
import type { ProjectWithDetails, ZoneWithDetails } from './vault-datastore.service'
import { faker } from '@faker-js/faker'
import { Collection } from '@msw/data'
import { http, HttpResponse } from 'msw'
import { z } from 'zod'

export const VAULT_INTERNAL_URL = 'https://vault.internal'

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}): ProjectWithDetails {
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(`test-project-${faker.string.uuid()}`),
    name: faker.company.name(),
    description: faker.company.buzzPhrase(),
    environments: [],
    plugins: [],
    ...overrides,
  } satisfies ProjectWithDetails
}

export function makeZoneWithDetails(overrides: Partial<ZoneWithDetails> = {}): ZoneWithDetails {
  return {
    id: faker.string.uuid(),
    slug: faker.helpers.slugify(`test-zone-${faker.string.uuid()}`),
    clusters: [],
    ...overrides,
  } satisfies ZoneWithDetails
}

export function makeVaultSecretMetadata(overrides: Partial<VaultSecret['metadata']> = {}): VaultSecret['metadata'] {
  return {
    created_time: faker.date.soon().toISOString(),
    custom_metadata: null,
    deletion_time: '',
    destroyed: false,
    version: 1,
    ...overrides,
  }
}

const kvSecretSchema = z.object({
  path: z.string(),
  data: z.record(z.unknown()).optional(),
  metadata: z.object({
    created_time: z.string(),
    destroyed: z.boolean(),
    version: z.number(),
  }).optional(),
})

const identityGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  alias: z.object({
    name: z.string(),
  }).optional(),
})

const authMethodSchema = z.object({
  type: z.string(),
  description: z.string().optional(),
})

export function makeVaultDb() {
  return {
    kv: new Collection({ schema: kvSecretSchema }),
    identityGroups: new Collection({ schema: identityGroupSchema }),
    authMethods: new Collection({ schema: authMethodSchema }),
  }
}

export function makeVaultSecret<T>(data: T): { data: { data: T, metadata: { created_time: string, destroyed: boolean, version: number } } } {
  return {
    data: {
      data,
      metadata: {
        created_time: new Date().toISOString(),
        destroyed: false,
        version: 1,
      },
    },
  }
}

type VaultDb = ReturnType<typeof makeVaultDb>

const KV_BASE = `${VAULT_INTERNAL_URL}/v1/kv`

function findKv(db: VaultDb, path: string) {
  return db.kv.findFirst((q: any) => q.where({ path }))
}

async function upsertKv(db: VaultDb, path: string, body: any) {
  const record = await findKv(db, path)
  if (record) {
    await db.kv.update(record, { data: body?.data ?? body })
  } else {
    await db.kv.create({
      path,
      data: body?.data ?? body,
      metadata: {
        created_time: new Date().toISOString(),
        destroyed: false,
        version: 1,
      },
    })
  }
}

function makeVaultKvHandlers(db: VaultDb): HttpHandler[] {
  return [
    // KV read/write — Vault KV engine uses data/ prefix
    http.get(`${KV_BASE}/data/*`, async ({ request }) => {
      const path = new URL(request.url).pathname.replace('/v1/kv/data/', '')
      const data = await findKv(db, path)
      if (!data) return HttpResponse.json({}, { status: 404 })
      return HttpResponse.json({ data: { data: data.data, metadata: data.metadata } })
    }),
    http.post(`${KV_BASE}/data/*`, async ({ request }) => {
      const path = new URL(request.url).pathname.replace('/v1/kv/data/', '')
      const body = await request.json() as any
      await upsertKv(db, path, body)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put(`${KV_BASE}/data/*`, async ({ request }) => {
      const path = new URL(request.url).pathname.replace('/v1/kv/data/', '')
      const body = await request.json() as any
      await upsertKv(db, path, body)
      return new HttpResponse(null, { status: 204 })
    }),

    // KV metadata list (GET)
    http.get(`${KV_BASE}/metadata/*`, async ({ request }) => {
      const path = new URL(request.url).pathname.replace(`${VAULT_INTERNAL_URL}/v1/kv/metadata/`, '')
      const all = await db.kv.findMany()
      const keys = Array.from(new Set(all
        .filter((r: any) => r.path.startsWith(path))
        .map((r: any) => r.path.slice(path.length).split('/')[0])
        .filter(Boolean)))
      return HttpResponse.json({ data: { keys } })
    }),
    http.delete(`${KV_BASE}/metadata/*`, () => new HttpResponse(null, { status: 204 })),

    // LIST method — Vault uses HTTP LIST for directory listing
    http.all(`${KV_BASE}/metadata/*`, async ({ request }) => {
      if (request.method !== 'LIST') return new Response(null, { status: 404 })
      const path = new URL(request.url).pathname.replace(`${VAULT_INTERNAL_URL}/v1/kv/metadata/`, '')
      const all = await db.kv.findMany()
      const keys = Array.from(new Set(all
        .filter((r: any) => r.path.startsWith(path))
        .map((r: any) => r.path.slice(path.length).split('/')[0])
        .filter(Boolean)))
      return HttpResponse.json({ data: { keys } })
    }),
  ]
}

function makeVaultSysHandlers(db: VaultDb): HttpHandler[] {
  const base = `${VAULT_INTERNAL_URL}/v1`

  return [
    // Sys policies
    http.post(`${base}/sys/policies/acl/:policy`, () => new HttpResponse(null, { status: 204 })),
    http.delete(`${base}/sys/policies/acl/:policy`, () => new HttpResponse(null, { status: 204 })),

    // Sys mounts
    http.post(`${base}/sys/mounts/:name`, () => new HttpResponse(null, { status: 204 })),
    http.post(`${base}/sys/mounts/:name/tune`, () => new HttpResponse(null, { status: 204 })),
    http.delete(`${base}/sys/mounts/:name`, () => new HttpResponse(null, { status: 204 })),

    // Auth approle
    http.post(`${base}/auth/approle/role/:role`, () => new HttpResponse(null, { status: 204 })),
    http.delete(`${base}/auth/approle/role/:role`, () => new HttpResponse(null, { status: 204 })),
    http.get(`${base}/auth/approle/role/:role/role-id`, () =>
      HttpResponse.json({ data: { role_id: faker.string.uuid() } })),
    http.post(`${base}/auth/approle/role/:role/secret-id`, () =>
      HttpResponse.json({ data: { secret_id: faker.string.uuid() } })),

    // Sys auth
    http.get(`${base}/sys/auth`, async () => {
      const methods = await db.authMethods.findMany()
      const obj: Record<string, { type: string, description?: string }> = {}
      methods.forEach((m: any, i: number) => {
        obj[`${m.type}-${i}/`] = { type: m.type, description: m.description }
      })
      return HttpResponse.json({ data: obj })
    }),
  ]
}

function makeVaultIdentityHandlers(db: VaultDb): HttpHandler[] {
  const base = `${VAULT_INTERNAL_URL}/v1`

  return [
    http.get(`${base}/identity/group/name/:name`, async ({ params }) => {
      const data = await db.identityGroups.findFirst((q: any) => q.where({ name: String(params.name) }))
      if (!data) return HttpResponse.json({}, { status: 404 })
      return HttpResponse.json({ data })
    }),
    http.post(`${base}/identity/group/name/:name`, async ({ request, params }) => {
      const body = await request.json() as any
      await db.identityGroups.create({
        id: faker.string.uuid(),
        name: String(params.name),
        alias: body?.alias,
      })
      return new HttpResponse(null, { status: 204 })
    }),
    http.post(`${base}/identity/group-alias`, () => new HttpResponse(null, { status: 204 })),
    http.delete(`${base}/identity/group/name/:name`, () => new HttpResponse(null, { status: 204 })),
  ]
}

function makeVaultTokenHandlers(): HttpHandler[] {
  const base = `${VAULT_INTERNAL_URL}/v1`

  return [
    http.post(`${base}/auth/token/create`, () =>
      HttpResponse.json({ auth: { client_token: 'token' } })),
  ]
}

export function makeVaultHandlers(db: VaultDb): HttpHandler[] {
  return [
    ...makeVaultKvHandlers(db),
    ...makeVaultSysHandlers(db),
    ...makeVaultIdentityHandlers(db),
    ...makeVaultTokenHandlers(),
  ]
}
