import type { HttpHandler } from 'msw'
import type { ProjectWithDetails } from './registry-datastore.service'
import type { RegistryResponse } from './registry-http-client.service'
import { faker } from '@faker-js/faker'
import { Collection } from '@msw/data'
import { HttpStatus } from '@nestjs/common'
import { http, HttpResponse } from 'msw'
import { z } from 'zod'

export const HARBOR_INTERNAL_URL = 'https://harbor.example'

const harborProjectSchema = z.object({
  name: z.string(),
  project_id: z.number().optional(),
  metadata: z.object({
    auto_scan: z.string().optional(),
    retention_id: z.string().optional(),
  }).optional(),
  storage_limit: z.number().optional(),
})

const harborRobotSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  secret: z.string().optional(),
  description: z.string().optional(),
  level: z.string().optional(),
  permissions: z.unknown().optional(),
})

const harborRetentionSchema = z.object({
  id: z.number().optional(),
  algorithm: z.string(),
  scope: z.object({ level: z.string(), ref: z.number() }),
  rules: z.array(z.unknown()),
  trigger: z.object({
    kind: z.string(),
    settings: z.record(z.unknown()),
    references: z.array(z.unknown()),
  }),
})

const harborRepositorySchema = z.object({
  name: z.string(),
})

const harborQuotaSchema = z.object({
  id: z.number().optional(),
  ref: z.object({ id: z.number().optional() }),
  hard: z.object({ storage: z.number().optional() }),
})

const harborMemberSchema = z.object({
  id: z.number().optional(),
  entity_name: z.string(),
  entity_type: z.string(),
  role_id: z.number(),
})

const harborRobotBodySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  level: z.string().optional(),
  permissions: z.unknown().optional(),
})

const harborMemberBodySchema = z.object({
  role_id: z.number(),
  member_group: z.object({ group_name: z.string(), group_type: z.number() }),
})

const harborProjectBodySchema = z.object({
  project_name: z.string(),
  storage_limit: z.number().optional(),
})

export function makeOkResponse<T>(data: T): RegistryResponse<T> {
  return { status: HttpStatus.OK, data }
}

export function makeCreatedResponse<T>(data: T): RegistryResponse<T> {
  return { status: HttpStatus.CREATED, data }
}

export function makeNoContent(): RegistryResponse<null> {
  return { status: HttpStatus.NO_CONTENT, data: null }
}

export function makeConflictResponse<T>(): RegistryResponse<T> {
  return {
    status: HttpStatus.BAD_REQUEST,
    data: { errors: [{ code: 'CONFLICT', message: 'already exists' }] } as T,
  }
}

export function makeHttpConflictResponse<T>(): RegistryResponse<T> {
  return { status: HttpStatus.CONFLICT, data: null }
}

export function makeProjectWithDetails(overrides: Partial<ProjectWithDetails> = {}): ProjectWithDetails {
  return {
    slug: faker.helpers.slugify(`test-project-${faker.string.uuid()}`),
    plugins: [],
    ...overrides,
  } satisfies ProjectWithDetails
}

export function makeRegistryDb() {
  return {
    projects: new Collection({ schema: harborProjectSchema }),
    robots: new Collection({ schema: harborRobotSchema }),
    retentions: new Collection({ schema: harborRetentionSchema }),
    repositories: new Collection({ schema: harborRepositorySchema }),
    quotas: new Collection({ schema: harborQuotaSchema }),
    members: new Collection({ schema: harborMemberSchema }),
  }
}

export function makeRobotPermissions() {
  return [{ namespace: 'myproj', kind: 'project', access: [{ resource: 'repository', action: 'pull' }] }] satisfies Array<{
    namespace: string
    kind: 'project'
    access: Array<{ resource: string, action: string }>
  }>
}

type Db = ReturnType<typeof makeRegistryDb>

function makeRegistryProjectsHandlers(db: Db): HttpHandler[] {
  const base = `${HARBOR_INTERNAL_URL}/api/v2.0`

  const findProject = async (name: string) =>
    db.projects.findFirst(q => q.where({ name }))

  const buildConflict = (message: string) =>
    HttpResponse.json({ errors: [{ code: 'CONFLICT', message }] }, { status: 400 })

  return [
    http.get(`${base}/projects/:projectName`, async ({ params }) => {
      const project = await findProject(String(params.projectName))
      if (!project) return HttpResponse.json({}, { status: 404 })
      return HttpResponse.json(project)
    }),
    http.post(`${base}/projects`, async ({ request }) => {
      const parsed = harborProjectBodySchema.safeParse(await request.json())
      if (!parsed.success) return HttpResponse.json({ errors: [{ code: 'BAD_REQUEST', message: parsed.error.message }] }, { status: 400 })
      const body = parsed.data
      const existing = await findProject(body.project_name)
      if (existing) return buildConflict(`project ${body.project_name} already exists`)
      const project = await db.projects.create({ name: body.project_name, project_id: faker.number.int(), storage_limit: body.storage_limit, metadata: {} })
      return HttpResponse.json({ project_id: project.project_id, metadata: {} }, { status: 201 })
    }),
    http.delete(`${base}/projects/:projectName`, () => new HttpResponse(null, { status: 204 })),
  ]
}

