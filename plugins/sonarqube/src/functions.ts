import { ensureGroupExists, findGroupByName } from './group.js'
import { adminGroupPath } from '@cpn-console/shared'
import { VaultSonarSecret, getAxiosInstance } from './tech.js'
import { Project, StepCall, generateProjectKey, parseError } from '@cpn-console/hooks'
import { SonarUser, ensureUserExists } from './user.js'
import { SonarPaging, createDsoRepository, deleteDsoRepository, ensureRepositoryConfiguration, files, findSonarProjectsForDsoProjects } from './project.js'
import { VaultProjectApi } from '@cpn-console/vault-plugin/types/class.js'

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

export const initSonar = async () => {
  await setTemplatePermisions()
  await createAdminGroup()
  await setAdminPermisions()
}

const createAdminGroup = async () => {
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

const setAdminPermisions = async () => {
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

const setTemplatePermisions = async () => {
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
    const {
      vault: vaultApi,
      keycloak: keycloakApi,
    } = payload.apis
    const {
      name: projectName,
      organization: {
        name: organizationName,
      },
    } = project
    const username = `${organizationName}-${projectName}`
    const keycloakGroupPath = await keycloakApi.getProjectGroupPath()
    const sonarRepositories = await findSonarProjectsForDsoProjects(organizationName, projectName)

    await Promise.all([
      await ensureUserAndVault(vaultApi, username, projectName, organizationName),
      await ensureGroupExists(keycloakGroupPath),

      // Remove excess repositories
      ...sonarRepositories
        .filter(sonarRepository => !project.repositories.find(repo => repo.internalRepoName === sonarRepository.repository))
        .map(sonarRepository => deleteDsoRepository(sonarRepository.key)),

      // Create or configure needed repos
      ...project.repositories.map(async (repository) => {
        const projectKey = generateProjectKey(organizationName, projectName, repository.internalRepoName)
        if (!sonarRepositories.find(sonarRepository => sonarRepository.repository === repository.internalRepoName)) {
          await createDsoRepository(organizationName, projectName, repository.internalRepoName)
        }
        await ensureRepositoryConfiguration(projectKey, username, keycloakGroupPath)
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
        result: 'KO',
        message: 'Failed to reconcile',
      },
    }
  }
}

export const setVariables: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const {
      name: projectName,
      organization: {
        name: organizationName,
      },
    } = project
    const { gitlab: gitlabApi } = payload.apis

    const sonarSecret = await payload.apis.vault.read('SONAR')
    await Promise.all([
      // Sonar vars saving in CI (repositories)
      ...project.repositories.map(async (repo) => {
        const projectKey = generateProjectKey(organizationName, projectName, repo.internalRepoName)
        return [
          await gitlabApi.setGitlabRepoVariable(repo.internalRepoName, {
            key: 'PROJECT_KEY',
            masked: false,
            protected: false,
            value: projectKey,
            variable_type: 'env_var',
            environment_scope: '*',
          }),
          await gitlabApi.setGitlabRepoVariable(repo.internalRepoName, {
            key: 'PROJECT_NAME',
            masked: false,
            protected: false,
            value: `${organizationName}-${projectName}-${repo.internalRepoName}`,
            variable_type: 'env_var',
            environment_scope: '*',
          }),
          await gitlabApi.setGitlabRepoVariable(repo.internalRepoName, {
            variable_type: 'file',
            key: 'SONAR_PROJECT_PROPERTIES',
            masked: false,
            protected: false,
            value: files['sonar-project.properties'](projectKey),
            environment_scope: '*',
          }),
        ]
      }).flat(),
      // Sonar vars saving in CI (group)
      await gitlabApi.setGitlabGroupVariable({
        key: 'SONAR_TOKEN',
        masked: true,
        protected: false,
        value: sonarSecret.data.SONAR_TOKEN,
        variable_type: 'env_var',
      }),
    ])

    return { status: { result: 'OK' } }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed to reconcile',
      },
    }
  }
}

export const deleteProject: StepCall<Project> = async (payload) => {
  const axiosInstance = getAxiosInstance()

  const project = payload.args
  const {
    name: projectName,
    organization: {
      name: organizationName,
    },
  } = project
  const username = `${organizationName}-${projectName}`
  try {
    const sonarRepositories = await findSonarProjectsForDsoProjects(organizationName, projectName)
    await Promise.all(sonarRepositories.map(repo => deleteRepo(repo.key)))
    const users: { paging: SonarPaging, users: SonarUser[] } = (await axiosInstance({
      url: 'users/search',
      params: {
        q: username,
      },
    }))?.data
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

const deleteRepo = async (projectKey: string) => await getAxiosInstance()({
  url: 'projects/delete',
  params: {
    project: projectKey,
  },
  method: 'post',
})

const ensureUserAndVault = async (vaultApi: VaultProjectApi, username: string, projectName: string, organizationName: string) => {
  const vaultUserSecret = await vaultApi.read('SONAR', { throwIfNoEntry: false }) as VaultSonarSecret | undefined
  const newUserSecret = await ensureUserExists(username, projectName, organizationName, vaultUserSecret)
  if (newUserSecret) await vaultApi.write(newUserSecret, 'SONAR')
}
