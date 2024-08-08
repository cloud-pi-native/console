import { faker } from '@faker-js/faker'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Member, PROJECT_PERMS, projectMemberContract } from '@cpn-console/shared'
import app from '../../app.js'
import * as business from './business.js'
import * as utilsController from '../../utils/controller.js'
import { getProjectMockInfos, getUserMockInfos } from '../../utils/mocks.js'
import { BadRequest400 } from '../../utils/errors.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
const authUserMock = vi.spyOn(utilsController, 'authUser')
const businessListMembersMock = vi.spyOn(business, 'listMembers')
const businessAddMemberMock = vi.spyOn(business, 'addMember')
const businessPatchMembersMock = vi.spyOn(business, 'patchMembers')
const businessRemoveMemberMock = vi.spyOn(business, 'removeMember')

describe('projectMemberRouter tests', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const projectId = faker.string.uuid()
  const userId = faker.string.uuid()

  describe('listMembers', () => {
    it('Should return members for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessListMembersMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(projectMemberContract.listMembers.path.replace(':projectId', projectId))
        .end()

      expect(businessListMembersMock).toHaveBeenCalledWith(projectId)
      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([])
    })

    it('Should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .get(projectMemberContract.listMembers.path.replace(':projectId', projectId))
        .end()

      expect(response.statusCode).toEqual(404)
    })
  })

  describe('addMember', () => {
    const memberData: Partial<Member> = {
      userId: faker.string.uuid(),
    }

    it('Should add member for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)
      const newMember = {
        ...memberData,
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        roleIds: [],
      }

      businessAddMemberMock.mockResolvedValueOnce([newMember])

      const response = await app.inject()
        .post(projectMemberContract.addMember.path.replace(':projectId', projectId))
        .body(memberData)
        .end()

      expect(response.json()).toEqual([newMember])
      expect(response.statusCode).toEqual(201)
    })

    it('Should pass business error', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)
      businessAddMemberMock.mockResolvedValueOnce(new BadRequest400('une erreur'))

      const response = await app.inject()
        .post(projectMemberContract.addMember.path.replace(':projectId', projectId))
        .body(memberData)
        .end()

      expect(response.statusCode).toEqual(400)
    })
    it('Should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(projectMemberContract.addMember.path.replace(':projectId', projectId))
        .body(memberData)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('Should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(projectMemberContract.addMember.path.replace(':projectId', projectId))
        .body(memberData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('Should return 403 if project is archived', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .post(projectMemberContract.addMember.path.replace(':projectId', projectId))
        .body(memberData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })
  })

  describe('patchMembers', () => {
    const patchData = [{ userId: faker.string.uuid(), roles: [] }]

    it('Should patch members for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessPatchMembersMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .patch(projectMemberContract.patchMembers.path.replace(':projectId', projectId))
        .body(patchData)
        .end()

      expect(response.json()).toEqual([])
      expect(response.statusCode).toEqual(200)
    })

    it('Should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .patch(projectMemberContract.patchMembers.path.replace(':projectId', projectId))
        .body(patchData)
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('Should return 403 if not permited', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .patch(projectMemberContract.patchMembers.path.replace(':projectId', projectId))
        .body(patchData)
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('Should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .patch(projectMemberContract.patchMembers.path.replace(':projectId', projectId))
        .body(patchData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('Should return 403 if project is archived', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .patch(projectMemberContract.patchMembers.path.replace(':projectId', projectId))
        .body(patchData)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })
  })

  describe('removeMember', () => {
    it('Should remove member for authorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      businessRemoveMemberMock.mockResolvedValueOnce([])

      const response = await app.inject()
        .delete(projectMemberContract.removeMember.path.replace(':projectId', projectId).replace(':userId', userId))
        .end()

      expect(response.json()).toEqual([])
      expect(response.statusCode).toEqual(200)
    })

    it('Should return 404 for unauthorized user', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: 0n })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(projectMemberContract.removeMember.path.replace(':projectId', projectId).replace(':userId', userId))
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('Should return 403 if not permited', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.GUEST })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(projectMemberContract.removeMember.path.replace(':projectId', projectId).replace(':userId', userId))
        .end()

      expect(response.statusCode).toEqual(403)
    })

    it('Should return 403 if project is locked', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS, projectLocked: true })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(projectMemberContract.removeMember.path.replace(':projectId', projectId).replace(':userId', userId))
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est verrouillé' })
    })

    it('Should return 403 if project is archived', async () => {
      const projectPerms = getProjectMockInfos({ projectPermissions: PROJECT_PERMS.MANAGE_MEMBERS, projectStatus: 'archived' })
      const user = getUserMockInfos(false, undefined, projectPerms)
      authUserMock.mockResolvedValueOnce(user)

      const response = await app.inject()
        .delete(projectMemberContract.removeMember.path.replace(':projectId', projectId).replace(':userId', userId))
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json()).toEqual({ message: 'Le projet est archivé' })
    })
  })
})
