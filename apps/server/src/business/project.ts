import { getProjectInfos, getPublicClusters } from '@/queries/index.js'

export const getProjectInfosAndClusters = async (projectId: string) => {
  const project = await getProjectInfos(projectId)
  const authorizedClusters = [...await getPublicClusters(), ...project.clusters]
  return { project, authorizedClusters }
}
