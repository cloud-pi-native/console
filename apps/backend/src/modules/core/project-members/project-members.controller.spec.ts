import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectGuard } from '../../infrastructure/permission/project/project.guard'
import { makeProjectContext } from '../../infrastructure/permission/project/project.testing.utils'
import { makeProjectMembers, makeProjectMemberUser } from './project-members-testing.utils'
import { ProjectMembersController } from './project-members.controller'
import { ProjectMembersService } from './project-members.service'
import { generateProjectMember } from './project-members.utils'

describe('projectMembersController', () => {
  let module: TestingModule
  let controller: ProjectMembersController
  let service: DeepMockProxy<ProjectMembersService>
  const projectId = faker.string.uuid()
  const project = makeProjectContext({ id: projectId })

  beforeEach(async () => {
    service = mockDeep<ProjectMembersService>()
    module = await Test.createTestingModule({
      controllers: [ProjectMembersController],
      providers: [
        { provide: ProjectMembersService, useValue: service },
      ],
    })
      .overrideGuard(ProjectGuard)
      .useValue({ canActivate: () => true })
      .compile()
    controller = module.get(ProjectMembersController)
  })

  it('lists members mapped through generateProjectMember', async () => {
    const user = makeProjectMemberUser()
    const record = makeProjectMembers()
    service.list.mockResolvedValue([{ ...record, user }])
    const members = await controller.list(project)
    expect(service.list).toHaveBeenCalledWith(projectId)
    expect(members).toEqual([generateProjectMember({ ...record, user })])
  })

  it('adds a member and returns the mapped list', async () => {
    const record = makeProjectMembers()
    service.add.mockResolvedValue([{ ...record, user: makeProjectMemberUser() }])
    const body = { email: faker.internet.email() }
    const members = await controller.add(body, project)
    expect(service.add).toHaveBeenCalledWith(projectId, body)
    expect(members[0].email).toBeDefined()
  })

  it('patches members and returns the mapped list', async () => {
    const record = makeProjectMembers()
    service.patch.mockResolvedValue([{ ...record, user: makeProjectMemberUser() }])
    const body = [{ userId: record.userId, roles: [faker.string.uuid()] }]
    const members = await controller.patch(body, project)
    expect(service.patch).toHaveBeenCalledWith(projectId, body)
    expect(members).toHaveLength(1)
  })

  it('removes a member by userId and returns the mapped list', async () => {
    const record = makeProjectMembers()
    service.remove.mockResolvedValue([{ ...record, user: makeProjectMemberUser() }])
    const members = await controller.remove(project, record.userId)
    expect(service.remove).toHaveBeenCalledWith(projectId, record.userId)
    expect(members).toHaveLength(1)
  })
})
