import { type KubeCluster, type KubeUser, type Store, type Project as ProjectPayload } from '@cpn-console/hooks'
import { transformToHookProject, type ReposCreds } from './hook-wrapper.ts'
import { describe, expect, it } from 'vitest'

describe('transformToHookProject', () => {
  // Mock data
  const mockProject = project
  const mockStore: Store = { }
  const mockReposCreds: ReposCreds = {
    console: {
      token: 'test',
      username: 'test',
    },
  }

  it('transforme correctement le projet en objet Payload', () => {
    const result: ProjectPayload = transformToHookProject(mockProject, mockStore, mockReposCreds)

    // Asserts pour vérifier la transformation

    // Assert sur la transformation des utilisateurs
    expect(result.users).toEqual(mockProject.roles.map(role => role.user))

    // Assert sur la transformation des rôles
    expect(result.roles).toEqual(mockProject.roles.map(role => ({ role: role.role as 'owner' | 'user', userId: role.userId })))

    // Assert sur la transformation des clusters
    expect(result.clusters).toEqual([associatedCluster, nonAssociatedCluster].map(({ kubeconfig, ...cluster }) => ({
      user: kubeconfig.user as unknown as KubeUser,
      cluster: kubeconfig.cluster as unknown as KubeCluster,
      ...cluster,
      privacy: cluster.privacy,
    })))

    // Assert sur la transformation des environnements
    expect(result.environments).toEqual(mockProject.environments.map(({ permissions, quotaStage, ...environment }) => ({
      quota: quotaStage.quota,
      stage: quotaStage.stage.name,
      permissions: permissions.map(permission => ({
        userId: permission.userId,
        permissions: {
          ro: permission.level >= 0,
          rw: permission.level >= 1,
        },
      })),
      ...environment,
    })))

    // Assert sur la transformation des repositories
    expect(result.repositories).toEqual(mockProject.repositories.map(repo => ({ ...repo, newCreds: mockReposCreds[repo.internalRepoName] })))

    // Assert sur le store
    expect(result.store).toEqual(mockStore)
  })
})

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
const project = {
  id: 'dc36b069-8691-448b-a629-a9f43163f19b',
  name: 'project1',
  status: 'created',
  description: '',
  organization: {
    id: '3b114c4c-8e2e-4a14-b638-bdd6d422d17e',
    label: 'org1',
    name: 'org1',
  },
  roles: [
    {
      user: {
        id: 'd86e0034-dac7-4c36-b5e1-ba7be5dc6e62',
        firstName: 'Util1',
        lastName: 'Util2',
        email: 'myemail',
        createdAt: '2024-05-02T09:13:18.291Z',
        updatedAt: '2024-05-02T09:17:46.612Z',
      },
      role: 'owner',
      userId: 'd86e0034-dac7-4c36-b5e1-ba7be5dc6e62',
    },
  ],
  clusters: [associatedCluster, nonAssociatedCluster],
  environments: [
    {
      id: '5fac1f3a-7227-4c61-8355-d7e6bedd463c',
      name: 'test',
      projectId: 'dc36b069-8691-448b-a629-a9f43163f19b',
      createdAt: '2024-05-02T09:17:41.300Z',
      updatedAt: '2024-05-02T09:17:41.300Z',
      clusterId: 'f0e39981-0b6d-4c16-aa96-225062b75767',
      quotaStageId: '0cb0c549-560e-4f26-8f4e-832dd722f68a',
      permissions: [
        {
          id: '4a1a1635-7a5e-445e-a055-da9b1ef1ee5f',
          userId: 'd86e0034-dac7-4c36-b5e1-ba7be5dc6e62',
          environmentId: '5fac1f3a-7227-4c61-8355-d7e6bedd463c',
          level: 2,
          createdAt: '2024-05-02T09:17:41.300Z',
          updatedAt: '2024-05-02T09:17:41.300Z',
        },
      ],
      quotaStage: {
        id: '0cb0c549-560e-4f26-8f4e-832dd722f68a',
        quotaId: '5a57b62f-2465-4fb6-a853-5a751d099199',
        stageId: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
        status: 'active',
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
      },
      cluster: associatedCluster,
    },
    {
      id: '5fac1f3a-7227-4c61-8355-d7e6bedd463c',
      name: 'test',
      projectId: 'dc36b069-8691-448b-a629-a9f43163f19b',
      createdAt: '2024-05-02T09:17:41.300Z',
      updatedAt: '2024-05-02T09:17:41.300Z',
      clusterId: 'f0e39981-0b6d-4c16-aa96-225062b75767',
      quotaStageId: '0cb0c549-560e-4f26-8f4e-832dd722f68a',
      permissions: [
        {
          id: '4a1a1635-7a5e-445e-a055-da9b1ef1ee5f',
          userId: 'd86e0034-dac7-4c36-b5e1-ba7be5dc6e62',
          environmentId: '5fac1f3a-7227-4c61-8355-d7e6bedd463c',
          level: 2,
          createdAt: '2024-05-02T09:17:41.300Z',
          updatedAt: '2024-05-02T09:17:41.300Z',
        },
      ],
      quotaStage: {
        id: '0cb0c549-560e-4f26-8f4e-832dd722f68b',
        quotaId: '5a57b62f-2465-4fb6-a853-5a751d099199',
        stageId: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
        status: 'active',
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
      },
      cluster: nonAssociatedCluster,
    },
  ],
  repositories: [
    {
      id: '56ed626d-ad44-4ae9-b720-702bc5e7afc0',
      externalRepoUrl: 'https://github.com/cloud-pi-native/console.git',
      isInfra: false,
      isPrivate: false,
      internalRepoName: 'console',
    },
  ],
  projectPlugin: [
    {
      key: 'projectId',
      pluginName: 'registry',
      value: '272',
    },
  ],
}
