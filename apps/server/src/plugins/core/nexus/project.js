import axios from 'axios'
import { generate } from 'generate-password'
import { axiosOptions } from './index.js'

export const createNexusProject = async (payload) => {
  const { organization, name, email } = payload.args
  const projectName = `${organization}-${name}`
  const res = { status: {} }

  try {
  // create local repo maven
    for (const repVersion of ['release', 'snapshot']) {
      await axios({
        ...axiosOptions,
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
    await axios({
      ...axiosOptions,
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
      await axios({
        ...axiosOptions,
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
    await axios({
      ...axiosOptions,
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

    const getUser = await axios({
      ...axiosOptions,
      url: `/security/users?userId=${projectName}`,
    })
    if (getUser.data.length) {
      console.log(getUser.data)
      res.user = getUser.data[0]
      res.status = { result: 'OK', message: 'User already exist' }
      return res
    }

    console.log('là')
    const newPwd = generate({
      length: 30,
      numbers: true,
    })
    // createUser
    const newUser = await axios({
      ...axiosOptions,
      method: 'post',
      url: '/security/users',
      data: {
        userId: `${projectName}`,
        firstName: 'Monkey D.',
        lastName: 'Luffy',
        emailAddress: email,
        password: newPwd,
        status: 'active',
        roles: [`${projectName}-ID`],
      },
    })
    console.log(newUser)
    res.vault = [{
      name: 'NEXUS',
      data: {
        NEXUS_PASSWORD: newPwd,
        NEXUS_USERNAME: projectName,
      },
    }]
    res.user = newUser.data
    res.status = { result: 'OK', message: 'User Created' }
    return res
  } catch (error) {
    return {
      status: { result: 'KO', message: 'Fail Create repositories', error },
    }
  }
}

export const deleteNexusProject = async (organization, project, email) => {
  return {
    status: {
      result: 'OK',
    },
  }
  // await nexusFetch({
  //   method: 'GET',
  //   path: `/security/users?userId=${organization}-${project}`,
  //   codes: ['200'],
  // })
  // let password
  // try {
  //   password = await readVault(`/forge-mi/projects/${organization}/${project}/NEXUS`)
  // } catch (error) {
  //   password = Math.random().toString(36).slice(-8)
  // }

  // // delete local repo maven snapshot
  // for (const repVersion of ['release', 'snapshot']) {
  //   await nexusFetch({
  //     method: 'DELETE',
  //     path: `/repositories/${organization}-${project}-repository-${repVersion}`,
  //     codes: ['404'],
  //   })
  // }

  // // delete maven group
  // await nexusFetch({
  //   method: 'DELETE',
  //   path: `/repositories/${organization}-${project}-repository-group`,
  //   codes: ['404'],
  // })

  // // delete privileges
  // for (const privilege of ['snapshot', 'release', 'group']) {
  //   await nexusFetch({
  //     method: 'DELETE',
  //     path: `/security/privileges/${organization}-${project}-privilege-${privilege}`,
  //     codes: ['404'],
  //   })
  // }

  // // delete role
  // await nexusFetch({
  //   method: 'DELETE',
  //   path: `/security/roles/${organization}-${project}-ID`,
  //   codes: ['404'],
  // })

  // // createUser
  // await nexusFetch({
  //   method: 'DELETE',
  //   path: `/security/users/${organization}-${project}`,
  //   codes: ['404'],
  // })

  // await writeVault(`/forge-mi/projects/${organization}/${project}/NEXUS`, {
  //   NEXUS_PASSWORD: password,
  //   NEXUS_USERNAME: `${organization}-${project}`,
  // })
  // await destroyVault(`/forge-mi/projects/${organization}/${project}/NEXUS`)
}
