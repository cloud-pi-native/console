import type { data } from '../../../../packages/test-utils/src/imports/data.ts'
import { ClusterPrivacy, ProjectStatus, TokenStatus, UserType } from '@prisma/client'
import { z } from 'zod'

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test']),
  INTEGRATION: z.string().optional().refine(value => value !== 'true', 'INTEGRATION environments cannot load fixtures'),
  DB_URL: z.string().url().refine((value) => {
    if (!URL.canParse(value)) return false
    const url = new URL(value)
    return ['postgres:', 'postgresql:'].includes(url.protocol) && url.hostname.length > 0 && url.pathname.length > 1
  }, 'DB_URL must identify a PostgreSQL database'),
})

const permissionSchema = z.string().regex(/^\d+n$/).transform(value => BigInt(value.slice(0, -1)))
const adminRoleSchema = z.object({ permissions: permissionSchema })
const adminTokenSchema = adminRoleSchema.extend({ status: z.nativeEnum(TokenStatus).default(TokenStatus.active) })
const projectSchema = z.object({ everyonePerms: permissionSchema, status: z.nativeEnum(ProjectStatus) })
const clusterSchema = z.object({ privacy: z.nativeEnum(ClusterPrivacy) })
const userSchema = z.object({ type: z.nativeEnum(UserType) })
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
const jsonSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(jsonSchema),
  z.record(jsonSchema),
]))
const jsonObjectSchema = z.record(jsonSchema)
const associationSchema = z.object({
  associations: z.array(z.tuple([
    z.literal('cluster'),
    z.array(z.object({
      id: z.string(),
      projects: z.array(z.object({ id: z.string() })).optional(),
      stages: z.array(z.object({ id: z.string() })).optional(),
    })),
  ])),
})

export function parseFixtureConfig(env: NodeJS.ProcessEnv, args: string[]) {
  if (args.length !== 1 || args[0] !== '--reset') {
    throw new Error('Fixture reset requires the single argument --reset (all existing data will be deleted)')
  }
  const config = configSchema.parse(env)
  return { dbUrl: config.DB_URL }
}

// The dataset is versioned TypeScript, not an arbitrary import file. Parse only
// serialized values whose inferred source types are wider than their DB types.
export function parseFixtures(input: typeof data) {
  return {
    ...input,
    adminRole: input.adminRole.map(row => ({ ...row, ...adminRoleSchema.parse(row) })),
    adminToken: input.adminToken.map(row => ({ ...row, ...adminTokenSchema.parse(row) })),
    projectRole: input.projectRole.map(row => ({ ...row, ...adminRoleSchema.parse(row) })),
    project: input.project.map(row => ({ ...row, ...projectSchema.parse(row) })),
    cluster: input.cluster.map(row => ({ ...row, ...clusterSchema.parse(row) })),
    user: input.user.map(row => ({ ...row, ...userSchema.parse(row) })),
    log: input.log.map(row => ({ ...row, data: jsonObjectSchema.parse(row.data) })),
    associations: associationSchema.parse(input).associations,
  }
}

export type Fixtures = ReturnType<typeof parseFixtures>
