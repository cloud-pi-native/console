import { adminGroupPath } from '@cpn-console/shared'
import type { Project, StepCall } from '@cpn-console/hooks'
import { generateProjectKey, parseError } from '@cpn-console/hooks'
import type { VaultProjectApi } from '@cpn-console/vault-plugin'
import { ensureGroupExists, findGroupByName } from './group'
import type { VaultSonarSecret } from './tech'
import { getAxiosInstance } from './tech'
import type { SonarUser } from './user'
import { ensureUserExists } from './user'
import type { SonarPaging } from './project'
import {
  createDsoRepository,
  deleteDsoRepository,
  ensureRepositoryConfiguration,
  files,
  findSonarProjectsForDsoProjects,
} from './project'
import type { KeycloakProjectApi } from '@cpn-console/keycloak-plugin'
import type { GitlabProjectApi } from '@cpn-console/gitlab-plugin/src/class'

const globalPermissions = [
  'admin',
  'profileadmin',
  'gateadmin',
  'scan',
  'provisioning',
]

const projectPermissions = [
  'admin',
  'codeviewer',
  'issueadmin',
  'securityhotspotadmin',
  'scan',
  'user',
]

export async function initSonar() {
  await setTemplatePermisions()
  await createAdminGroup()
  await setAdminPermisions()
}

async function createAdminGroup() {
  const axiosInstance = getAxiosInstance()
  const adminGroup = await findGroupByName(adminGroupPath)
  if (!adminGroup) {
    await axiosInstance({
      method: 'post',
      params: {
        name: adminGroupPath,
        description: 'DSO platform admins',
      },
      url: 'user_groups/create',
    })
  }
}

async function setAdminPermisions() {
  const axiosInstance = getAxiosInstance()
  for (const permission of globalPermissions) {
    await axiosInstance({
      method: 'post',
      params: {
        groupName: adminGroupPath,
        permission,
      },
      url: 'permissions/add_group',
    })
  }
}

async function setTemplatePermisions() {
  const axiosInstance = getAxiosInstance()
  await axiosInstance({
    method: 'post',
    params: { name: 'Forge Default' },
    url: 'permissions/create_template',
    validateStatus: code => [200, 400].includes(code),
  })
  for (const permission of projectPermissions) {
    await axiosInstance({
      method: 'post',
      params: {
        templateName: 'Forge Default',
        permission,
      },
      url: 'permissions/add_project_creator_to_template',
    })
    await axiosInstance({
      method: 'post',
      params: {
        groupName: 'sonar-administrators',
        templateName: 'Forge Default',
        permission,
      },
      url: 'permissions/add_group_to_template',
    })
  }
  await axiosInstance({
    method: 'post',
    params: {
      templateName: 'Forge Default',
    },
    url: 'permissions/set_default_template',
  })
}

export const upsertProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const vaultApi = payload.apis.vault as VaultProjectApi
    const keycloakApi = payload.apis.keycloak as KeycloakProjectApi
    const { slug: projectSlug } = project
    const username = project.slug
    const keycloakGroupPath = await keycloakApi.getProjectGroupPath()
    const sonarRepositories
      = await findSonarProjectsForDsoProjects(projectSlug)

    await Promise.all([
      ensureUserAndVault(vaultApi, username, projectSlug),
      ensureGroupExists(keycloakGroupPath),

      // Remove excess repositories
      ...sonarRepositories
        .filter(
          sonarRepository =>
            !project.repositories.find(
              repo => repo.internalRepoName === sonarRepository.repository,
            ),
        )
        .map(sonarRepository => deleteDsoRepository(sonarRepository.key)),

      // Create or configure needed repos
      ...project.repositories.map(async (repository) => {
        const projectKey = generateProjectKey(
          projectSlug,
          repository.internalRepoName,
        )
        if (
          !sonarRepositories.find(
            sonarRepository =>
              sonarRepository.repository === repository.internalRepoName,
          )
        ) {
          await createDsoRepository(projectSlug, repository.internalRepoName)
        }
        await ensureRepositoryConfiguration(
          projectKey,
          username,
          keycloakGroupPath,
        )
      }),
    ])

    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'WARNING',
        message: 'Failed to reconcile',
      },
      errors: {
        main: parseError(error),
      },
    }
  }
}

