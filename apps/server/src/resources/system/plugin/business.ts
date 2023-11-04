import { hooks } from '@/plugins'
import prisma from '@/prisma'
import { addLogs } from '@/resources/queries-index'
import { User } from '@prisma/client'

export const repairPluginsBusiness = async (userId: User['id']) => {
  const allProjects = await prisma.project.findMany({
    include: {
      repositories: true,
      organization: true,
    },
  })
  const start = Date.now()

  const reposUpdated = []
  const projectsUpdated = []
  const results = await Promise.allSettled(allProjects.map(project => {
    return async () => {
      await hooks.renewProjectTokens.execute({
        organization: project.organization.name,
        project: project.name,
      })
      projectsUpdated.push(project.name)
      await Promise.allSettled(project.repositories.map(repo => async () => {
        await hooks.renewRepositoryTokens.execute({
          project: project.name,
          organization: project.organization.name,
          ...repo,
        })
        reposUpdated.push(repo.internalRepoName)
      }))
    }
  }))

  const end = Date.now()
  const executionTime = `${end - start} ms`
  addLogs('Repair All', {
    reposUpdated,
    projectsUpdated,
    executionTime,
    failed: results.some(res => res.status === 'rejected'),
  }, userId)
}
