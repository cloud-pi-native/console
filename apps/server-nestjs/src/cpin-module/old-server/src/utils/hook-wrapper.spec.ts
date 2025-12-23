import type { KubeCluster, KubeUser, Project as ProjectPayload, Store } from '@cpn-console/hooks'
import { describe, expect, it } from 'vitest'
import type { ProjectInfos, ReposCreds } from './hook-wrapper'
import { transformToHookProject } from './hook-wrapper'

const associatedCluster = {
  id: 'f0e39981-0b6d-4c16-aa96-225062b75767',
  infos: '',
  label: 'carno',
  privacy: 'dedicated',
  secretName: '4a38422c-29e1-4b61-b533-edaa1b8a9b60',
  kubeconfig: {
    id: 'c8ba6db2-9a1d-4d6b-8b5e-2902cecd1437',
    user: {
      keyData: 'REDACTED',
      certData: 'REDACTED',
    },
    cluster: {
      caData: 'REDACTED',
      server: 'https://api-server:6443',
      skipTLSVerify: false,
      tlsServerName: 'api-server',
    },
    createdAt: '2024-05-02T09:17:27.882Z',
    updatedAt: '2024-05-02T09:17:27.882Z',
  },
  clusterResources: false,
  zone: {
    id: 'a66c4230-eba6-41f1-aae5-bb1e4f90cce0',
    slug: 'default',
  },
}
const nonAssociatedCluster = {
  id: 'f0e39981-0b6d-4c16-aa96-225062b75111',
  infos: '',
  label: 'carno2',
  privacy: 'dedicated',
  secretName: '4a38422c-29e1-4b61-b533-edaa1b8a9111',
  kubeconfig: {
    id: 'c8ba6db2-9a1d-4d6b-8b5e-2902cecd1111',
    user: {
      keyData: 'REDACTED',
      certData: 'REDACTED',
    },
    cluster: {
      caData: 'REDACTED',
      server: 'https://api-server:6443',
      skipTLSVerify: false,
      tlsServerName: 'api-server',
    },
    createdAt: '2024-05-02T09:17:27.882Z',
    updatedAt: '2024-05-02T09:17:27.882Z',
  },
  clusterResources: false,
  zone: {
    id: 'a66c4230-eba6-41f1-aae5-bb1e4f90cce0',
    slug: 'default',
  },
}
const project: ProjectInfos = {
  id: '011e7860-04d7-461f-912d-334c622d38b3',
  name: 'candilib',
  description: 'Application de réservation de places à l\'examen du permis B.',
  status: 'created',
  locked: false,
  createdAt: '2023-07-03T14:46:56.778Z',
  updatedAt: '2023-07-03T14:46:56.783Z',
  everyonePerms: 896n,
  ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
  members: [],
  clusters: [associatedCluster, nonAssociatedCluster],
  environments: [
    {
      id: '1b9f1053-fcf5-4053-a7b2-ff8a2c0c1921',
      name: 'dev',
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      createdAt: '2023-07-03T14:46:56.787Z',
      updatedAt: '2023-07-03T14:46:56.803Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      quotaId: '5a57b62f-2465-4fb6-a853-5a751d099199',
      stageId: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
      quota: {
        id: '5a57b62f-2465-4fb6-a853-5a751d099199',
        memory: '4Gi',
        cpu: 2,
        name: 'small',
        isPrivate: false,
      },
      stage: {
        id: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
        name: 'dev',
      },
      cluster: {
        id: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
        infos: 'Floating IP : 0.0.0.0',
        label: 'pas-top-cluster',
        privacy: 'dedicated',
        secretName: '94d52618-7869-4192-b33e-85dd0959e815',
        kubeconfig: {
          id: 'b5662039-a62b-483e-ba54-b12c6f966c96',
          user: {
            token: 'kirikou',
          },
          cluster: {
            server: 'https://pwned.cluster',
            tlsServerName: 'pwned.cluster',
          },
          createdAt: '2024-07-24T16:54:14.969Z',
          updatedAt: '2024-07-24T16:54:14.969Z',
        },
        clusterResources: false,
        zone: {
          id: 'a66c4230-eba6-41f1-aae5-bb1e4f90cce2',
          slug: 'pub',
        },
      },
    },
    {
      id: '1c654f00-4798-4a80-929f-960ddb37885a',
      name: 'integration',
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.803Z',
      clusterId: '126ac57f-263c-4463-87bb-d4e9017056b2',
      quotaId: '5a57b62f-2465-4fb6-a853-5a751d099199',
      stageId: 'd434310e-7850-4d59-b47f-0772edf50582',
      quota: {
        id: '5a57b62f-2465-4fb6-a853-5a751d099199',
        memory: '4Gi',
        cpu: 2,
        name: 'small',
        isPrivate: false,
      },
      stage: {
        id: 'd434310e-7850-4d59-b47f-0772edf50582',
        name: 'integration',
      },
      cluster: {
        id: '126ac57f-263c-4463-87bb-d4e9017056b2',
        infos: null,
        label: 'top-secret-cluster',
        privacy: 'dedicated',
        secretName: '59be2d50-58f9-42f3-95dc-b0c0518e3d8a',
        kubeconfig: {
          id: '0e88f000-07e6-4781-a69d-0963489387f7',
          user: {
            token: 'nyan cat',
          },
          cluster: {
            server: 'https://nothere.cluster',
            skipTLSVerify: false,
            tlsServerName: 'nothere.cluster',
          },
          createdAt: '2024-07-24T16:54:14.966Z',
          updatedAt: '2024-07-24T16:54:14.966Z',
        },
        clusterResources: true,
        zone: {
          id: 'a66c4230-eba6-41f1-aae5-bb1e4f90cce2',
          slug: 'pub',
        },
      },
    },
  ],
  repositories: [
    {
      id: '299216bb-2dcc-42b5-ac71-6aa001d2dccf',
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/dnum-mi/candilib.git',
      externalUserName: 'this-is-a-test',
      isInfra: false,
      isPrivate: true,
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.802Z',
    },
  ],
  plugins: [],
  owner: {
    id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
    firstName: 'Jean',
    lastName: 'DUPOND',
    email: 'test@test.com',
    createdAt: '2023-07-03T14:46:56.770Z',
    updatedAt: '2023-07-03T14:46:56.770Z',
    adminRoleIds: [],
  },
  roles: [],
}

