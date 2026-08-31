import type { Prisma } from '@prisma/client'
import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import {
  createProject,
  deleteProjectDependencies,
  getNotArchivedProjectForUpdate,
  getProject,
  getProjectContext,
  getProjectForUpsert,
  getProjectNotArchived,
  getProjectSlug,
  listProjects,
  listProjectsForDataExport,
  listProjectSlugsForPrefix,
  projectContextSelect,
  projectForDataSelect,
  projectForUpdateSelect,
  projectForUpsertSelect,
  projectIdSelect,
  projectSelect,
  projectSlugSelect,
  updateProject,
} from './project-queries.utils'
import { makeCreateProjectBody } from './project-testing.utils'
import { generateProjectCreateInput } from './project.utils'

describe('project query helpers', () => {
  it('getProject selects the full aggregate by id', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    const projectId = faker.string.uuid()
    await getProject(tx, projectId)
    expect(tx.project.findUnique).toHaveBeenCalledWith({ where: { id: projectId }, select: projectSelect })
  })

  it('getProjectNotArchived excludes archived status', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    const projectId = faker.string.uuid()
    tx.project.findFirst.mockResolvedValueOnce({ id: projectId } as Prisma.ProjectGetPayload<{ select: typeof projectSelect }>)
    await expect(getProjectNotArchived(tx, projectId)).resolves.toEqual({ id: projectId })
    expect(tx.project.findFirst).toHaveBeenCalledWith({
      where: { id: projectId, status: { not: 'archived' } },
      select: projectSelect,
    })
  })

  it('listProjects ANDs the caller-supplied clauses', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    const ownerId = faker.string.uuid()
    const where = [{ ownerId }, { slug: { startsWith: 'a' } }]
    await listProjects(tx, where)
    expect(tx.project.findMany).toHaveBeenCalledWith({ where: { AND: where }, select: projectSelect })
  })

  it('listProjects accepts an empty clause list (matches everything)', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    await listProjects(tx, [])
    expect(tx.project.findMany).toHaveBeenCalledWith({ where: { AND: [] }, select: projectSelect })
  })

  it('listProjectSlugsForPrefix prefixes on slug only', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    const prefix = faker.helpers.slugify('proj')
    await listProjectSlugsForPrefix(tx, prefix)
    expect(tx.project.findMany).toHaveBeenCalledWith({
      where: { slug: { startsWith: prefix } },
      select: { slug: true },
    })
  })

  it('slug/context selects stay minimal', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    const projectId = faker.string.uuid()
    await getProjectSlug(tx, projectId)
    await getProjectContext(tx, projectId)
    expect(tx.project.findUnique).toHaveBeenNthCalledWith(1, { where: { id: projectId }, select: projectSlugSelect })
    expect(tx.project.findUnique).toHaveBeenNthCalledWith(2, { where: { id: projectId }, select: projectContextSelect })
  })

  it('listProjectsForDataExport scans every project without where', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    await listProjectsForDataExport(tx)
    expect(tx.project.findMany).toHaveBeenCalledWith({ select: projectForDataSelect })
  })

  it('createProject returns only the id', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    const data = generateProjectCreateInput(makeCreateProjectBody(), faker.string.uuid(), faker.helpers.slugify('project'))
    await createProject(tx, data)
    expect(tx.project.create).toHaveBeenCalledWith({ data, select: projectIdSelect })
  })

  it('update-context and upsert selects match their shapes', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    const projectId = faker.string.uuid()
    await getNotArchivedProjectForUpdate(tx, projectId)
    await getProjectForUpsert(tx, projectId)
    expect(tx.project.findFirst).toHaveBeenCalledWith({
      where: { id: projectId, status: { not: 'archived' } },
      select: projectForUpdateSelect,
    })
    expect(tx.project.findUnique).toHaveBeenCalledWith({ where: { id: projectId }, select: projectForUpsertSelect })
  })

  it('updateProject writes without narrowing the result', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    const projectId = faker.string.uuid()
    const data: Prisma.ProjectUpdateInput = { name: faker.company.name() }
    await updateProject(tx, projectId, data)
    expect(tx.project.update).toHaveBeenCalledWith({ where: { id: projectId }, data })
  })

  it('deleteProjectDependencies clears repo/env/deployment rows in parallel', async () => {
    const tx = mockDeep<Prisma.TransactionClient>()
    const projectId = faker.string.uuid()
    tx.repository.deleteMany.mockResolvedValueOnce({ count: 2 })
    tx.environment.deleteMany.mockResolvedValueOnce({ count: 3 })
    tx.deployment.deleteMany.mockResolvedValueOnce({ count: 5 })
    await expect(deleteProjectDependencies(tx, projectId)).resolves.toEqual([
      { count: 2 },
      { count: 3 },
      { count: 5 },
    ])
    expect(tx.repository.deleteMany).toHaveBeenCalledWith({ where: { projectId } })
    expect(tx.environment.deleteMany).toHaveBeenCalledWith({ where: { projectId } })
    expect(tx.deployment.deleteMany).toHaveBeenCalledWith({ where: { projectId } })
  })
})
