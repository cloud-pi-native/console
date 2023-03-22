import { nexusUrl, nexusUser, nexusPassword } from '../../utils/env.js'
import { destroyVault, readVault, writeVault } from '../vault/index.js'

export const nexusFetch = async ({ method, path, body, codes }) => {
  const options = {
    headers: {
      Accept: 'application/json',
      Authorization: 'Basic ' + Buffer.from(nexusUser + ':' + nexusPassword).toString('base64'),
    },
    credentials: 'include',
    method,
  }
  if (body) {
    options.body = JSON.stringify(body)
    options.headers['Content-Type'] = 'application/json'
  }
  const url = `${nexusUrl}${path}`
  const res = await fetch(url, {
    ...options,
  })
  if (codes.includes(res.status)) {
    throw Error(res.status + res.statusText)
  }
  return res
}

// nexus-project-provisioning

export const createNexusProject = async (organization, project, email) => {
  // search local user
  await nexusFetch({
    method: 'GET',
    path: `/security/users?userId=${organization}-${project}`,
    codes: ['200'],
  })

  // get password
  let password
  try {
    password = await readVault(`/forge-mi/projects/${organization}/${project}/NEXUS`)
  } catch (error) {
    password = Math.random().toString(36).slice(-8)
  }

  // create local repo maven snapshot
  for (const repVersion of ['release', 'snapshot']) {
    await nexusFetch({
      method: 'POST',
      path: '/repositories/maven/hosted',
      body: {
        name: `${organization}-${project}-repository-${repVersion}`,
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
      codes: ['201', '400'],
    })
  }

  // create maven group
  await nexusFetch({
    method: 'POST',
    path: '/repositories/maven/group',
    body: {
      name: `${organization}-${project}-repository-group`,
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true,
      },
      group: {
        memberNames: [
          `${organization}-${project}-repository-snapshot`,
          `${organization}-${project}-repository-release`,
          'maven-public',
        ],
      },
    },
    codes: ['201', '400'],
  })

  // create privileges
  for (const privilege of ['snapshot', 'release', 'group']) {
    await nexusFetch({
      method: 'POST',
      path: '/security/privileges/repository-view',
      body: {
        name: `${organization}-${project}-privilege-${privilege}`,
        description: `Privilege for organization ${organization}-${project} for repo ${privilege}`,
        actions: ['all'],
        format: 'maven2',
        repository: `${organization}-${project}-repository-${privilege}`,
      },
      codes: ['201', '400'],
    })
  }

  // create role
  await nexusFetch({
    method: 'POST',
    path: '/security/roles',
    body: {
      id: `${organization}-${project}-ID`,
      name: `${organization}-${project}-role`,
      description: 'desc',
      privileges: [
        `${organization}-${project}-privilege-snapshot`,
        `${organization}-${project}-privilege-release`,
        `${organization}-${project}-privilege-group`,
      ],
    },
    codes: ['200', '400'],
  })

  // create local user
  await nexusFetch({
    method: 'POST',
    path: '/security/users',
    body: {
      userId: `${organization}-${project}`,
      firstName: 'Monkey D.',
      lastName: 'Luffy',
      emailAddress: email,
      password,
      status: 'active',
      roles: [`${organization}-${project}-ID`],
    },
    codes: ['200', '400'],
  })

  await writeVault(`/forge-mi/projects/${organization}/${project}/NEXUS`, {
    NEXUS_PASSWORD: password,
    NEXUS_USERNAME: `${organization}-${project}`,
  })
}

// nexus-project-delete

export const deleteNexusProject = async (organization, project, email) => {
  // search local user
  await nexusFetch({
    method: 'GET',
    path: `/security/users?userId=${organization}-${project}`,
    codes: ['200'],
  })

  // get password
  let password
  try {
    password = await readVault(`/forge-mi/projects/${organization}/${project}/NEXUS`)
  } catch (error) {
    password = Math.random().toString(36).slice(-8)
  }

  // delete local repo maven snapshot
  for (const repVersion of ['release', 'snapshot']) {
    await nexusFetch({
      method: 'DELETE',
      path: `/repositories/${organization}-${project}-repository-${repVersion}`,
      codes: ['404'],
    })
  }

  // delete maven group
  await nexusFetch({
    method: 'DELETE',
    path: `/repositories/${organization}-${project}-repository-group`,
    codes: ['404'],
  })

  // delete privileges
  for (const privilege of ['snapshot', 'release', 'group']) {
    await nexusFetch({
      method: 'DELETE',
      path: `/security/privileges/${organization}-${project}-privilege-${privilege}`,
      codes: ['404'],
    })
  }

  // delete role
  await nexusFetch({
    method: 'DELETE',
    path: `/security/roles/${organization}-${project}-ID`,
    codes: ['204', '404'],
  })

  // delete user
  await nexusFetch({
    method: 'DELETE',
    path: `/security/users/${organization}-${project}`,
    codes: ['404'],
  })

  await writeVault(`/forge-mi/projects/${organization}/${project}/NEXUS`, {
    NEXUS_PASSWORD: password,
    NEXUS_USERNAME: `${organization}-${project}`,
  })
  await destroyVault(`/forge-mi/projects/${organization}/${project}/NEXUS`)
}
