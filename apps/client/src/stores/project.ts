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
  const projectsBySlug = ref<Record<string, Project>>({})

  const projects = computed(() => Object.values(projectsBySlug.value)
    .sort((p1, p2) => p1.slug.localeCompare(p2.slug)),
  )

  const myProjects = computed(() => projects.value.filter(project => project.status !== 'archived' && amIPartOf(project)),
  )

  const updateStore = async (projectsRecieved: ProjectV2[]) => {
    if (projectsRecieved.some(project => !organizationStore.organizationsById[project.organizationId])) {
      await organizationStore.listOrganizations()
    }
    return projectsRecieved.map((project) => {
      if (project.slug in projectsBySlug.value) {
        return projectsBySlug.value[project.slug].Commands.updateData(project)
      }
      const newProject = new Project(project, organizationStore.organizationsById[project.organizationId])
      projectsBySlug.value[project.slug] = newProject
      return newProject
    })
  }

  const selectFromStore = (slugs: ProjectV2['slug'][]) => {
    return slugs.filter(slug => slug in projectsBySlug.value)
      .map(slug => projectsBySlug.value[slug])
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
    return selectFromStore(res.map(project => project.slug))
  }

  const listMyProjects = pDebounce(async () => {
    const res = await apiClient.Projects.listProjects({ query: { filter: 'member', statusNotIn: 'archived' } })
      .then(response => extractData(response, 200))
    await updateStore(res)
    return selectFromStore(res.map(project => project.slug))
  }, 200)

  const createProject = async (body: CreateProjectBody) => {
    const project = await apiClient.Projects.createProject({ body })
      .then(response => extractData(response, 201))
    projectsBySlug.value[project.slug] = new Project(project, organizationStore.organizationsById[project.organizationId])
    return project
  }

  const generateProjectsData = () =>
    apiClient.Projects.getProjectsData()
      .then(response => extractData(response, 200))

  // Should only be used for components and vue outside of Project route and its children, consider using the props instead
  // Should only be update by beforeEnter() of Project route
  const lastSelectedProjectSlug = ref<ProjectV2['slug']>()

  return {
    projects,
    projectsBySlug,
    myProjects,
    lastSelectedProjectSlug,
    getProject,
    listProjects,
    listMyProjects,
    createProject,
    generateProjectsData,
  }
})
