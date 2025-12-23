import type { Project, Repository } from '@prisma/client'
import prisma from '@old-server/prisma'

// SELECT
export function getRepositoryById(id: Repository['id']) {
  return prisma.repository.findUniqueOrThrow({ where: { id } })
}

export function getProjectRepositories(projectId: Project['id']) {
  return prisma.repository.findMany({ where: { projectId } })
}

// CREATE
type RepositoryCreate = Pick<Repository, 'projectId' | 'internalRepoName' | 'isInfra' | 'isPrivate'> &
  Partial<Pick<Repository, 'externalUserName' | 'externalRepoUrl' | 'deployRevision' | 'deployPath' | 'helmValuesFiles'>>

export function initializeRepository({ projectId, internalRepoName, externalRepoUrl, isInfra, isPrivate, externalUserName, deployRevision, deployPath, helmValuesFiles }: RepositoryCreate) {
  return prisma.repository.create({
    data: {
      projectId,
      internalRepoName,
      externalRepoUrl,
      externalUserName,
      isInfra,
      isPrivate,
      deployRevision,
      deployPath,
      helmValuesFiles,
    },
  })
}

export function getHookRepository(id: Repository['id']) {
  return prisma.repository.findUniqueOrThrow({
    where: {
      id,
    },
    include: {
      project: true,
    },
  })
}

// UPDATE
export function updateRepository(id: Repository['id'], infos: Partial<Repository>) {
  return prisma.repository.update({ where: { id }, data: { ...infos } })
}

// DELETE
export async function deleteRepository(id: Repository['id']) {
  const doesRepoExist = await getRepositoryById(id)
  if (!doesRepoExist) throw new Error('Le dépôt interne demandé n\'existe pas en base pour ce projet')
  return prisma.repository.delete({ where: { id } })
}

export function deleteAllRepositoryForProject(id: Project['id']) {
  return prisma.repository.deleteMany({ where: { projectId: id } })
}

export function _createRepository(data: Parameters<typeof prisma.repository.upsert>[0]['create']) {
  return prisma.repository.upsert({ create: data, update: data, where: { id: data.id } })
}