export const setVariables: StepCall<Project> = async (payload) => {
  const returnResponse = payload.results.sonarqube
  try {
    const project = payload.args
    const { slug: projectSlug } = project
    const gitlabApi = payload.apis.gitlab as GitlabProjectApi

    const sonarSecret = await (payload.apis.vault as VaultProjectApi).read(
      'SONAR',
    )
    const listGroupVars = await gitlabApi.getGitlabGroupVariables()
    await Promise.all([
      // Sonar vars saving in CI (repositories)
      ...project.repositories
        .map(async (repo) => {
          const projectKey = generateProjectKey(
            projectSlug,
            repo.internalRepoName,
          )
          const repoId = await gitlabApi.getProjectId(
            repo.internalRepoName,
          )
          const listVars = await gitlabApi.getGitlabRepoVariables(repoId)
          return [
            await gitlabApi.setGitlabRepoVariable(repoId, listVars, {
              key: 'PROJECT_KEY',
              masked: false,
              protected: false,
              value: projectKey,
              variable_type: 'env_var',
              environment_scope: '*',
            }),
            await gitlabApi.setGitlabRepoVariable(repoId, listVars, {
              key: 'PROJECT_NAME',
              masked: false,
              protected: false,
              value: `${projectSlug}-${repo.internalRepoName}`,
              variable_type: 'env_var',
              environment_scope: '*',
            }),
            await gitlabApi.setGitlabRepoVariable(repoId, listVars, {
              variable_type: 'file',
              key: 'SONAR_PROJECT_PROPERTIES',
              masked: false,
              protected: false,
              value: files['sonar-project.properties'](projectKey),
              environment_scope: '*',
            }),
          ]
        })
        .flat(),
      // Sonar vars saving in CI (group)
      await gitlabApi.setGitlabGroupVariable(listGroupVars, {
        key: 'SONAR_TOKEN',
        masked: true,
        protected: false,
        value: sonarSecret.data.SONAR_TOKEN,
        variable_type: 'env_var',
      }),
    ])

    if (payload.results.sonarqube.status.result === 'WARNING') {
      returnResponse.status.message = `main message: ${payload.results.sonarqube.status.message}, post message: OK`
    }
    return returnResponse
  } catch (error) {
    returnResponse.status.result = 'WARNING'
    returnResponse.status.message = `main message: ${payload.results.sonarqube.status.message}, post message: Failed to reconcile`
    returnResponse.errors = {
      ...returnResponse.errors,
      post: parseError(error),
    }
    return returnResponse
  }
}

export const deleteProject: StepCall<Project> = async (payload) => {
  const axiosInstance = getAxiosInstance()

  const project = payload.args
  const { slug: projectSlug } = project
  const username = projectSlug
  try {
    const sonarRepositories
      = await findSonarProjectsForDsoProjects(projectSlug)
    await Promise.all(sonarRepositories.map(repo => deleteRepo(repo.key)))
    const users: { paging: SonarPaging, users: SonarUser[] } = (
      await axiosInstance({
        url: 'users/search',
        params: {
          q: username,
        },
      })
    )?.data
    const user = users.users.find(u => u.login === username)
    if (!user) {
      return {
        status: {
          result: 'OK',
          message: 'Already missing',
        },
      }
    }
    await axiosInstance({
      url: 'users/deactivate',
      params: {
        login: username,
        anonymize: true,
      },
      method: 'post',
    })
    return {
      status: {
        result: 'OK',
        message: 'User anonymized',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed',
      },
    }
  }
}

async function deleteRepo(projectKey: string) {
  return getAxiosInstance()({
    url: 'projects/delete',
    params: {
      project: projectKey,
    },
    method: 'post',
  })
}

async function ensureUserAndVault(
  vaultApi: VaultProjectApi,
  username: string,
  projectSlug: string,
) {
  const vaultUserSecret = (await vaultApi.read('SONAR', {
    throwIfNoEntry: false,
  })) as VaultSonarSecret | undefined
  const newUserSecret = await ensureUserExists(
    username,
    projectSlug,
    vaultUserSecret,
  )
  if (newUserSecret) await vaultApi.write(newUserSecret, 'SONAR')
}
