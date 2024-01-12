import { getConfig } from './utils.js'
import { createProject, deleteProject } from './project.js'
import { addProjectGroupMember } from './permission.js'
import { createRobot } from './robot.js'
import type { StepCall, ArchiveProjectExecArgs, CreateProjectExecArgs, ProjectBase } from '@dso-console/hooks'

export let axiosOptions:{
    baseURL: string;
    auth: {
        username: string;
        password: string;
    };
} | undefined

export const getAxiosOptions = (): typeof axiosOptions => {
  if (!axiosOptions) {
    axiosOptions = {
      baseURL: `${getConfig().url}/api/v2.0/`,
      auth: {
        username: getConfig().user,
        password: getConfig().password,
      },
    }
  }
  return axiosOptions
}

export const createDsoProject: StepCall<CreateProjectExecArgs> = async (payload) => {
  try {
    // @ts-ignore to delete when in own plugin
    if (!payload.apis.vault) throw Error('no Vault available')
    const { project, organization } = payload.args
    const projectName = `${organization}-${project}`

    const projectCreated = await createProject(projectName)
    // TODO : à revoir, pbmatique que maintainer puisse push des images
    // // give harbor project member Maintainer role (can scan images)
    // const projectMember = await addProjectGroupMember(projectName, 4)
    const projectMember = await addProjectGroupMember(projectName)
    const robot = await createRobot(projectName)
    const auth = `${robot.name}:${robot.secret}`
    const buff = Buffer.from(auth)
    const b64auth = buff.toString('base64')
    const dockerConfigStr = JSON.stringify({
      auths: {
        [getConfig().host]: {
          auth: b64auth,
          email: '',
        },
      },
    })
    // @ts-ignore to delete when in own plugin
    await payload.apis.vault.write({
      TOKEN: robot.secret,
      USERNAME: robot.name,
      HOST: getConfig().host,
      DOCKER_CONFIG: dockerConfigStr,
    }, 'REGISTRY')
    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
      result: {
        project: projectCreated,
        projectMember,
        robot,
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const archiveDsoProject: StepCall<ArchiveProjectExecArgs> = async (payload) => {
  try {
    const { project, organization } = payload.args
    const projectName = `${organization}-${project}`

    await deleteProject(projectName)

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
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
      error: JSON.stringify(error),
    }
  }
}

export const getProjectSecrets: StepCall<ProjectBase> = async ({ args }) => {
  return {
    status: {
      result: 'OK',
    },
    secrets: {
      'Registry base path': `${getConfig().host}/${args.organization}-${args.project}/`,
    },
  }
}
