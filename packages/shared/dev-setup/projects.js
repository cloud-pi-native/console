import { allServices } from '../src/utils/iterables.js'

export const projects = [
  {
    id: '9FG4CeGkMavI5CtAh_3Ss',
    repos: [
      {
        internalRepoName: 'candilib',
        externalRepoUrl: 'https://github.com/dnum-mi/candilib',
        isPrivate: true,
        externalUserName: 'this-is-a-test',
        externalToken: 'this-is-a-token',
        isInfra: false,
        status: 'created',
      },
    ],
    owner: {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      firstName: 'test',
      lastName: 'TEST',
      email: 'test@test.com',
      status: 'created',
    },
    orgName: 'ministere-interieur',
    services: allServices,
    envList: [{
      name: 'dev',
      ro: [],
      rw: ['cb8e5b4b-7b7b-40f5-935f-594f48ae6565'],
      status: 'created',
    },
    {
      name: 'prod',
      ro: [],
      rw: ['cb8e5b4b-7b7b-40f5-935f-594f48ae6565'],
      status: 'created',
    }],
    status: 'created',
    locked: false,
    projectName: 'candilib',
  },
  {
    id: '9FG4CeGkMavI5CtAh_3St',
    repos: [
      {
        internalRepoName: 'psij',
        externalRepoUrl: 'https://github.com/dnum-mi/psij',
        isPrivate: true,
        externalUserName: 'this-is-a-test',
        externalToken: 'this-is-a-token',
        isInfra: false,
        status: 'created',
      },
    ],
    owner: {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      firstName: 'test',
      lastName: 'TEST',
      email: 'test@test.com',
      status: 'created',
    },
    orgName: 'ministere-interieur',
    services: allServices,
    envList: [{
      name: 'dev',
      ro: [],
      rw: ['cb8e5b4b-7b7b-40f5-935f-594f48ae6565'],
      status: 'created',
    }],
    status: 'created',
    locked: false,
    projectName: 'psij',
  },
]
