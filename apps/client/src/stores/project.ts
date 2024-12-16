import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CreateProjectBody, ProjectV2, projectContract } from '@cpn-console/shared'
import pDebounce from 'p-debounce'
import { useUserStore } from './user.js'
import { useOrganizationStore } from './organization.js'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { Project } from '@/utils/project-utils.js'

export const useProjectStore = defineStore('project', () => {
  const organizationStore = useOrganizationStore()

  const userStore = useUserStore()

  const amIPartOf = (project: ProjectV2) => project.status !== 'archived'
    && (project.ownerId === userStore.userProfile?.id
      || project.members.some(member => member.userId === userStore.userProfile?.id))

  // mostly for admin views
  const projectsById = ref<Record<string, Project>>({})

  const projects = computed(() => Object.values(projectsById.value)
    .sort((p1, p2) => p1.name.localeCompare(p2.name)),
  )

  const myProjects = computed(() => projects.value.filter(project => project.status !== 'archived' && amIPartOf(project))
    .sort((p1, p2) => p1.name.localeCompare(p2.name)),
  )

  const updateStore = async (projectsRecieved: ProjectV2[]) => {
    if (projectsRecieved.some(project => !organizationStore.organizationsById[project.organizationId])) {
      await organizationStore.listOrganizations()
    }
    return projectsRecieved.map((project) => {
      if (project.id in projectsById.value) {
        return projectsById.value[project.id].Commands.updateData(project)
      }
      const newProject = new Project(project, organizationStore.organizationsById[project.organizationId])
      projectsById.value[project.id] = newProject
      return newProject
    })
  }

  const selectFromStore = (ids: ProjectV2['id'][]) => {
    return ids.filter(id => id in projectsById.value)
      .map(id => projectsById.value[id])
  }

  const getProject = async (projectId: ProjectV2['id']) => {
    const res = await apiClient.Projects.getProject({ params: { projectId } })
      .then(response => extractData(response, 200))
    return (await updateStore([res]))[0]
  }

  const listProjects = async (query: typeof projectContract.listProjects.query._type = { filter: 'member', statusNotIn: 'archived' }) => {
    const res = await apiClient.Projects.listProjects({ query })
      .then(response => extractData(response, 200))
    await updateStore(res)
    return selectFromStore(res.map(project => project.id))
  }

  const listMyProjects = pDebounce(async () => {
    const res = await apiClient.Projects.listProjects({ query: { filter: 'member', statusNotIn: 'archived' } })
      .then(response => extractData(response, 200))
    await updateStore(res)
    return selectFromStore(res.map(project => project.id))
  }, 200)

  const createProject = async (body: CreateProjectBody) => {
    const project = await apiClient.Projects.createProject({ body })
      .then(response => extractData(response, 201))
    projectsById.value[project.id] = new Project(project, organizationStore.organizationsById[project.organizationId])
    return project
  }

  const generateProjectsData = () =>
    apiClient.Projects.getProjectsData()
      .then(response => extractData(response, 200))

  // Should only be used for components and vue outside of Project route and its children, consider using the props instead
  // Should only be update by beforeEnter() of Project route
  const lastSelectedProjectId = ref<ProjectV2['id']>()

  return {
    projects,
    projectsById,
    myProjects,
    lastSelectedProjectId,
    getProject,
    listProjects,
    listMyProjects,
    createProject,
    generateProjectsData,
  }
})
