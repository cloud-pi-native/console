import type { HttpHandler } from 'msw'
import type { ProjectWithDetails } from './nexus-datastore.service'
import { faker } from '@faker-js/faker'
import { Collection } from '@msw/data'
import { http, HttpResponse } from 'msw'
import { z } from 'zod'

export const NEXUS_INTERNAL_URL = 'https://nexus.internal'

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}): ProjectWithDetails {
  return {
    slug: faker.internet.domainWord(),
    owner: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
    },
    plugins: [],
    ...overrides,
  } satisfies ProjectWithDetails
}

const repositorySchema = z.object({
  name: z.string(),
  online: z.boolean(),
  storage: z.object({
    blobStoreName: z.string(),
    strictContentTypeValidation: z.boolean(),
    writePolicy: z.string(),
  }),
  cleanup: z.object({ policyNames: z.array(z.string()) }).optional(),
  component: z.object({ proprietaryComponents: z.boolean() }).optional(),
  maven: z.object({
    versionPolicy: z.string(),
    layoutPolicy: z.string(),
    contentDisposition: z.string(),
  }).optional(),
  group: z.object({ memberNames: z.array(z.string()) }).optional(),
})

const privilegeSchema = z.object({
  name: z.string(),
  description: z.string(),
  actions: z.array(z.string()),
  format: z.string(),
  repository: z.string(),
  type: z.string().optional(),
})

const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  privileges: z.array(z.string()),
  source: z.string().optional(),
  roles: z.array(z.string()).optional(),
  description: z.string().optional(),
})

const userSchema = z.object({
  userId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  emailAddress: z.string().optional(),
  status: z.string().optional(),
  roles: z.array(z.string()).optional(),
})

/**
 * In-memory fake of the Nexus API surface used by NexusClientService.
 * Seed the collections, pass them to makeNexusHandlers, then assert
 * against the same collections in the spec.
 */
export function makeNexusDb() {
  return {
    mavenHosted: new Collection({ schema: repositorySchema }),
    mavenGroup: new Collection({ schema: repositorySchema }),
    npmHosted: new Collection({ schema: repositorySchema }),
    npmGroup: new Collection({ schema: repositorySchema }),
    privileges: new Collection({ schema: privilegeSchema }),
    roles: new Collection({ schema: roleSchema }),
    users: new Collection({ schema: userSchema }),
  }
}

