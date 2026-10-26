import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectGuard } from '../../infrastructure/permission/project/project.guard'
import { makeProjectMembers } from './project-members-testing.utils'
import { ProjectMembersController } from './project-members.controller'
import { ProjectMembersService } from './project-members.service'
import { generateProjectMember } from './project-members.utils'

describe('projectMembersController', () => {
  let module: TestingModule
  let controller: ProjectMembersController
  let service: DeepMockProxy<ProjectMembersService>
  const projectId = faker.string.uuid()

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
    const user = makeUser()
    const record = makeProjectMembers()
    service.list.mockResolvedValue([{ ...record, user }])
    const members = await controller.list({ id: projectId } as any)
    expect(service.list).toHaveBeenCalledWith(projectId)
    expect(members).toEqual([generateProjectMember({ ...record, user })])
  })

  it('adds a member and returns the mapped list', async () => {
    const record = makeProjectMembers()
    service.add.mockResolvedValue([{ ...record, user: makeUser() }])
    const body = { email: faker.internet.email() }
    const members = await controller.add(body, { id: projectId } as any)
    expect(service.add).toHaveBeenCalledWith(projectId, body)
    expect(members[0].email).toBeDefined()
  })

  it('patches members and returns the mapped list', async () => {
    const record = makeProjectMembers()
    service.patch.mockResolvedValue([{ ...record, user: makeUser() }])
    const body = [{ userId: record.userId, roles: [faker.string.uuid()] }]
    const members = await controller.patch(body, { id: projectId } as any)
    expect(service.patch).toHaveBeenCalledWith(projectId, body)
    expect(members).toHaveLength(1)
  })

  it('removes a member by userId and returns the mapped list', async () => {
    const record = makeProjectMembers()
    service.remove.mockResolvedValue([{ ...record, user: makeUser() }])
    const members = await controller.remove({ id: projectId } as any, record.userId)
    expect(service.remove).toHaveBeenCalledWith(projectId, record.userId)
    expect(members).toHaveLength(1)
  })
})

function makeUser() {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  }
}
