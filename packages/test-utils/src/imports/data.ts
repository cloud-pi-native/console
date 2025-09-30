export const data = {
  personalAccessToken: [],
  adminToken: [
    {
      id: 'e66a5ce2-440d-4a60-ac0d-d439bbaba040',
      name: 'test',
      hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', // test
      permissions: '2n',
      userId: 'c7712841-c0fd-40ff-abbb-9d914bcc907d',
    },
    {
      id: 'e66a5ce2-440d-4a60-ac0d-d439bbaba041',
      name: 'test',
      hash: '4bb47f186df233e48b09d241ee4defb821add0c35ac8311469fe1522c6813dd5', // revoked
      permissions: '2n',
      userId: 'c7712841-c0fd-40ff-abbb-9d914bcc907d',
      status: 'revoked',
    },
  ],
  adminPlugin: [],
  adminRole: [
    {
      id: '76229c96-4716-45bc-99da-00498ec9018c',
      permissions: '2n',
      position: 0,
      oidcGroup: '/admin',
      name: 'Admin',
    },
    {
      id: 'eadf604f-5f54-4744-bdfb-4793d2271e9b',
      permissions: '2n',
      position: 1,
      oidcGroup: '',
      name: 'Admin Locaux',
    },
  ],
  kubeconfig: [
    {
      id: '2a88634a-0a60-459c-bf68-c4ffb12430a2',
      user: {
        keyData: 'LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=',
        certData: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
      },
      cluster: {
        server: 'https://public.server:6443',
        skipTLSVerify: true,
        tlsServerName: 'public.server',
      },
      createdAt: '2024-07-24T16:54:14.961Z',
      updatedAt: '2024-07-24T16:54:14.961Z',
    },
    {
      id: '2a88634a-0a60-459c-bf68-c4ffb12430a3',
      user: {
        keyData: 'LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=',
        certData: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
      },
      cluster: {
        server: 'https://nowhere.server:6443',
        skipTLSVerify: true,
        tlsServerName: 'nowhere.server',
      },
      createdAt: '2024-07-24T16:54:14.964Z',
      updatedAt: '2024-07-24T16:54:14.964Z',
    },
    {
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
    {
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
  ],
  zone: [
    {
      id: 'a66c4230-eba6-41f1-aae5-bb1e4f90cce1',
      slug: 'pr',
      label: 'Zone privée',
      argocdUrl: 'https://argocd.private-zone.fr',
      description: 'Cette zone de déploiement est privée.',
      createdAt: '2023-07-10T19:32:13.385Z',
      updatedAt: '2023-07-10T19:32:13.385Z',
    },
    {
      id: 'a66c4230-eba6-41f1-aae5-bb1e4f90cce2',
      slug: 'pub',
      label: 'publique',
      argocdUrl: 'https://argocd.public-zone.fr',
      description: 'Zone de diffusion ouverte.',
      createdAt: '2023-07-10T19:32:13.385Z',
      updatedAt: '2023-07-10T19:32:13.385Z',
    },
  ],
  cluster: [
    {
      id: '32636a52-4dd1-430b-b08a-b2e5ed9d1790',
      label: 'unused-cluster',
      privacy: 'public',
      secretName: '3972ac09-6abc-4e49-83b6-d046da5260ed',
      clusterResources: false,
      memory: 8,
      cpu: 10,
      gpu: 0,
      kubeConfigId: '2a88634a-0a60-459c-bf68-c4ffb12430a3',
      createdAt: '2023-07-10T19:32:13.385Z',
      updatedAt: '2023-07-10T19:32:13.385Z',
      infos: 'Cluster public non utilisé',
      zoneId: 'a66c4230-eba6-41f1-aae5-bb1e4f90cce2',
    },
    {
      id: '126ac57f-263c-4463-87bb-d4e9017056b2',
      label: 'top-secret-cluster',
      privacy: 'dedicated',
      secretName: '59be2d50-58f9-42f3-95dc-b0c0518e3d8a',
      clusterResources: true,
      memory: 8,
      cpu: 10,
      gpu: 0,
      kubeConfigId: '0e88f000-07e6-4781-a69d-0963489387f7',
      createdAt: '2023-07-10T19:49:31.691Z',
      updatedAt: '2024-07-24T16:54:15.234Z',
      infos: null,
      zoneId: 'a66c4230-eba6-41f1-aae5-bb1e4f90cce2',
    },
    {
      id: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      label: 'pas-top-cluster',
      privacy: 'dedicated',
      secretName: '94d52618-7869-4192-b33e-85dd0959e815',
      clusterResources: false,
      memory: 30,
      cpu: 20,
      gpu: 0,
      kubeConfigId: 'b5662039-a62b-483e-ba54-b12c6f966c96',
      createdAt: '2023-07-10T19:49:31.697Z',
      updatedAt: '2024-07-24T16:54:15.249Z',
      infos: 'Floating IP : 0.0.0.0',
      zoneId: 'a66c4230-eba6-41f1-aae5-bb1e4f90cce2',
    },
    {
      id: '32636a52-4dd1-430b-b08a-b2e5ed9d1789',
      label: 'public1',
      privacy: 'public',
      secretName: '3972ac09-6abc-4e49-83b6-d046da5260ec',
      clusterResources: false,
      memory: 100,
      cpu: 100,
      gpu: 100,
      kubeConfigId: '2a88634a-0a60-459c-bf68-c4ffb12430a2',
      createdAt: '2023-07-10T19:32:13.385Z',
      updatedAt: '2024-07-24T16:54:15.261Z',
      infos: 'Cluster public proposé par DSO',
      zoneId: 'a66c4230-eba6-41f1-aae5-bb1e4f90cce2',
    },
  ],
  user: [
    {
      id: 'c7712841-c0fd-40ff-abbb-9d914bcc907d',
      firstName: 'Bot Admin',
      lastName: 'test',
      email: 'c7712841-c0fd-40ff-abbb-9d914bcc907d@bot.io',
      createdAt: '2023-11-16T15:30:01.140Z',
      updatedAt: '2023-11-16T15:30:01.140Z',
      adminRoleIds: [],
      type: 'bot',
      lastLogin: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
      firstName: 'Claire',
      lastName: 'NOLLET',
      email: 'claire.nollet@test.com',
      createdAt: '2023-07-03T14:46:56.771Z',
      updatedAt: '2023-07-03T14:46:56.771Z',
      adminRoleIds: [],
      type: 'human',
    },
    {
      id: '387216f1-3b87-4211-9cac-4371125e1175',
      firstName: 'Admin',
      lastName: 'ADMIN',
      email: 'admin@test.com',
      createdAt: '2023-07-03T18:01:52.884Z',
      updatedAt: '2023-07-06T12:53:39.183Z',
      adminRoleIds: [
        '76229c96-4716-45bc-99da-00498ec9018c',
      ],
      type: 'human',
    },
    {
      id: '04ac168a-2c4f-4816-9cce-af6c612e5912',
      firstName: 'Anonymous',
      lastName: 'User',
      email: 'anon@user',
      createdAt: '2023-07-03T14:46:56.770Z',
      updatedAt: '2023-07-03T14:46:56.770Z',
      adminRoleIds: [],
      type: 'ghost',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
      firstName: 'Arnaud',
      lastName: 'TARDIF',
      email: 'arnaud.tardif@test.com',
      createdAt: '2023-07-03T14:46:56.773Z',
      updatedAt: '2023-07-03T14:46:56.773Z',
      adminRoleIds: [],
      type: 'human',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      firstName: 'Jean',
      lastName: 'DUPOND',
      email: 'test@test.com',
      createdAt: '2023-07-03T14:46:56.770Z',
      updatedAt: '2023-07-03T14:46:56.770Z',
      adminRoleIds: [],
      type: 'human',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      firstName: 'Thibault',
      lastName: 'COLIN',
      email: 'thibault.colin@test.com',
      createdAt: '2023-07-03T14:46:56.772Z',
      updatedAt: '2024-07-25T16:18:11.372Z',
      type: 'human',
      adminRoleIds: [
        'eadf604f-5f54-4744-bdfb-4793d2271e9b',
      ],
    },
  ],
  log: [
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1220',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          environment: 'staging',
          registryHost: 'blabla.com',
          repositories: [],
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'Create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.809Z',
      updatedAt: '2023-07-03T14:46:56.809Z',
      requestId: null,
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1221',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          environment: 'staging',
          registryHost: 'blabla.com',
          repositories: [],
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.819Z',
      updatedAt: '2023-07-03T14:46:56.819Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1222',
      data: {
        argo: {
          status: {
            result: 'OK',
            message: 'Not an infra repository',
          },
        },
        args: {
          id: 'bd934af0-6de2-41b2-a111-6b0c45b82384',
          status: 'initializing',
          isInfra: false,
          project: 'int-2',
          createdAt: '2023-06-08T15:15:56.692Z',
          isPrivate: false,
          projectId: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
          updatedAt: '2023-06-08T15:15:56.692Z',
          environment: [],
          internalUrl: 'https://blabla.com/bla/projects/mi/int-2/repo.git',
          externalRepoUrl: 'https://github.com/dnum-mi/dso-console.git',
          externalUserName: '',
          internalRepoName: 'repo',
        },
        vault: {
          status: {
            result: 'OK',
          },
          recordsSaved: 1,
        },
        gitlab: {
          vault: [
            {
              data: {
                GIT_INPUT_URL: 'github.com/dnum-mi/dso-console.git',
                GIT_INPUT_USER: '',
                GIT_OUTPUT_URL: 'blabla.com/bla/projects/mi/int-2/repo.git',
                GIT_OUTPUT_USER: 'root',
                GIT_INPUT_PASSWORD: '',
                GIT_OUTPUT_PASSWORD: 'password',
              },
              name: 'repo-mirror',
            },
          ],
          status: {
            result: 'OK',
            message: 'Created',
          },
        },
      },
      action: 'Create Repository',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.819Z',
      updatedAt: '2023-07-03T14:46:56.819Z',
      requestId: null,
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1223',
      data: {
        argo: {
          status: {
            result: 'OK',
            message: 'Not an infra repository',
          },
        },
        args: {
          id: 'bd934af0-6de2-41b2-a111-6b0c45b82384',
          status: 'initializing',
          isInfra: false,
          project: 'int-2',
          createdAt: '2023-06-08T15:15:56.692Z',
          isPrivate: false,
          projectId: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
          updatedAt: '2023-06-08T15:15:56.692Z',
          environment: [],
          internalUrl: 'https://blabla.com/bla/projects/mi/int-2/repo.git',
          externalRepoUrl: 'https://github.com/dnum-mi/dso-console.git',
          externalUserName: '',
          internalRepoName: 'repo',
        },
        vault: {
          status: {
            result: 'OK',
          },
          recordsSaved: 1,
        },
        gitlab: {
          vault: [
            {
              data: {
                GIT_INPUT_URL: 'github.com/dnum-mi/dso-console.git',
                GIT_INPUT_USER: '',
                GIT_OUTPUT_URL: 'blabla.com/bla/projects/mi/int-2/repo.git',
                GIT_OUTPUT_USER: 'root',
                GIT_INPUT_PASSWORD: '',
                GIT_OUTPUT_PASSWORD: 'password',
              },
              name: 'repo-mirror',
            },
          ],
          status: {
            result: 'OK',
            message: 'Created',
          },
        },
      },
      action: 'Create Repository',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1224',
      data: {
        args: {
          id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          locked: true,
          status: 'initializing',
          project: 'int-2',
          createdAt: '2023-06-08T15:14:53.517Z',
          updatedAt: '2023-06-08T15:14:53.517Z',
          description: '',
        },
        nexus: {
          user: {
            roles: [
              'mi-int-2-ID',
            ],
            source: 'default',
            status: 'active',
            userId: 'mi-int-2',
            lastName: 'Luffy',
            readOnly: false,
            firstName: 'Monkey D.',
            emailAddress: 'claire.nollet@interieur.gouv.fr',
            externalRoles: [],
          },
          vault: [
            {
              data: {
                NEXUS_PASSWORD: 'password',
                NEXUS_USERNAME: 'mi-int-2',
              },
              name: 'NEXUS',
            },
          ],
          status: {
            result: 'OK',
            message: 'User Created',
          },
        },
        vault: {
          status: {
            result: 'OK',
          },
          recordsSaved: 4,
        },
        keycloak: {
          group: {
            id: '4a767b5c-1bf4-43b9-8164-5da76ded49a0',
          },
          status: {
            result: 'OK',
          },
        },
        registry: {
          vault: [
            {
              data: {
                HOST: 'blabla.com',
                TOKEN: 'token',
                USERNAME: 'robot$mi-int-2+ci',
                DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
              },
              name: 'REGISTRY',
            },
          ],
          result: {
            robot: {
              id: 70,
              name: 'robot$mi-int-2+ci',
              secret: 'token',
              expires_at: -1,
              creation_time: '2023-06-08T15:14:55.813Z',
            },
            project: {
              name: 'mi-int-2',
              metadata: {
                public: 'false',
              },
              owner_id: 1,
              owner_name: 'admin',
              project_id: 63,
              repo_count: 0,
              update_time: '2023-06-08T15:14:55.363Z',
              creation_time: '2023-06-08T15:14:55.363Z',
              cve_allowlist: {
                id: 65,
                items: [],
                project_id: 63,
                update_time: '0001-01-01T00:00:00.000Z',
                creation_time: '0001-01-01T00:00:00.000Z',
              },
              current_user_role_id: 1,
              current_user_role_ids: [
                1,
              ],
            },
          },
          status: {
            result: 'OK',
            message: 'Created',
          },
        },
        sonarqube: {
          user: {
            user: {
              name: 'mi-int-2',
              email: 'claire.nollet@interieur.gouv.fr',
              local: true,
              login: 'mi-int-2',
              active: true,
              scmAccounts: [],
            },
          },
          vault: [
            {
              data: {
                SONAR_TOKEN: 'token',
                SONAR_PASSWORD: 'password',
                SONAR_USERNAME: 'mi-int-2',
              },
              name: 'SONAR',
            },
          ],
          result: {},
          status: {
            result: 'OK',
            message: 'User Created',
          },
        },
      },
      action: 'Create Environment',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1225',
      data: {
        args: {
          id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
          locked: false,
          status: 'created',
          project: 'int-2',
          createdAt: '2023-06-08T15:14:53.517Z',
          updatedAt: '2023-06-08T15:16:49.011Z',
          description: '',
        },
        nexus: {
          status: {
            result: 'OK',
            message: 'User deleted',
          },
        },
        vault: {
          status: {
            result: 'OK',
          },
          secretsDestroyed: 5,
        },
        gitlab: {
          status: {
            result: 'OK',
            message: 'Deleted',
          },
        },
        keycloak: {
          status: {
            result: 'OK',
            message: 'Deleted',
          },
        },
        registry: {
          status: {
            result: 'OK',
            message: 'Deleted',
          },
        },
        sonarqube: {
          status: {
            result: 'OK',
            message: 'User anonymized',
          },
        },
      },
      action: 'Delete Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1226',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1227',
      data: {
        argo: {
          status: {
            result: 'KO',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1228',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1229',
      data: {
        argo: {
          status: {
            result: 'KO',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1230',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1231',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1232',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1233',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1234',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1235',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1236',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1237',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1238',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1239',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1240',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1241',
      data: {
        argo: {
          status: {
            result: 'OK',
          },
        },
        args: {
          owner: {
            id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            email: 'claire.nollet@interieur.gouv.fr',
            lastName: 'Nollet',
            createdAt: '2023-06-08T14:57:58.401Z',
            firstName: 'Claire',
            updatedAt: '2023-06-08T14:57:58.401Z',
          },
          project: 'int-2',
          repository: [],
          environment: 'staging',
          registryHost: 'blabla.com',
        },
        vault: {
          status: {
            result: 'OK',
          },
          pullSecret: {
            data: {
              HOST: 'blabla.com',
              TOKEN: 'token',
              USERNAME: 'robot$mi-int-2+ci',
              DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
            },
            metadata: {
              version: 1,
              destroyed: false,
              created_time: '2023-06-08T15:14:56.087835715Z',
              deletion_time: '',
              custom_metadata: null,
            },
          },
        },
        keycloak: {
          group: {
            id: '6ce9c548-d0f6-490b-b32d-6e62c20e5eff',
          },
          status: {
            result: 'OK',
          },
          roGroup: '/mi-int-2/staging/RO',
          rwGroup: '/mi-int-2/staging/RW',
        },
      },
      action: 'create Project',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.788Z',
      requestId: null,
      projectId: null,
    },
  ],
  project: [
    {
      id: '22e7044f-8414-435d-9c4a-2df42a65034b',
      name: 'betaapp',
      slug: 'betaapp',
      lastSuccessProvisionningVersion: '8.23.0',
      description: '',
      status: 'created',
      locked: false,
      createdAt: '2023-07-03T14:46:56.814Z',
      updatedAt: '2023-07-03T14:46:56.817Z',
      everyonePerms: '896n',
      ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      limitless: false,
      hprodCpu: 100,
      hprodGpu: 100,
      hprodMemory: 100,
      prodCpu: 100,
      prodGpu: 100,
      prodMemory: 100,
    },
    {
      id: '9dabf3f9-6c86-4358-8598-65007d78df65',
      name: 'projecttoarchive',
      slug: 'projecttoarchive',
      lastSuccessProvisionningVersion: '8.23.0',
      description: '',
      status: 'created',
      locked: false,
      createdAt: '2023-07-03T14:46:56.824Z',
      updatedAt: '2023-07-03T14:46:56.830Z',
      everyonePerms: '896n',
      ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      limitless: false,
      hprodCpu: 100,
      hprodGpu: 100,
      hprodMemory: 100,
      prodCpu: 100,
      prodGpu: 100,
      prodMemory: 100,
    },
    {
      id: '011e7860-04d7-461f-912d-334c622d38b3',
      name: 'candilib',
      slug: 'candilib',
      lastSuccessProvisionningVersion: '8.23.0',
      description: 'Application de réservation de places à l\'examen du permis B.',
      status: 'created',
      locked: false,
      createdAt: '2023-07-03T14:46:56.778Z',
      updatedAt: '2023-07-03T14:46:56.783Z',
      everyonePerms: '896n',
      ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      limitless: false,
      hprodCpu: 100,
      hprodGpu: 100,
      hprodMemory: 100,
      prodCpu: 100,
      prodGpu: 100,
      prodMemory: 100,
    },
    {
      id: '011e7860-04d7-461f-912d-334c622d38c5',
      name: 'basegun',
      slug: 'basegun',
      lastSuccessProvisionningVersion: '8.23.0',
      description: 'Application d\'aide à la catégorisation d\'armes à feu.',
      status: 'created',
      locked: false,
      createdAt: '2023-07-10T14:46:56.778Z',
      updatedAt: '2023-07-10T14:46:56.783Z',
      everyonePerms: '896n',
      ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      limitless: false,
      hprodCpu: 100,
      hprodGpu: 100,
      hprodMemory: 100,
      prodCpu: 100,
      prodGpu: 100,
      prodMemory: 100,
    },
    {
      id: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      name: 'psijfailed',
      slug: 'psijfailed',
      lastSuccessProvisionningVersion: '8.23.0',
      description: 'Application de transmission d\'informations entre agents de la PS et de l\'IJ.',
      status: 'failed',
      locked: true,
      createdAt: '2023-07-03T14:46:56.799Z',
      updatedAt: '2023-07-03T14:46:56.806Z',
      everyonePerms: '896n',
      ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      limitless: false,
      hprodCpu: 100,
      hprodGpu: 100,
      hprodMemory: 100,
      prodCpu: 100,
      prodGpu: 100,
      prodMemory: 100,
    },
    {
      id: '8bd21636-e8ce-4098-8ed8-16cbd60af340',
      name: 'projet dégradé',
      slug: 'projet dégradé',
      lastSuccessProvisionningVersion: '8.23.0',
      description: 'Projet testé en état dégradé',
      status: 'warning',
      locked: true,
      createdAt: '2023-07-03T14:46:56.799Z',
      updatedAt: '2023-07-03T14:46:56.806Z',
      everyonePerms: '896n',
      ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      limitless: false,
      hprodCpu: 100,
      hprodGpu: 100,
      hprodMemory: 100,
      prodCpu: 100,
      prodGpu: 100,
      prodMemory: 100,
    },
    {
      id: '554d9150-9a07-42c1-8207-1163f2f0addd',
      name: 'pissenlit',
      slug: 'pissenlit',
      lastSuccessProvisionningVersion: '8.23.0',
      description: '',
      status: 'created',
      locked: false,
      createdAt: '2023-07-03T14:46:56.799Z',
      updatedAt: '2023-07-03T14:46:56.806Z',
      everyonePerms: '896n',
      ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      limitless: false,
      hprodCpu: 100,
      hprodGpu: 100,
      hprodMemory: 100,
      prodCpu: 100,
      prodGpu: 100,
      prodMemory: 100,
    },
    {
      id: '94c860ab-023f-4e6e-8a4e-ff41456e249b',
      name: 'rolistes',
      slug: 'rolistes',
      lastSuccessProvisionningVersion: '8.23.0',
      description: '',
      status: 'created',
      locked: false,
      createdAt: '2023-07-03T14:46:56.799Z',
      updatedAt: '2023-07-03T14:46:56.806Z',
      everyonePerms: '0n',
      ownerId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      limitless: false,
      hprodCpu: 100,
      hprodGpu: 100,
      hprodMemory: 100,
      prodCpu: 100,
      prodGpu: 100,
      prodMemory: 100,
    },
  ],
  stage: [
    {
      id: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
      name: 'dev',
    },
    {
      id: '38fa869d-6267-441d-af7f-e0548fd06b7e',
      name: 'staging',
    },
    {
      id: 'd434310e-7850-4d59-b47f-0772edf50582',
      name: 'integration',
    },
    {
      id: '9b3e9991-896d-4d90-bdc5-a34be8c06b8f',
      name: 'prod',
    },
  ],
  environment: [
    {
      id: 'bc06ace5-ddf6-4f00-97fa-872922baf078',
      name: 'dev',
      cpu: 2,
      gpu: 0,
      memory: 4,
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      createdAt: '2023-07-03T14:46:56.819Z',
      updatedAt: '2023-07-03T14:46:56.826Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      stageId: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
    },
    {
      id: '95ef0d9b-945e-4af6-851c-4c6685ceff20',
      name: 'staging',
      cpu: 2,
      gpu: 0,
      memory: 4,
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      createdAt: '2023-07-03T14:46:56.819Z',
      updatedAt: '2023-07-03T14:46:56.829Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      stageId: '38fa869d-6267-441d-af7f-e0548fd06b7e',
    },
    {
      id: '8d4503eb-64c7-407e-89db-6ab80865071f',
      name: 'dev',
      cpu: 2,
      gpu: 0,
      memory: 4,
      projectId: '9dabf3f9-6c86-4358-8598-65007d78df65',
      createdAt: '2023-07-03T14:46:56.834Z',
      updatedAt: '2023-07-03T14:46:56.855Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      stageId: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
    },
    {
      id: '3b0cf6c1-251b-4ec6-926f-b54ce1f82560',
      name: 'staging',
      cpu: 2,
      gpu: 0,
      memory: 4,
      projectId: '9dabf3f9-6c86-4358-8598-65007d78df65',
      createdAt: '2023-07-03T14:46:56.834Z',
      updatedAt: '2023-07-03T14:46:56.859Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      stageId: '38fa869d-6267-441d-af7f-e0548fd06b7e',
    },
    {
      id: '1b9f1053-fcf5-4053-a7b2-ff8a2c0c1921',
      name: 'dev',
      cpu: 2,
      gpu: 0,
      memory: 4,
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      createdAt: '2023-07-03T14:46:56.787Z',
      updatedAt: '2023-07-03T14:46:56.803Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      stageId: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
    },
    {
      id: '1c654f00-4798-4a80-929f-960ddb37885a',
      name: 'integration',
      cpu: 2,
      gpu: 0,
      memory: 4,
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.803Z',
      clusterId: '126ac57f-263c-4463-87bb-d4e9017056b2',
      stageId: 'd434310e-7850-4d59-b47f-0772edf50582',
    },
    {
      id: '1c654f00-4798-4a80-929f-960ddb36774b',
      name: 'integration',
      cpu: 2,
      gpu: 0,
      memory: 4,
      projectId: '011e7860-04d7-461f-912d-334c622d38c5',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.803Z',
      clusterId: '32636a52-4dd1-430b-b08a-b2e5ed9d1789',
      stageId: 'd434310e-7850-4d59-b47f-0772edf50582',
    },
    {
      id: '2805a1f5-0ca4-46a4-b3d7-5b649aee4a91',
      name: 'integration',
      cpu: 2,
      gpu: 0,
      memory: 4,
      projectId: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      createdAt: '2023-07-03T14:46:56.808Z',
      updatedAt: '2023-07-03T14:46:56.815Z',
      clusterId: '32636a52-4dd1-430b-b08a-b2e5ed9d1789',
      stageId: 'd434310e-7850-4d59-b47f-0772edf50582',
    },
    {
      id: '2805a1f5-0ca4-46a4-b3d7-5b649aee4a92',
      name: 'dev',
      cpu: 2,
      gpu: 0,
      memory: 4,
      projectId: '94c860ab-023f-4e6e-8a4e-ff41456e249b',
      createdAt: '2023-07-03T15:56:56.808Z',
      updatedAt: '2023-07-03T15:56:56.815Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      stageId: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
    },
  ],
  projectClusterHistory: [
    {
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
    },
    {
      projectId: '9dabf3f9-6c86-4358-8598-65007d78df65',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
    },
    {
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
    },
    {
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      clusterId: '126ac57f-263c-4463-87bb-d4e9017056b2',
    },
    {
      projectId: '011e7860-04d7-461f-912d-334c622d38c5',
      clusterId: '32636a52-4dd1-430b-b08a-b2e5ed9d1789',
    },
    {
      projectId: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      clusterId: '32636a52-4dd1-430b-b08a-b2e5ed9d1789',
    },
  ],
  projectMembers: [
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
      projectId: '94c860ab-023f-4e6e-8a4e-ff41456e249b',
      roleIds: [
        'c77a1b96-377d-4aa3-bc94-65d4415f9599',
      ],
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      roleIds: [],
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      roleIds: [
        'c77a1b96-377d-4aa3-bc94-65d4415f95b5',
      ],
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
      projectId: '554d9150-9a07-42c1-8207-1163f2f0addd',
      roleIds: [
        'c77a1b96-377d-4aa3-bc94-65d4415f9595',
      ],
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
      projectId: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      roleIds: [],
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      projectId: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      roleIds: [],
    },
  ],
  projectPlugin: [],
  projectRole: [
    {
      id: 'c77a1b96-377d-4aa3-bc94-65d4415f95b5',
      name: 'bg75',
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      permissions: '2n',
      position: 0,
    },
    {
      id: 'c77a1b96-377d-4aa3-bc94-65d4415f9595',
      name: 'bg78',
      projectId: '554d9150-9a07-42c1-8207-1163f2f0addd',
      permissions: '1n',
      position: 0,
    },
    {
      id: 'c77a1b96-377d-4aa3-bc94-65d4415f9599',
      name: 'level up',
      projectId: '94c860ab-023f-4e6e-8a4e-ff41456e249b',
      permissions: '0n',
      position: 0,
    },
  ],
  repository: [
    {
      id: '53891549-e628-4893-8bd3-92abcb71068a',
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      internalRepoName: 'beta-front',
      externalRepoUrl: 'https://github.com/dnum-mi/beta-front.git',
      externalUserName: 'this-is-a-test',
      isInfra: false,
      isPrivate: true,
      createdAt: '2023-07-03T14:46:56.819Z',
      updatedAt: '2023-07-03T14:46:56.825Z',
    },
    {
      id: '26ad0fee-c4bd-462c-a4f7-0f7a713b56f7',
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      internalRepoName: 'beta-back',
      externalRepoUrl: 'https://github.com/dnum-mi/beta-back.git',
      externalUserName: '',
      isInfra: false,
      isPrivate: false,
      createdAt: '2023-07-03T14:46:56.819Z',
      updatedAt: '2023-07-03T14:46:56.825Z',
    },
    {
      id: '83aa3c2a-cdae-4638-b95f-a02b3f31eace',
      projectId: '9dabf3f9-6c86-4358-8598-65007d78df65',
      internalRepoName: 'archive-front',
      externalRepoUrl: 'https://github.com/dnum-mi/archive-front.git',
      externalUserName: 'this-is-a-test',
      isInfra: false,
      isPrivate: true,
      createdAt: '2023-07-03T14:46:56.834Z',
      updatedAt: '2023-07-03T14:46:56.857Z',
    },
    {
      id: 'ad77aa10-a708-4fce-8d0c-15c1b4704309',
      projectId: '9dabf3f9-6c86-4358-8598-65007d78df65',
      internalRepoName: 'archive-back',
      externalRepoUrl: 'https://github.com/dnum-mi/archive-back.git',
      externalUserName: '',
      isInfra: false,
      isPrivate: false,
      createdAt: '2023-07-03T14:46:56.834Z',
      updatedAt: '2023-07-03T14:46:56.854Z',
    },
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
    {
      id: 'c26df1a3-2e03-420d-9894-cd9ce4f98b60',
      projectId: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      internalRepoName: 'psij-back',
      externalRepoUrl: 'https://github.com/dnum-mi/psij-back.git',
      externalUserName: 'this-is-a-test',
      isInfra: false,
      isPrivate: true,
      createdAt: '2023-07-03T14:46:56.809Z',
      updatedAt: '2023-07-03T14:46:56.813Z',
    },
    {
      id: '78f2b122-13cc-406f-bac8-9f0947a23172',
      projectId: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      internalRepoName: 'psij-front',
      externalRepoUrl: 'https://github.com/dnum-mi/psij-front.git',
      externalUserName: 'this-is-a-test',
      isInfra: false,
      isPrivate: true,
      createdAt: '2023-07-03T14:46:56.809Z',
      updatedAt: '2023-07-03T14:46:56.816Z',
    },
    {
      id: '9d3e7791-ee67-4282-be95-613c491c2e75',
      projectId: '554d9150-9a07-42c1-8207-1163f2f0addd',
      internalRepoName: 'pissenlit',
      externalRepoUrl: 'https://github.com/dnum-mi/pissenlit.git',
      isInfra: false,
      isPrivate: false,
      createdAt: '2023-07-03T14:46:56.809Z',
      updatedAt: '2023-07-03T14:46:56.816Z',
    },
    {
      id: '9d3e7791-ee67-4282-be95-613c491c2e76',
      projectId: '94c860ab-023f-4e6e-8a4e-ff41456e249b',
      internalRepoName: 'warhammer',
      externalRepoUrl: 'https://github.com/dnum-mi/warhammer.git',
      isInfra: false,
      isPrivate: false,
      createdAt: '2023-07-03T16:46:56.809Z',
      updatedAt: '2023-07-03T16:46:56.816Z',
    },
  ],
  systemSetting: [
    {
      key: 'maintenance',
      value: 'off',
    },
  ],
  associations: [
    [
      'cluster',
      [
        {
          id: '32636a52-4dd1-430b-b08a-b2e5ed9d1790',
          projects: [],
        },
        {
          id: '126ac57f-263c-4463-87bb-d4e9017056b2',
          projects: [
            {
              id: '011e7860-04d7-461f-912d-334c622d38b3',
            },
            {
              id: '83833faf-f654-40dd-bcd5-cf2e944fc702',
            },
          ],
        },
        {
          id: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
          projects: [
            {
              id: '011e7860-04d7-461f-912d-334c622d38b3',
            },
            {
              id: '83833faf-f654-40dd-bcd5-cf2e944fc702',
            },
            {
              id: '22e7044f-8414-435d-9c4a-2df42a65034b',
            },
            {
              id: '9dabf3f9-6c86-4358-8598-65007d78df65',
            },
          ],
        },
        {
          id: '32636a52-4dd1-430b-b08a-b2e5ed9d1789',
          projects: [],
        },
      ],
    ],
    [
      'cluster',
      [
        {
          id: '32636a52-4dd1-430b-b08a-b2e5ed9d1790',
          stages: [],
        },
        {
          id: '126ac57f-263c-4463-87bb-d4e9017056b2',
          stages: [
            {
              id: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
            },
            {
              id: '38fa869d-6267-441d-af7f-e0548fd06b7e',
            },
            {
              id: 'd434310e-7850-4d59-b47f-0772edf50582',
            },
            {
              id: '9b3e9991-896d-4d90-bdc5-a34be8c06b8f',
            },
          ],
        },
        {
          id: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
          stages: [
            {
              id: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
            },
            {
              id: '38fa869d-6267-441d-af7f-e0548fd06b7e',
            },
            {
              id: 'd434310e-7850-4d59-b47f-0772edf50582',
            },
            {
              id: '9b3e9991-896d-4d90-bdc5-a34be8c06b8f',
            },
          ],
        },
        {
          id: '32636a52-4dd1-430b-b08a-b2e5ed9d1789',
          stages: [
            {
              id: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
            },
            {
              id: '38fa869d-6267-441d-af7f-e0548fd06b7e',
            },
            {
              id: 'd434310e-7850-4d59-b47f-0772edf50582',
            },
            {
              id: '9b3e9991-896d-4d90-bdc5-a34be8c06b8f',
            },
          ],
        },
      ],
    ],
  ],
}