export function makeNexusHandlers(db: ReturnType<typeof makeNexusDb>): HttpHandler[] {
  const url = `${NEXUS_INTERNAL_URL}/service/rest/v1`

  const getOr404 = async (collection: Collection<any>, name: string) => {
    const data = await collection.findFirst((q: any) => q.where({ name }))
    if (!data) return HttpResponse.json({}, { status: 404 })
    return HttpResponse.json(data)
  }

  return [
    http.get(`${url}/repositories/maven/hosted/:name`, async ({ params }) => getOr404(db.mavenHosted, String(params.name))),
    http.post(`${url}/repositories/maven/hosted`, async ({ request }) => {
      await db.mavenHosted.create(await request.json() as any)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put(`${url}/repositories/maven/hosted/:name`, async ({ request, params }) => {
      const data = await request.json() as any
      const record = await db.mavenHosted.findFirst((q: any) => q.where({ name: params.name }))
      if (record) await db.mavenHosted.update(record, { data: () => data })
      else await db.mavenHosted.create(data)
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(`${url}/repositories/maven/group/:name`, async ({ params }) => getOr404(db.mavenGroup, String(params.name))),
    http.post(`${url}/repositories/maven/group`, async ({ request }) => {
      await db.mavenGroup.create(await request.json() as any)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put(`${url}/repositories/maven/group/:name`, async ({ request, params }) => {
      const data = await request.json() as any
      const record = await db.mavenGroup.findFirst((q: any) => q.where({ name: params.name }))
      if (record) await db.mavenGroup.update(record, { data: () => data })
      else await db.mavenGroup.create(data)
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(`${url}/repositories/npm/hosted/:name`, async ({ params }) => getOr404(db.npmHosted, String(params.name))),
    http.post(`${url}/repositories/npm/hosted`, async ({ request }) => {
      await db.npmHosted.create(await request.json() as any)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put(`${url}/repositories/npm/hosted/:name`, async ({ request, params }) => {
      const data = await request.json() as any
      const record = await db.npmHosted.findFirst((q: any) => q.where({ name: params.name }))
      if (record) await db.npmHosted.update(record, { data: () => data })
      else await db.npmHosted.create(data)
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(`${url}/repositories/npm/group/:name`, async ({ params }) => getOr404(db.npmGroup, String(params.name))),
    http.post(`${url}/repositories/npm/group`, async ({ request }) => {
      await db.npmGroup.create(await request.json() as any)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put(`${url}/repositories/npm/group/:name`, async ({ request, params }) => {
      const data = await request.json() as any
      const record = await db.npmGroup.findFirst((q: any) => q.where({ name: params.name }))
      if (record) await db.npmGroup.update(record, { data: () => data })
      else await db.npmGroup.create(data)
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(`${url}/security/privileges/:name`, async ({ params }) => getOr404(db.privileges, String(params.name))),
    http.post(`${url}/security/privileges/repository-view`, async ({ request }) => {
      await db.privileges.create(await request.json() as any)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put(`${url}/security/privileges/repository-view/:name`, async ({ request, params }) => {
      const data = await request.json() as any
      const record = await db.privileges.findFirst((q: any) => q.where({ name: params.name }))
      if (record) await db.privileges.update(record, { data: () => data })
      else await db.privileges.create(data)
      return new HttpResponse(null, { status: 204 })
    }),
    http.delete(`${url}/security/privileges/:name`, async ({ params }) => {
      await db.privileges.deleteMany((q: any) => q.where({ name: params.name }))
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(`${url}/security/roles/:id`, async ({ params }) => {
      const data = await db.roles.findFirst((q: any) => q.where({ id: params.id }))
      if (!data) return HttpResponse.json({}, { status: 404 })
      return HttpResponse.json(data)
    }),
    http.post(`${url}/security/roles`, async ({ request }) => {
      await db.roles.create(await request.json() as any)
      return new HttpResponse(null, { status: 204 })
    }),
    http.put(`${url}/security/roles/:id`, async ({ request, params }) => {
      const data = await request.json() as any
      const record = await db.roles.findFirst((q: any) => q.where({ id: params.id }))
      if (record) await db.roles.update(record, { data: () => data })
      else await db.roles.create(data)
      return new HttpResponse(null, { status: 204 })
    }),
    http.delete(`${url}/security/roles/:id`, async ({ params }) => {
      await db.roles.deleteMany((q: any) => q.where({ id: params.id }))
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(`${url}/security/users`, async ({ request }) => {
      const userId = new URL(request.url).searchParams.get('userId')
      const users = userId
        ? await db.users.findMany((q: any) => q.where({ userId }))
        : await db.users.findMany()
      return HttpResponse.json(users)
    }),
    http.put(`${url}/security/users/:userId/change-password`, () => new HttpResponse(null, { status: 204 })),
    http.post(`${url}/security/users`, async ({ request }) => {
      await db.users.create(await request.json() as any)
      return new HttpResponse(null, { status: 204 })
    }),
    http.delete(`${url}/security/users/:userId`, async ({ params }) => {
      await db.users.deleteMany((q: any) => q.where({ userId: params.userId }))
      return new HttpResponse(null, { status: 204 })
    }),
    http.delete(`${url}/repositories/:name`, async ({ params }) => {
      await Promise.all([
        db.mavenHosted.deleteMany((q: any) => q.where({ name: params.name })),
        db.mavenGroup.deleteMany((q: any) => q.where({ name: params.name })),
        db.npmHosted.deleteMany((q: any) => q.where({ name: params.name })),
        db.npmGroup.deleteMany((q: any) => q.where({ name: params.name })),
      ])
      return new HttpResponse(null, { status: 204 })
    }),
  ]
}
