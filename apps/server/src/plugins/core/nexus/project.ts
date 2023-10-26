import axios from 'axios'
import { axiosOptions } from './index.js'
import { generateRandomPassword } from '@/utils/crypto.js'
import type { StepCall } from '@/plugins/hooks/hook.js'
import type { ArchiveProjectExecArgs, CreateProjectExecArgs } from '@/plugins/hooks/project.js'

const axiosInstance = axios.create(axiosOptions)

export const createNexusProject: StepCall<CreateProjectExecArgs> = async (payload) => {
  try {
    const { organization, project, owner } = payload.args
    const projectName = `${organization}-${project}`
    const res: any = {}

    if (!payload.vault) throw Error('no Vault available')
    // create local repo maven
    for (const repVersion of ['release', 'snapshot']) {
      await axiosInstance({
        method: 'post',
        url: '/repositories/maven/hosted',
        data: {
          name: `${projectName}-repository-${repVersion}`,
          online: true,
          storage: {
            blobStoreName: 'default',
            strictContentTypeValidation: true,
            writePolicy: 'allow_once',
          },
          cleanup: { policyNames: ['string'] },
          component: { proprietaryComponents: true },
          maven: {
            versionPolicy: 'MIXED',
            layoutPolicy: 'STRICT',
            contentDisposition: 'ATTACHMENT',
          },
        },
        validateStatus: (code) => [201, 400].includes(code),
      })
    }
    // create maven group
    await axiosInstance({
      method: 'post',
      url: '/repositories/maven/group',
      data: {
        name: `${projectName}-repository-group`,
        online: true,
        storage: {
          blobStoreName: 'default',
          strictContentTypeValidation: true,
        },
        group: {
          memberNames: [
            `${projectName}-repository-snapshot`,
            `${projectName}-repository-release`,
            'maven-public',
          ],
        },
      },
      validateStatus: (code) => [201, 400].includes(code),
    })
    // create privileges
    for (const privilege of ['snapshot', 'release', 'group']) {
      await axiosInstance({
        method: 'post',
        url: '/security/privileges/repository-view',
        data: {
          name: `${projectName}-privilege-${privilege}`,
          description: `Privilege for organization ${projectName} for repo ${privilege}`,
          actions: ['all'],
          format: 'maven2',
          repository: `${projectName}-repository-${privilege}`,
        },
        validateStatus: (code) => [201, 400].includes(code),
      })
    }
    // create role
    await axiosInstance({
      method: 'post',
      url: '/security/roles',
      data: {
        id: `${projectName}-ID`,
        name: `${projectName}-role`,
        description: 'desc',
        privileges: [
          `${projectName}-privilege-snapshot`,
          `${projectName}-privilege-release`,
          `${projectName}-privilege-group`,
        ],
      },
      validateStatus: (code) => [200, 400].includes(code),
    })

    const getUser = await axiosInstance({
      url: `/security/users?userId=${projectName}`,
    })
    if (getUser.data.length) {
      res.user = getUser.data[0]
      res.status = { result: 'OK', message: 'User already exist' }
      return res
    }

    const newPwd = generateRandomPassword(30)
    // createUser
    const newUser = await axiosInstance({
      method: 'post',
      url: '/security/users',
      data: {
        userId: `${projectName}`,
        firstName: 'Monkey D.',
        lastName: 'Luffy',
        emailAddress: owner.email,
        password: newPwd,
        status: 'active',
        roles: [`${projectName}-ID`],
      },
    })

    await payload.vault.write({
      NEXUS_PASSWORD: newPwd,
      NEXUS_USERNAME: projectName,
    }, 'NEXUS')

    res.user = newUser.data
    res.status = { result: 'OK', message: 'User Created' }
    return res
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Fail Create repositories',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteNexusProject: StepCall<ArchiveProjectExecArgs> = async (payload) => {
  const { organization, project } = payload.args
  const projectName = `${organization}-${project}`

  try {
    // delete local repo maven snapshot
    for (const repVersion of ['release', 'snapshot']) {
      await axiosInstance({
        method: 'delete',
        url: `/repositories/${projectName}-repository-${repVersion}`,
        validateStatus: code => code === 404 || code < 300,
      })
    }

    // delete maven group
    await axiosInstance({
      method: 'delete',
      url: `/repositories/${projectName}-repository-group`,
      validateStatus: code => code === 404 || code < 300,
    })

    // delete privileges
    for (const privilege of ['snapshot', 'release', 'group']) {
      await axiosInstance({
        method: 'delete',
        url: `/security/privileges/${projectName}-privilege-${privilege}`,
        validateStatus: code => code === 404 || code < 300,
      })
    }

    // delete role
    await axiosInstance({
      method: 'delete',
      url: `/security/roles/${projectName}-ID`,
      validateStatus: code => code === 404 || code < 300,
    })

    // delete user
    await axiosInstance({
      method: 'delete',
      url: `/security/users/${projectName}`,
      validateStatus: code => code === 404 || code < 300,
    })

    return {
      status: {
        result: 'OK',
        message: 'User deleted',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
    }
  }
}
