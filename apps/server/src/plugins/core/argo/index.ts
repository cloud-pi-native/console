import { createApplicationProject, deleteApplicationProject } from './app-project.js'
import { createApplication, deleteApplication } from './applications.js'
import { migrateAppProject } from './migrate.js'

export const newEnv = async (payload) => {
  try {
    const { project, organization, environment, repositories } = payload.args
    const { roGroup, rwGroup } = payload.keycloak
    const namespace = `${organization}-${project}-${environment}`

    const appProjectName = `${organization}-${project}-${environment}-project`
    await createApplicationProject({ appProjectName, namespace, roGroup, rwGroup, repositories })

    for (const repo of repositories) {
      const applicationName = `${organization}-${project}-${repo.internalRepoName}-${environment}`
      await createApplication({ applicationName, appProjectName, namespace, repo })
    }
    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteEnv = async (payload) => {
  try {
    const { project, organization, environment, repositories } = payload.args

    const appProjectName = `${organization}-${project}-${environment}-project`
    const destNamespace = `${organization}-${project}-${environment}`
    await deleteApplicationProject({ appProjectName, destNamespace })
    for (const repo of repositories) {
      const applicationName = `${organization}-${project}-${repo.internalRepoName}-${environment}`
      await deleteApplication({ applicationName, repoUrl: repo.url })
    }
    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

const nothingStatus = {
  status: {
    result: 'OK',
    message: 'Not an infra repository',
  },
}
export const newRepo = async (payload) => {
  try {
    if (!payload.args.isInfra) return nothingStatus
    const repo = { internalRepoName: payload.args.internalRepoName, url: payload.args.internalUrl }
    const { project, organization, environment } = payload.args

    for (const env of environment) {
      const roGroup = `/${organization}-${project}/${env}/RO`
      const rwGroup = `/${organization}-${project}/${env}/RW`
      const namespace = `${organization}-${project}-${env}`
      const appProjectName = `${organization}-${project}-${env}-project`
      const destNamespace = `${organization}-${project}-${env}`
      const applicationName = `${organization}-${project}-${repo.internalRepoName}-${env}`
      await migrateAppProject({ appProjectName, destNamespace, roGroup, rwGroup })
      await createApplication({ applicationName, appProjectName, namespace, repo })
    }
    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteRepo = async (payload) => {
  if (!payload.args.isInfra) return nothingStatus

  try {
    const { project, organization, environments, internalRepoName, internalUrl } = payload.args

    for (const env of environments) {
      const oldAppProjectName = `${organization}-${project}-${internalRepoName}-${env}-project` // Support Old appproject method
      const applicationName = `${organization}-${project}-${internalRepoName}-${env}`
      // TODO: Fix type
      // @ts-ignore See TODO
      await deleteApplicationProject(oldAppProjectName) // Support Old appproject method
      await deleteApplication({ applicationName, repoUrl: internalUrl })
    }
    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}
