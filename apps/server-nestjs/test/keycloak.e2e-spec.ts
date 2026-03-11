import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { KeycloakModule } from '@/modules/keycloak/keycloak.module'
import { KeycloakControllerService } from '@/modules/keycloak/keycloak-controller.service'
import { projectSelect } from '@/modules/keycloak/keycloak-datastore.service'
import { PrismaService } from '@/cpin-module/infrastructure/database/prisma.service'
import { KeycloakService } from '@/modules/keycloak/keycloak.service'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ConfigurationModule } from '../src/cpin-module/infrastructure/configuration/configuration.module'
import { Logger } from '@nestjs/common'
import { KeycloakClientService } from '@/modules/keycloak/keycloak-client.service'
import { InfrastructureModule } from '@/cpin-module/infrastructure/infrastructure.module'
import z from 'zod'
import { faker } from '@faker-js/faker'

const canRunKeycloakE2E
  = Boolean(process.env.KEYCLOAK_DOMAIN)
    && Boolean(process.env.KEYCLOAK_REALM)
    && Boolean(process.env.KEYCLOAK_PROTOCOL)
    && Boolean(process.env.KEYCLOAK_ADMIN)
    && Boolean(process.env.KEYCLOAK_ADMIN_PASSWORD)

describe.runIf(canRunKeycloakE2E)('KeycloakController (e2e)', () => {
  let moduleRef: TestingModule
  let keycloakController: KeycloakControllerService
  let keycloakService: KeycloakService
  let keycloakClient: KeycloakClientService
  let prisma: PrismaService

  let ownerId: string
  let testProjectId: string
  let testProjectSlug: string
  let ownerEmail: string
  let testRoleName: string
  let testRoleId: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [KeycloakModule, ConfigurationModule, InfrastructureModule],
    }).compile()

    await moduleRef.init()

    keycloakController = moduleRef.get<KeycloakControllerService>(KeycloakControllerService)
    keycloakService = moduleRef.get<KeycloakService>(KeycloakService)
    keycloakClient = moduleRef.get<KeycloakClientService>(KeycloakClientService)
    prisma = moduleRef.get<PrismaService>(PrismaService)

    ownerId = faker.string.uuid()
    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)
    ownerEmail = faker.internet.email({ firstName: 'test-owner', provider: 'example.com' })
    testRoleName = faker.helpers.slugify(`test-role-${faker.string.uuid()}`)
    testRoleId = faker.string.uuid()

    // Create owner in Keycloak
    const createdUser = await keycloakClient.users.create({
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
      const group = await keycloakService.getGroupByPath(`/${testProjectSlug}`)
      if (group) {
        await keycloakService.deleteGroup(group.id!)
      }

      // Clean owner user
      if (ownerId) {
        await keycloakClient.users.del({ id: ownerId }).catch(() => {})
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

    await moduleRef.close()

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
            oidcGroup: `/${testProjectSlug}/${testRoleName}`,
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
    await keycloakController.handleUpsert(project)

    // Assert
    // Check main project group
    const projectGroup = z.object({
      id: z.string(),
      name: z.string(),
    }).parse(await keycloakService.getGroupByPath(`/${testProjectSlug}`))
    expect(projectGroup.name).toBe(testProjectSlug)

    // Check role group
    const roleGroup = z.object({
      name: z.string(),
    }).parse(await keycloakService.getGroupByPath(`/${testProjectSlug}/${testRoleName}`))
    expect(roleGroup.name).toBe(testRoleName)

    // Check membership (owner should be added)
    const members = await keycloakService.getGroupMembers(projectGroup.id)
    const isMember = members.some(m => m.id === ownerId)
    expect(isMember).toBe(true)
  }, 60000)

  it('should add member to project group when added in DB', async () => {
    // Create another user in Keycloak and DB
    const newUserId = faker.string.uuid()
    const newUserEmail = `test-user-${newUserId}@example.com`

    // Create in Keycloak
    const kcUser = await keycloakClient.users.create({
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
    await keycloakController.handleUpsert(project)

    // Assert
    const projectGroup = z.object({
      id: z.string(),
    }).parse(await keycloakService.getGroupByPath(`/${testProjectSlug}`))
    const members = await keycloakService.getGroupMembers(projectGroup.id)
    const isMember = members.some(m => m.id === kcUser.id)
    expect(isMember).toBe(true)

    // Check role group membership
    const roleGroup = z.object({
      id: z.string(),
    }).parse(await keycloakService.getGroupByPath(`/${testProjectSlug}/${testRoleName}`))
    const roleMembers = await keycloakService.getGroupMembers(roleGroup.id)
    const isRoleMember = roleMembers.some(m => m.id === kcUser.id)
    expect(isRoleMember).toBe(true)

    // Cleanup user
    await keycloakClient.users.del({ id: kcUser.id })
    await prisma.projectMembers.deleteMany({ where: { userId: kcUser.id } })
    await prisma.user.delete({ where: { id: kcUser.id } })
  }, 60000)

  it('should remove member from project group when removed in DB', async () => {
    const newUserId = faker.string.uuid()
    const newUserEmail = `test-user-remove-${newUserId}@example.com`

    // Create in Keycloak
    const kcUser = await keycloakClient.users.create({
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
    await keycloakController.handleUpsert(project)

    // Verify added
    const projectGroup = z.object({
      id: z.string(),
    }).parse(await keycloakService.getGroupByPath(`/${testProjectSlug}`))
    let members = await keycloakService.getGroupMembers(projectGroup.id)
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
    await keycloakController.handleUpsert(project)

    // Verify removed
    members = await keycloakService.getGroupMembers(projectGroup.id)
    expect(members.some(m => m.id === kcUser.id)).toBe(false)

    // Cleanup
    await keycloakClient.users.del({ id: kcUser.id })
    await prisma.projectMembers.deleteMany({ where: { userId: kcUser.id } })
    await prisma.user.delete({ where: { id: kcUser.id } })
  }, 60000)

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
    await expect(keycloakController.handleUpsert(project)).resolves.not.toThrow()

    // Cleanup
    await prisma.projectMembers.deleteMany({ where: { userId: fakeUserId } })
    await prisma.user.delete({ where: { id: fakeUserId } })
  }, 60000)

  it('should add user back to Keycloak group if missing but present in DB', async () => {
    // Create user and add to project in DB
    const newUserId = faker.string.uuid()
    const newUserEmail = `test-user-sync-${newUserId}@example.com`

    const kcUser = await keycloakClient.users.create({
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
    await keycloakController.handleUpsert(project)

    const projectGroup = z.object({
      id: z.string(),
    }).parse(await keycloakService.getGroupByPath(`/${testProjectSlug}`))

    // Manually remove user from Keycloak group
    await keycloakService.removeUserFromGroup(kcUser.id, projectGroup.id)

    // Verify removal
    let members = await keycloakService.getGroupMembers(projectGroup.id)
    expect(members.some(m => m.id === kcUser.id)).toBe(false)

    // Sync again
    await keycloakController.handleUpsert(project)

    // Verify added back
    members = await keycloakService.getGroupMembers(projectGroup.id)
    expect(members.some(m => m.id === kcUser.id)).toBe(true)

    // Cleanup
    await keycloakClient.users.del({ id: kcUser.id })
    await prisma.projectMembers.deleteMany({ where: { userId: kcUser.id } })
    await prisma.user.delete({ where: { id: kcUser.id } })
  }, 60000)

  it('should remove user from Keycloak group if present but missing in DB', async () => {
    // Create user
    const newUserId = faker.string.uuid()
    const newUserEmail = `test-user-orphan-${newUserId}@example.com`

    const kcUser = await keycloakClient.users.create({
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
    await keycloakController.handleUpsert(project)

    // Manually add user to Keycloak group
    const projectGroup = z.object({
      id: z.string(),
    }).parse(await keycloakService.getGroupByPath(`/${testProjectSlug}`))
    await keycloakService.addUserToGroup(kcUser.id, projectGroup.id)

    // Verify added
    let members = await keycloakService.getGroupMembers(projectGroup.id)
    expect(members.some(m => m.id === kcUser.id)).toBe(true)

    // Sync again to remove user
    await keycloakController.handleUpsert(project)

    // Verify removed
    members = await keycloakService.getGroupMembers(projectGroup.id)
    expect(members.some(m => m.id === kcUser.id)).toBe(false)

    // Cleanup
    await keycloakClient.users.del({ id: kcUser.id })
    await prisma.projectMembers.deleteMany({ where: { userId: kcUser.id } })
    await prisma.user.delete({ where: { id: kcUser.id } })
  }, 60000)

  it('should recreate project group if deleted in Keycloak', async () => {
    // Ensure project exists and is synced
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    await keycloakController.handleUpsert(project)

    const projectGroup = z.object({
      id: z.string(),
    }).parse(await keycloakService.getGroupByPath(`/${testProjectSlug}`))

    // Delete group in Keycloak
    await keycloakService.deleteGroup(projectGroup.id)

    // Verify deleted
    const deletedProjectGroup = await keycloakService.getGroupByPath(`/${testProjectSlug}`)
    expect(deletedProjectGroup).toBeUndefined()

    // Sync
    await keycloakController.handleUpsert(project)

    // Verify recreated
    const recreatedProjectGroup = z.object({
      name: z.string(),
    }).parse(await keycloakService.getGroupByPath(`/${testProjectSlug}`))
    expect(recreatedProjectGroup?.name).toBe(testProjectSlug)
  }, 60000)

  it('should recreate role group if deleted in Keycloak', async () => {
    // Ensure project exists and is synced
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    await keycloakController.handleUpsert(project)

    const roleGroup = z.object({
      id: z.string(),
    }).parse(await keycloakService.getGroupByPath(`/${testProjectSlug}/${testRoleName}`))

    // Delete role group in Keycloak
    await keycloakService.deleteGroup(roleGroup!.id!)

    // Verify deleted
    const deletedRoleGroup = await keycloakService.getGroupByPath(`/${testProjectSlug}/${testRoleName}`)
    expect(deletedRoleGroup).toBeUndefined()

    // Sync
    await keycloakController.handleUpsert(project)

    // Verify recreated
    const recreatedRoleGroup = z.object({
      name: z.string(),
    }).parse(await keycloakService.getGroupByPath(`/${testProjectSlug}/${testRoleName}`))
    expect(recreatedRoleGroup?.name).toBe(testRoleName)
  }, 60000)
})
