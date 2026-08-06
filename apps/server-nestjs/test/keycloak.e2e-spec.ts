import type KcAdminClient from '@keycloak/keycloak-admin-client'
import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { Logger } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import z from 'zod'
import { baseConfigFactory } from '../src/config/base.config'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { KEYCLOAK_ADMIN_CLIENT, KeycloakClientService } from '../src/modules/keycloak/keycloak-client.service'
import { projectSelect } from '../src/modules/keycloak/keycloak-datastore.service'
import { KeycloakModule } from '../src/modules/keycloak/keycloak.module'
import { getDotenvPaths } from '../src/utils/dotenv.utils'
import { KEYCLOAK_GROUP_SYNC_TIMEOUT } from './e2e-timeout'

const canRunKeycloakE2E
  = Boolean(process.env.E2E)

const describeWithKeycloak = describe.runIf(canRunKeycloakE2E)

describeWithKeycloak('KeycloakService (e2e)', () => {
  let moduleRef: TestingModule
  let eventEmitter: EventEmitter2
  let keycloak: KeycloakClientService
  let keycloakAdminClient: KcAdminClient
  let prisma: PrismaService

  let ownerId: string
  let testProjectId: string
  let testProjectSlug: string
  let testRoleName: string
  let testRoleId: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [KeycloakModule, ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory] }), AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule],
    }).compile()

    await moduleRef.init()

    keycloak = moduleRef.get<KeycloakClientService>(KeycloakClientService)
    keycloakAdminClient = moduleRef.get<KcAdminClient>(KEYCLOAK_ADMIN_CLIENT)
    prisma = moduleRef.get<PrismaService>(PrismaService)
    eventEmitter = moduleRef.get<EventEmitter2>(EventEmitter2)

    ownerId = faker.string.uuid()
    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)
    testRoleName = faker.helpers.slugify(`test-role-${faker.string.uuid()}`)
    testRoleId = faker.string.uuid()

    const ownerEmail = faker.internet.email({ firstName: 'test-owner', provider: 'example.com' })

    // Create owner in Keycloak
    const createdUser = await keycloakAdminClient.users.create({
      id: ownerId,
      username: `test-owner-${ownerId}`,
      email: ownerEmail,
      enabled: true,
      firstName: 'Test',
      lastName: 'Owner',
    })
    if (createdUser.id) {
      ownerId = createdUser.id
    }

    // Create owner in DB
    await prisma.user.create({
      data: {
        id: ownerId,
        email: ownerEmail,
        firstName: 'Test',
        lastName: 'Owner',
        type: 'human',
      },
    })
  })

  afterAll(async () => {
    try {
      // Clean Keycloak
      const group = await keycloak.getGroupByPath(`/${testProjectSlug}`)
      if (group?.id) {
        await keycloak.deleteGroup(group.id)
      }

      // Clean owner user
      if (ownerId) {
        await keycloakAdminClient.users.del({ id: ownerId }).catch(() => {})
        if (prisma) {
          await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
        }
      }

      // Clean DB
      if (prisma) {
        await prisma.projectMembers.deleteMany({ where: { projectId: testProjectId } })
        // Prisma cascade delete should handle roles/envs if configured correctly, but explicit delete is safer
        // We catch errors to avoid failing cleanup if tables/relations are different
        await prisma.project.deleteMany({ where: { id: testProjectId } }).catch(() => {})
      }
    } catch (e: any) {
      Logger.warn(`Cleanup failed: ${e.message}`)
    }

    await moduleRef?.close()

    vi.unstubAllEnvs()
  })

  it('should reconcile and create groups in Keycloak', async () => {
    // Create Project in DB
    await prisma.project.create({
      data: {
        id: testProjectId,
        slug: testProjectSlug,
        name: testProjectSlug,
        ownerId,
        description: 'E2E Test Project',
        hprodCpu: 0,
        hprodGpu: 0,
        hprodMemory: 0,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
        roles: {
          create: {
            id: testRoleId,
            name: testRoleName,
            oidcGroup: `/${testRoleName}`,
            permissions: BigInt(0),
            position: 0,
          },
        },
      },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    // Act
    await eventEmitter.emitAsync('project.upsert', project)

    // Assert
    // Check main project group
    const projectGroup = z.object({
      id: z.string(),
      name: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}`))
    expect(projectGroup.name).toBe(testProjectSlug)

    const consoleGroup = z.object({
      id: z.string(),
      name: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}/console`))
    expect(consoleGroup.name).toBe('console')

    // Check role group
    const roleGroup = z.object({
      name: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}/console/${testRoleName}`))
    expect(roleGroup.name).toBe(testRoleName)

    // Check membership (owner should be added)
    const members = await keycloak.getGroupMembers(projectGroup.id)
    const isMember = members.some(m => m.id === ownerId)
    expect(isMember).toBe(true)
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should add member to project group when added in DB', async () => {
    // Create another user in Keycloak and DB
    const newUserId = faker.string.uuid()
    const newUserEmail = `test-user-${newUserId}@example.com`

    // Create in Keycloak
    const kcUser = await keycloakAdminClient.users.create({
      username: `test-user-${newUserId}`,
      email: newUserEmail,
      enabled: true,
      firstName: 'Test',
      lastName: 'User',
    })

    // Create in DB
    await prisma.user.create({
      data: {
        id: kcUser.id,
        email: newUserEmail,
        firstName: 'Test',
        lastName: 'User',
        type: 'human',
      },
    })

    // Add member to project in DB
    await prisma.projectMembers.create({
      data: {
        projectId: testProjectId,
        userId: kcUser.id,
        roleIds: [testRoleId],
      },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    // Act
    await eventEmitter.emitAsync('project.upsert', project)

    // Assert
    const projectGroup = z.object({
      id: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}`))
    const members = await keycloak.getGroupMembers(projectGroup.id)
    const isMember = members.some(m => m.id === kcUser.id)
    expect(isMember).toBe(true)

    // Check role group membership
    const roleGroup = z.object({
      id: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}/console/${testRoleName}`))
    const roleMembers = await keycloak.getGroupMembers(roleGroup.id)
    const isRoleMember = roleMembers.some(m => m.id === kcUser.id)
    expect(isRoleMember).toBe(true)

    // Cleanup user
    await keycloakAdminClient.users.del({ id: kcUser.id })
    await prisma.projectMembers.deleteMany({ where: { userId: kcUser.id } })
    await prisma.user.delete({ where: { id: kcUser.id } })
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should remove member from project group when removed in DB', async () => {
    const newUserId = faker.string.uuid()
    const newUserEmail = `test-user-remove-${newUserId}@example.com`

    // Create in Keycloak
    const kcUser = await keycloakAdminClient.users.create({
      username: `test-user-remove-${newUserId}`,
      email: newUserEmail,
      enabled: true,
      firstName: 'Test',
      lastName: 'UserRemove',
    })

    // Create in DB
    await prisma.user.create({
      data: {
        id: kcUser.id,
        email: newUserEmail,
        firstName: 'Test',
        lastName: 'UserRemove',
        type: 'human',
      },
    })

    // Add member to project in DB
    await prisma.projectMembers.create({
      data: {
        projectId: testProjectId,
        userId: kcUser.id,
        roleIds: [], // No roles
      },
    })

    let project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    // Sync add
    await eventEmitter.emitAsync('project.upsert', project)

    // Verify added
    const projectGroup = z.object({
      id: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}`))
    let members = await keycloak.getGroupMembers(projectGroup.id)
    expect(members.some(m => m.id === kcUser.id)).toBe(true)

    // Remove from DB
    await prisma.projectMembers.delete({
      where: {
        projectId_userId: {
          projectId: testProjectId,
          userId: kcUser.id,
        },
      },
    })

    project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    // Sync remove
    await eventEmitter.emitAsync('project.upsert', project)

    // Verify removed
    members = await keycloak.getGroupMembers(projectGroup.id)
    expect(members.some(m => m.id === kcUser.id)).toBe(false)

    // Cleanup
    await keycloakAdminClient.users.del({ id: kcUser.id })
    await prisma.projectMembers.deleteMany({ where: { userId: kcUser.id } })
    await prisma.user.delete({ where: { id: kcUser.id } })
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should handle non-existent users gracefully', async () => {
    // Add a member in DB that does not exist in Keycloak
    const fakeUserId = faker.string.uuid()

    await prisma.user.create({
      data: {
        id: fakeUserId,
        email: `fake-${fakeUserId}@example.com`,
        firstName: 'Fake',
        lastName: 'User',
        type: 'human',
      },
    })

    await prisma.projectMembers.create({
      data: {
        projectId: testProjectId,
        userId: fakeUserId,
        roleIds: [],
      },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    // Act - should not throw
    await expect(eventEmitter.emitAsync('project.upsert', project)).resolves.not.toThrow()

    // Cleanup
    await prisma.projectMembers.deleteMany({ where: { userId: fakeUserId } })
    await prisma.user.delete({ where: { id: fakeUserId } })
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should add user back to Keycloak group if missing but present in DB', async () => {
    // Create user and add to project in DB
    const newUserId = faker.string.uuid()
    const newUserEmail = `test-user-sync-${newUserId}@example.com`

    const kcUser = await keycloakAdminClient.users.create({
      username: `test-user-sync-${newUserId}`,
      email: newUserEmail,
      enabled: true,
      firstName: 'Test',
      lastName: 'UserSync',
    })

    await prisma.user.create({
      data: {
        id: kcUser.id,
        email: newUserEmail,
        firstName: 'Test',
        lastName: 'UserSync',
        type: 'human',
      },
    })

    await prisma.projectMembers.create({
      data: {
        projectId: testProjectId,
        userId: kcUser.id,
        roleIds: [],
      },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    // Sync to ensure they are added initially
    await eventEmitter.emitAsync('project.upsert', project)

    const projectGroup = z.object({
      id: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}`))

    // Manually remove user from Keycloak group
    await keycloak.removeUserFromGroup(kcUser.id, projectGroup.id)

    // Verify removal
    let members = await keycloak.getGroupMembers(projectGroup.id)
    expect(members.some(m => m.id === kcUser.id)).toBe(false)

    // Sync again
    await eventEmitter.emitAsync('project.upsert', project)

    // Verify added back
    members = await keycloak.getGroupMembers(projectGroup.id)
    expect(members.some(m => m.id === kcUser.id)).toBe(true)

    // Cleanup
    await keycloakAdminClient.users.del({ id: kcUser.id })
    await prisma.projectMembers.deleteMany({ where: { userId: kcUser.id } })
    await prisma.user.delete({ where: { id: kcUser.id } })
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should remove user from Keycloak group if present but missing in DB', async () => {
    // Create user
    const newUserId = faker.string.uuid()
    const newUserEmail = `test-user-orphan-${newUserId}@example.com`

    const kcUser = await keycloakAdminClient.users.create({
      username: `test-user-orphan-${newUserId}`,
      email: newUserEmail,
      enabled: true,
      firstName: 'Test',
      lastName: 'UserOrphan',
    })

    // We only need them in Keycloak for this test, but the controller checks if user is in DB to define "missing".
    // Actually, `deleteExtraProjectMembers` iterates over Keycloak group members.
    // So we don't strictly need the user in DB, but to be "clean" we should probably have them in DB but NOT in the project.

    await prisma.user.create({
      data: {
        id: kcUser.id,
        email: newUserEmail,
        firstName: 'Test',
        lastName: 'UserOrphan',
        type: 'human',
      },
    })

    // Get project from DB (user is NOT a member)
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    // Sync to create group
    await eventEmitter.emitAsync('project.upsert', project)

    // Manually add user to Keycloak group
    const projectGroup = z.object({
      id: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}`))
    await keycloak.addUserToGroup(kcUser.id, projectGroup.id)

    // Verify added
    let members = await keycloak.getGroupMembers(projectGroup.id)
    expect(members.some(m => m.id === kcUser.id)).toBe(true)

    // Sync again to remove user
    await eventEmitter.emitAsync('project.upsert', project)

    // Verify removed
    members = await keycloak.getGroupMembers(projectGroup.id)
    expect(members.some(m => m.id === kcUser.id)).toBe(false)

    // Cleanup
    await keycloakAdminClient.users.del({ id: kcUser.id })
    await prisma.projectMembers.deleteMany({ where: { userId: kcUser.id } })
    await prisma.user.delete({ where: { id: kcUser.id } })
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should recreate project group if deleted in Keycloak', async () => {
    // Ensure project exists and is synced
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    await eventEmitter.emitAsync('project.upsert', project)

    const projectGroup = z.object({
      id: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}`))

    // Delete group in Keycloak
    await keycloak.deleteGroup(projectGroup.id)

    // Verify deleted
    const deletedProjectGroup = await keycloak.getGroupByPath(`/${testProjectSlug}`)
    expect(deletedProjectGroup).toBeUndefined()

    // Sync
    await eventEmitter.emitAsync('project.upsert', project)

    // Verify recreated
    const recreatedProjectGroup = z.object({
      name: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}`))
    expect(recreatedProjectGroup?.name).toBe(testProjectSlug)
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should recreate role group if deleted in Keycloak', async () => {
    // Ensure project exists and is synced
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    await eventEmitter.emitAsync('project.upsert', project)

    const roleGroup = z.object({
      id: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}/console/${testRoleName}`))

    // Delete role group in Keycloak
    await keycloak.deleteGroup(roleGroup.id)

    // Verify deleted
    const deletedRoleGroup = await keycloak.getGroupByPath(`/${testProjectSlug}/console/${testRoleName}`)
    expect(deletedRoleGroup).toBeUndefined()

    // Sync
    await eventEmitter.emitAsync('project.upsert', project)

    // Verify recreated
    const recreatedRoleGroup = z.object({
      name: z.string(),
    }).parse(await keycloak.getGroupByPath(`/${testProjectSlug}/console/${testRoleName}`))
    expect(recreatedRoleGroup?.name).toBe(testRoleName)
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)

  it('should remove project groups from Keycloak on delete', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    await eventEmitter.emitAsync('project.delete', project)

    expect(await keycloak.getGroupByPath(`/${testProjectSlug}`)).toBeTruthy()

    const deletedProjectGroup = await keycloak.getGroupByPath(`/${testProjectSlug}`)
    expect(deletedProjectGroup).toBeUndefined()

    const deletedConsoleGroup = await keycloak.getGroupByPath(`/${testProjectSlug}/console`)
    expect(deletedConsoleGroup).toBeUndefined()
  }, KEYCLOAK_GROUP_SYNC_TIMEOUT)
})
