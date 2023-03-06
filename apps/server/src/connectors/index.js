import { createNexusProject, deleteNexusProject } from './nexus/index.js'
import { initSonar } from './sonarqube/index.js'
import { createGitlabGroup, deleteGitlabGroup, initGitlab, createGitlabProject } from './gitlab/index.js'
import { getOrganizations } from '../models/queries/organization-queries.js'
import { createKubeNamespace, deleteKubeNamespace } from './kubernetes/index.js'
import { createHarborProject } from './harbor/index.js'

export const init = async () => {
  const organizations = (await getOrganizations()).map(org => org.dataValues.name)
  console.log(organizations)
  return Promise.all([
    initSonar(),
    initGitlab(organizations),
  ])
}

export const project = {
  create: async (organization, project, email) => {
    return Promise.all([
      createNexusProject(organization, project, email),
      createGitlabGroup(organization, project),
      createHarborProject(organization, project),
    ])
  },
  delete: async (organization, project, email) => {
    await Promise.all([
      deleteNexusProject(organization, project, email),
      deleteGitlabGroup(organization, project),
    ])
  },
  recreate: () => { throw Error('not implemented yet') },
}

/*
      required: ["PROJECT_NAME", "ORGANIZATION_NAME", "EMAILS", "ENV_LIST", "REPO_DEST", "REPO_SRC", "IS_INFRA"]
      properties:
        PROJECT_NAME:
          type: string
        ORGANIZATION_NAME:
          type: string
        EMAILS:
          type: array
          items:
            type: string
        ENV_LIST:
          type: array
          items:
            type: string
        REPO_DEST:
          type: string
        REPO_SRC:
          type: string
        GIT_INPUT_USER:
          type: string
        GIT_INPUT_PASSWORD:
          type: string
        IS_INFRA:
          type: boolean */
export const repository = {
  create: async (options) => {
    const operations = [
      createGitlabProject(options),
    ]
    if (options.isInfra) operations.concat()
    return Promise.all(operations)
  },
  delete: async (organization, project, email) => {
    await Promise.all([
      deleteNexusProject(organization, project, email),
      deleteGitlabGroup(organization, project),
    ])
  },
}

export const environment = {
  create: async (params) => {
    return Promise.all([
      createKubeNamespace(params),
      // createArgoApp()
    ])
  },
  delete: async (organization, project, environment) => {
    await Promise.all([
      deleteKubeNamespace(organization, project, environment),
      // deleteArgoApp(organization, project),
    ])
  },
}