describe('transformToHookProject', () => {
  // Mock data
  const mockStore: Store = {}
  const mockReposCreds: ReposCreds = {
    console: {
      token: 'test',
      username: 'test',
    },
  }

  it('transforme correctement le projet en objet Payload', () => {
    const result: ProjectPayload = transformToHookProject(project, mockStore, mockReposCreds)

    // Asserts pour vérifier la transformation

    // Assert sur la transformation des utilisateurs
    expect(result.users).toEqual([project.owner])

    // Assert sur la transformation des rôles
    expect(result.roles).toEqual([{ userId: project.owner.id, role: 'owner' }])

    // Assert sur la transformation des clusters
    expect(result.clusters).toEqual([associatedCluster, nonAssociatedCluster].map(({ kubeconfig, ...cluster }) => ({
      user: kubeconfig.user as unknown as KubeUser,
      cluster: kubeconfig.cluster as unknown as KubeCluster,
      ...cluster,
      privacy: cluster.privacy,
    })))

    // Assert sur la transformation des environnements
    expect(result.environments).toEqual(project.environments.map(({ permissions: _, stage, quota, ...environment }) => ({
      quota,
      stage: stage.name,
      permissions: [{ permissions: { rw: true, ro: true }, userId: project.ownerId }],
      ...environment,
      apis: {},
    })))

    // Assert sur la transformation des repositories
    expect(result.repositories).toEqual(project.repositories.map(repo => ({ ...repo, newCreds: mockReposCreds[repo.internalRepoName] })))

    // Assert sur le store
    expect(result.store).toEqual(mockStore)
  })
})
