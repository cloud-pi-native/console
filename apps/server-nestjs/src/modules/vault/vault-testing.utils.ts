import type { HttpHandler } from 'msw'
import { faker } from '@faker-js/faker'
import { Collection } from '@msw/data'
import { http, HttpResponse } from 'msw'
import { z } from 'zod'

export const VAULT_INTERNAL_URL = 'https://vault.internal'

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

export function makeVaultHandlers(db: ReturnType<typeof makeVaultDb>): HttpHandler[] {
  const base = `${VAULT_INTERNAL_URL}/v1`

  const findKv = async (path: string) =>
    db.kv.findFirst((q: any) => q.where({ path }))

  const upsertKv = async (path: string, body: any) => {
    const record = await findKv(path)
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

  return [
    // KV read/write — Vault KV engine uses data/ prefix
    http.get(`${base}/kv/data/*`, async ({ request }) => {
      const path = new URL(request.url).pathname.replace('/v1/kv/data/', '')
      const data = await findKv(path)
      if (!data) return HttpResponse.json({}, { status: 404 })
      return HttpResponse.json({ data: { data: data.data, metadata: data.metadata } })
    }),
    http.post(`${base}/kv/data/*`, async ({ request }) => {
      const path = new URL(request.url).pathname.replace('/v1/kv/data/', '')
      const body = await request.json() as any
      await upsertKv(path, body)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put(`${base}/kv/data/*`, async ({ request }) => {
      const path = new URL(request.url).pathname.replace('/v1/kv/data/', '')
      const body = await request.json() as any
      await upsertKv(path, body)
      return new HttpResponse(null, { status: 204 })
    }),

    // KV metadata list (GET)
    http.get(`${base}/kv/metadata/*`, async ({ request }) => {
      const path = new URL(request.url).pathname.replace(`${base}/kv/metadata/`, '')
      const all = await db.kv.findMany()
      const keys = Array.from(new Set(all
        .filter((r: any) => r.path.startsWith(path))
        .map((r: any) => r.path.slice(path.length).split('/')[0])
        .filter(Boolean)))
      return HttpResponse.json({ data: { keys } })
    }),
    http.delete(`${base}/kv/metadata/*`, () => new HttpResponse(null, { status: 204 })),

    // LIST method — Vault uses HTTP LIST for directory listing
    http.all(`${base}/kv/metadata/*`, async ({ request }) => {
      if (request.method !== 'LIST') return new Response(null, { status: 404 })
      const path = new URL(request.url).pathname.replace(`${base}/kv/metadata/`, '')
      const all = await db.kv.findMany()
      const keys = Array.from(new Set(all
        .filter((r: any) => r.path.startsWith(path))
        .map((r: any) => r.path.slice(path.length).split('/')[0])
        .filter(Boolean)))
      return HttpResponse.json({ data: { keys } })
    }),

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

    // Identity groups
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

    // Token create
    http.post(`${base}/auth/token/create`, () =>
      HttpResponse.json({ auth: { client_token: 'token' } })),
  ]
}
