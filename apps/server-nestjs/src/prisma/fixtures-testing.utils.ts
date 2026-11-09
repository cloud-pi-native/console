import type { PrismaClient } from '@prisma/client'
import { data } from '@cpn-console/test-utils'
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
const roleSchema = z.object({ permissions: permissionSchema })
const tokenSchema = roleSchema.extend({ status: z.nativeEnum(TokenStatus).default(TokenStatus.active) })
const projectSchema = z.object({ everyonePerms: permissionSchema, status: z.nativeEnum(ProjectStatus) })
const clusterSchema = z.object({ privacy: z.nativeEnum(ClusterPrivacy) })
const userSchema = z.object({ type: z.nativeEnum(UserType) })
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

export function parseFixtures(input: typeof data) {
  return {
    ...input,
    adminRole: input.adminRole.map(row => ({ ...row, ...roleSchema.parse(row) })),
    adminToken: input.adminToken.map(row => ({ ...row, ...tokenSchema.parse(row) })),
    projectRole: input.projectRole.map(row => ({ ...row, ...roleSchema.parse(row) })),
    project: input.project.map(row => ({ ...row, ...projectSchema.parse(row) })),
    cluster: input.cluster.map(row => ({ ...row, ...clusterSchema.parse(row) })),
    user: input.user.map(row => ({ ...row, ...userSchema.parse(row) })),
    associations: associationSchema.parse(input).associations,
  }
}

export async function resetFixtures(prisma: PrismaClient, fixtures = parseFixtures(data)): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.deploymentExternalValueSource.deleteMany()
    await tx.deploymentInternalValueSource.deleteMany()
    await tx.deploymentSource.deleteMany()
    await tx.deployment.deleteMany()
    await tx.log.deleteMany()
    await tx.personalAccessToken.deleteMany()
    await tx.adminToken.deleteMany()
    await tx.projectMembers.deleteMany()
    await tx.projectRole.deleteMany()
    await tx.projectPlugin.deleteMany()
    await tx.repository.deleteMany()
    await tx.environment.deleteMany()
    await tx.projectClusterHistory.deleteMany()
    await tx.project.deleteMany()
    await tx.cluster.deleteMany()
    await tx.kubeconfig.deleteMany()
    await tx.zone.deleteMany()
    await tx.stage.deleteMany()
    await tx.user.deleteMany()
    await tx.adminRole.deleteMany()
    await tx.adminPlugin.deleteMany()
    await tx.systemSetting.deleteMany()

    await tx.adminRole.createMany({ data: fixtures.adminRole })
    await tx.adminPlugin.createMany({ data: fixtures.adminPlugin })
    await tx.systemSetting.createMany({ data: fixtures.systemSetting })
    await tx.user.createMany({ data: fixtures.user })
    await tx.adminToken.createMany({ data: fixtures.adminToken })
    await tx.personalAccessToken.createMany({ data: fixtures.personalAccessToken })
    await tx.kubeconfig.createMany({ data: fixtures.kubeconfig })
    await tx.zone.createMany({ data: fixtures.zone })
    await tx.stage.createMany({ data: fixtures.stage })
    await tx.cluster.createMany({ data: fixtures.cluster })
    await tx.project.createMany({ data: fixtures.project })
    await tx.environment.createMany({ data: fixtures.environment })
    await tx.repository.createMany({ data: fixtures.repository })
    await tx.projectClusterHistory.createMany({ data: fixtures.projectClusterHistory })
    await tx.projectMembers.createMany({ data: fixtures.projectMembers })
    await tx.projectRole.createMany({ data: fixtures.projectRole })
    await tx.projectPlugin.createMany({ data: fixtures.projectPlugin })
    await tx.deployment.createMany({ data: fixtures.deployment })
    await tx.deploymentSource.createMany({ data: fixtures.deploymentSource })
    await tx.deploymentInternalValueSource.createMany({ data: fixtures.deploymentInternalValueSource })
    await tx.deploymentExternalValueSource.createMany({ data: fixtures.deploymentExternalValueSource })
    await tx.log.createMany({ data: fixtures.log })

    for (const [, rows] of fixtures.associations) {
      for (const row of rows) {
        await tx.cluster.update({
          where: { id: row.id },
          data: {
            ...(row.projects ? { projects: { connect: row.projects } } : {}),
            ...(row.stages ? { stages: { connect: row.stages } } : {}),
          },
        })
      }
    }
  }, { timeout: 30000 })
}
