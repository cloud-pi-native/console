import type { Project, Repository } from '@prisma/client'
import prisma from '@/prisma.js'

// SELECT
export const getRepositoryById = (id: Repository['id']) =>
  prisma.repository.findUnique({ where: { id } })

export const getProjectRepositories = (projectId: Project['id']) =>
  prisma.repository.findMany({ where: { projectId } })

// CREATE
type RepositoryCreate = Pick<Repository, 'projectId' | 'internalRepoName' | 'isInfra' | 'isPrivate' | 'externalRepoUrl'> &
  Partial<Pick<Repository, 'externalUserName'>>

export const initializeRepository = (
  { projectId, internalRepoName, externalRepoUrl, isInfra, isPrivate, externalUserName = undefined }: RepositoryCreate,
) => prisma.repository.create({
  data: {
    projectId,
    internalRepoName,
    externalRepoUrl,
    externalUserName,
    isInfra,
    isPrivate,
  },
})

export const getHookRepository = (id: Repository['id']) =>
  prisma.repository.findUniqueOrThrow({
    where: {
      id,
    },
    include: {
      project: {
        include: {
          organization: true,
        },
      },
    },
  })

// UPDATE
export const updateRepository = (id: Repository['id'], infos: Partial<Repository>) =>
  prisma.repository.update({ where: { id }, data: { ...infos } })

// DELETE
export const deleteRepository = async (id: Repository['id']) => {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw new Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return prisma.repository.delete({ where: { id } })
}

export const deleteAllRepositoryForProject = (id: Project['id']) =>
  prisma.repository.deleteMany({ where: { projectId: id } })

// TECH
export const _dropRepositoriesTable = prisma.repository.deleteMany

export const _createRepository = (data: Parameters<typeof prisma.repository.upsert>[0]['create']) =>
  prisma.repository.upsert({ create: data, update: data, where: { id: data.id } })