function makeRegistryRepositoriesHandlers(db: Db): HttpHandler[] {
  const base = `${HARBOR_INTERNAL_URL}/api/v2.0`

  return [
    http.get(`${base}/projects/:projectName/repositories`, async () => {
      return HttpResponse.json(await db.repositories.findMany())
    }),
    http.delete(`${base}/projects/:projectName/repositories/:repositoryName`, () =>
      new HttpResponse(null, { status: 204 })),
  ]
}

function makeRegistryQuotasHandlers(db: Db): HttpHandler[] {
  const base = `${HARBOR_INTERNAL_URL}/api/v2.0`

  return [
    http.get(`${base}/quotas`, async ({ request }) => {
      const url = new URL(request.url)
      const refIdParam = url.searchParams.get('reference_id')
      const all = await db.quotas.findMany()
      if (refIdParam !== null) {
        const refId = Number(refIdParam)
        if (!Number.isNaN(refId)) {
          const found = all.find((quota) => {
            if (quota == null || typeof quota !== 'object') return false
            if (!('ref' in quota)) return false
            const ref = quota.ref
            if (ref == null || typeof ref !== 'object') return false
            if (!('id' in ref)) return false
            return ref.id === refId
          })
          return HttpResponse.json(found ? [found] : [])
        }
      }
      return HttpResponse.json(all)
    }),
    http.put(`${base}/quotas/:id`, () => new HttpResponse(null, { status: 200 })),
  ]
}

function makeRegistryMembersHandlers(db: Db): HttpHandler[] {
  const base = `${HARBOR_INTERNAL_URL}/api/v2.0`

  const buildConflict = (message: string) =>
    HttpResponse.json({ errors: [{ code: 'CONFLICT', message }] }, { status: 400 })

  return [
    http.get(`${base}/projects/:projectName/members`, async () => {
      return HttpResponse.json(await db.members.findMany())
    }),
    http.post(`${base}/projects/:projectName/members`, async ({ request }) => {
      const parsed = harborMemberBodySchema.safeParse(await request.json())
      if (!parsed.success) return HttpResponse.json({ errors: [{ code: 'BAD_REQUEST', message: parsed.error.message }] }, { status: 400 })
      const body = parsed.data
      const existing = await db.members.findFirst(q => q.where({ entity_name: body.member_group.group_name }))
      if (existing) return buildConflict('member already exists')
      const member = await db.members.create({
        entity_name: body.member_group.group_name,
        entity_type: String(body.member_group.group_type),
        role_id: body.role_id,
      })
      return HttpResponse.json({ id: member.id ?? faker.number.int() }, { status: 201 })
    }),
    http.delete(`${base}/projects/:projectName/members/:memberId`, () =>
      new HttpResponse(null, { status: 204 })),
  ]
}

function makeRegistryRobotsHandlers(db: Db): HttpHandler[] {
  const base = `${HARBOR_INTERNAL_URL}/api/v2.0`

  const findRobot = async (name: string) =>
    db.robots.findFirst(q => q.where({ name }))

  const buildConflict = (message: string) =>
    HttpResponse.json({ errors: [{ code: 'CONFLICT', message }] }, { status: 400 })

  return [
    http.post(`${base}/robots`, async ({ request }) => {
      const parsed = harborRobotBodySchema.safeParse(await request.json())
      if (!parsed.success) return HttpResponse.json({ errors: [{ code: 'BAD_REQUEST', message: parsed.error.message }] }, { status: 400 })
      const body = parsed.data
      const existing = await findRobot(body.name)
      if (existing) return buildConflict(`robot ${body.name} already exists`)
      return HttpResponse.json({ id: faker.number.int(), name: body.name, secret: faker.string.sample(32) }, { status: 201 })
    }),
    http.get(`${base}/robots`, async () => {
      return HttpResponse.json(await db.robots.findMany())
    }),
    http.delete(`${base}/robots/:id`, () => new HttpResponse(null, { status: 200 })),
  ]
}

function makeRegistryRetentionsHandlers(): HttpHandler[] {
  const base = `${HARBOR_INTERNAL_URL}/api/v2.0`

  return [
    http.put(`${base}/retentions/:id`, () => new HttpResponse(null, { status: 200 })),
    http.post(`${base}/retentions`, () => HttpResponse.json({ id: faker.number.int() }, { status: 201 })),
  ]
}

export function makeRegistryHandlers(db: Db): HttpHandler[] {
  return [
    ...makeRegistryProjectsHandlers(db),
    ...makeRegistryRepositoriesHandlers(db),
    ...makeRegistryQuotasHandlers(db),
    ...makeRegistryMembersHandlers(db),
    ...makeRegistryRobotsHandlers(db),
    ...makeRegistryRetentionsHandlers(),
  ]
}
