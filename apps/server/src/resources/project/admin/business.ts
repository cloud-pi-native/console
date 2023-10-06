import { getAllProjects as getAllProjectsQuery } from '@/resources/queries-index.js'

export const getAllProjects = async () => {
  return getAllProjectsQuery()
}
