export const data = {
  projects: [
    {
      id: '011e7860-04d7-461f-912d-334c622d38b3',
      organization: 'ministere-interieur',
      name: 'candilib',
      description: 'Application de réservation de places à l\'examen du permis B.',
      users: [
        {
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
          role: 'owner',
        },
        {
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
          role: 'user',
        },
        {
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
          role: 'user',
        },
      ],
      repositories: [
        {
          internalRepoName: 'candilib',
          externalRepoUrl: 'https://github.com/dnum-mi/candilib.git',
          isPrivate: true,
          externalUserName: 'this-is-a-test',
          externalToken: 'this-is-a-token',
          isInfra: false,
          status: 'created',
        },
      ],
      environments: [
        {
          name: 'staging',
          status: 'created',
          permissions: [
            {
              userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
              level: 2,
            },
          ],
        },
        {
          name: 'prod',
          status: 'created',
          permissions: [
            {
              userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
              level: 2,
            },
            {
              userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
              level: 0,
            },
            {
              userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
              level: 0,
            },
          ],
        },
      ],
      services: {
        gitlab: {
          id: 34,
        },
        registry: {
          id: 25,
        },
      },
      status: 'created',
      locked: false,
      logs: [
        {
          action: 'create Project',
          userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
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
              organization: 'ministere-interieur',
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
                  USERNAME: 'robot$ministere-interieur-int-2+ci',
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
              roGroup: '/ministere-interieur-int-2/staging/RO',
              rwGroup: '/ministere-interieur-int-2/staging/RW',
            },
            kubernetes: {
              ns: {
                kind: 'Namespace',
                spec: {
                  finalizers: [
                    'kubernetes',
                  ],
                },
                status: {
                  phase: 'Active',
                },
                metadata: {
                  uid: 'facaa8a7-956c-4bbb-88d9-b6598ca90b43',
                  name: 'ministere-interieur-int-2-staging',
                  labels: {
                    'dso/projet': 'int-2',
                    'dso/owner.id': 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
                    'dso/environment': 'staging',
                    'dso/organization': 'ministere-interieur',
                    'dso/owner.lastName': 'Nollet',
                    'dso/owner.firstName': 'Claire',
                    'kubernetes.io/metadata.name': 'ministere-interieur-int-2-staging',
                  },
                  managedFields: [
                    {
                      time: '2023-06-08T15:16:44.000Z',
                      manager: 'unknown',
                      fieldsV1: {
                        'f:metadata': {
                          'f:labels': {
                            '.': {},
                            'f:dso/projet': {},
                            'f:dso/owner.id': {},
                            'f:dso/environment': {},
                            'f:dso/organization': {},
                            'f:dso/owner.lastName': {},
                            'f:dso/owner.firstName': {},
                            'f:kubernetes.io/metadata.name': {},
                          },
                        },
                      },
                      operation: 'Update',
                      apiVersion: 'v1',
                      fieldsType: 'FieldsV1',
                    },
                  ],
                  resourceVersion: '140498752',
                  creationTimestamp: '2023-06-08T15:16:44.000Z',
                },
                apiVersion: 'v1',
              },
              status: {
                result: 'OK',
                message: 'Updated',
              },
            },
          },
        },
        {
          action: 'Create Repository',
          userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
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
              services: {
                gitlab: {
                  id: 252,
                },
                registry: {
                  id: 63,
                },
              },
              createdAt: '2023-06-08T15:15:56.692Z',
              isPrivate: false,
              projectId: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
              updatedAt: '2023-06-08T15:15:56.692Z',
              environment: [],
              internalUrl: 'https://blabla.com/bla/projects/ministere-interieur/int-2/repo.git',
              organization: 'ministere-interieur',
              externalToken: '',
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
                    PROJECT_NAME: 'int-2',
                    GIT_INPUT_URL: 'github.com/dnum-mi/dso-console.git',
                    GIT_INPUT_USER: '',
                    GIT_OUTPUT_URL: 'blabla.com/bla/projects/ministere-interieur/int-2/repo.git',
                    GIT_OUTPUT_USER: 'root',
                    ORGANIZATION_NAME: 'ministere-interieur',
                    GIT_INPUT_PASSWORD: '',
                    GIT_PIPELINE_TOKEN: 'token',
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
        },
        {
          action: 'Create Environment',
          userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
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
              services: null,
              createdAt: '2023-06-08T15:14:53.517Z',
              updatedAt: '2023-06-08T15:14:53.517Z',
              description: null,
              organization: 'ministere-interieur',
            },
            nexus: {
              user: {
                roles: [
                  'ministere-interieur-int-2-ID',
                ],
                source: 'default',
                status: 'active',
                userId: 'ministere-interieur-int-2',
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
                    NEXUS_USERNAME: 'ministere-interieur-int-2',
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
            gitlab: {
              vault: [
                {
                  data: {
                    PROJECT_NAME: 'int-2',
                    ORGANIZATION_NAME: 'ministere-interieur',
                  },
                  name: 'GITLAB',
                },
              ],
              result: {
                user: {
                  id: 4,
                  bio: '',
                  bot: false,
                  name: 'claire.nollet.interieur.gouv.fr',
                  note: null,
                  email: 'claire.nollet@interieur.gouv.fr',
                  skype: '',
                  state: 'active',
                  discord: '',
                  twitter: '',
                  web_url: 'https://blabla.com/claire.nollet.interieur.gouv.fr',
                  external: false,
                  is_admin: false,
                  linkedin: '',
                  location: '',
                  pronouns: null,
                  theme_id: 1,
                  username: 'claire.nollet.interieur.gouv.fr',
                  followers: 0,
                  following: 0,
                  job_title: '',
                  avatar_url: 'https://secure.gravatar.com/avatar/8788671a0d7a433f128a49fe1953ac34?s=80&d=identicon',
                  created_at: '2023-05-11T17:19:29.797Z',
                  created_by: {
                    id: 1,
                    name: 'Administrator',
                    state: 'active',
                    web_url: 'https://blabla.com/root',
                    username: 'root',
                    avatar_url: 'https://secure.gravatar.com/avatar/e64c7d89f26bd1972efa854d13d7dd61?s=80&d=identicon',
                  },
                  identities: [],
                  local_time: null,
                  is_followed: false,
                  website_url: '',
                  commit_email: 'claire.nollet@interieur.gouv.fr',
                  confirmed_at: '2023-05-11T17:19:29.605Z',
                  namespace_id: 38,
                  organization: '',
                  public_email: null,
                  projects_limit: 100000,
                  color_scheme_id: 1,
                  last_sign_in_at: null,
                  private_profile: false,
                  can_create_group: false,
                  last_activity_on: null,
                  work_information: null,
                  can_create_project: true,
                  current_sign_in_at: null,
                  two_factor_enabled: false,
                  using_license_seat: false,
                  shared_runners_minutes_limit: null,
                  extra_shared_runners_minutes_limit: null,
                },
                group: {
                  id: 252,
                  name: 'int-2',
                  path: 'int-2',
                  ldap_cn: null,
                  web_url: 'https://blabla.com/groups/forge-mi/projects/ministere-interieur/int-2',
                  full_name: 'forge-mi / projects / ministere-interieur / int-2',
                  full_path: 'forge-mi/projects/ministere-interieur/int-2',
                  parent_id: 250,
                  avatar_url: null,
                  created_at: '2023-06-08T15:14:54.262Z',
                  visibility: 'private',
                  description: '',
                  ldap_access: null,
                  lfs_enabled: true,
                  emails_disabled: null,
                  membership_lock: false,
                  mentions_disabled: null,
                  wiki_access_level: 'enabled',
                  shared_with_groups: [],
                  auto_devops_enabled: null,
                  share_with_group_lock: false,
                  project_creation_level: 'maintainer',
                  request_access_enabled: true,
                  subgroup_creation_level: 'owner',
                  two_factor_grace_period: 48,
                  default_branch_protection: 0,
                  shared_runners_minutes_limit: null,
                  prevent_forking_outside_group: null,
                  require_two_factor_authentication: false,
                  extra_shared_runners_minutes_limit: null,
                },
                groupMember: {
                  id: 4,
                  name: 'claire.nollet.interieur.gouv.fr',
                  state: 'active',
                  web_url: 'https://blabla.com/claire.nollet.interieur.gouv.fr',
                  username: 'claire.nollet.interieur.gouv.fr',
                  avatar_url: 'https://secure.gravatar.com/avatar/8788671a0d7a433f128a49fe1953ac34?s=80&d=identicon',
                  created_at: '2023-06-08T15:14:54.918Z',
                  created_by: {
                    id: 1,
                    name: 'Administrator',
                    state: 'active',
                    web_url: 'https://blabla.com/root',
                    username: 'root',
                    avatar_url: 'https://secure.gravatar.com/avatar/e64c7d89f26bd1972efa854d13d7dd61?s=80&d=identicon',
                  },
                  expires_at: null,
                  access_level: 40,
                  membership_state: 'active',
                },
              },
              status: {
                result: 'OK',
                message: 'Created',
              },
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
                    USERNAME: 'robot$ministere-interieur-int-2+ci',
                    DOCKER_CONFIG: '{"auths":{"blabla.com":{"auth":"token","email":""}}}',
                  },
                  name: 'REGISTRY',
                },
              ],
              result: {
                robot: {
                  id: 70,
                  name: 'robot$ministere-interieur-int-2+ci',
                  secret: 'token',
                  expires_at: -1,
                  creation_time: '2023-06-08T15:14:55.813Z',
                },
                project: {
                  name: 'ministere-interieur-int-2',
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
                  name: 'ministere-interieur-int-2',
                  email: 'claire.nollet@interieur.gouv.fr',
                  local: true,
                  login: 'ministere-interieur-int-2',
                  active: true,
                  scmAccounts: [],
                },
              },
              vault: [
                {
                  data: {
                    SONAR_TOKEN: 'token',
                    SONAR_PASSWORD: 'password',
                    SONAR_USERNAME: 'ministere-interieur-int-2',
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
        },
        {
          action: 'Delete Project',
          userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
          data: {
            args: {
              id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
              locked: false,
              status: 'created',
              project: 'int-2',
              services: {
                gitlab: {
                  id: 252,
                },
                registry: {
                  id: 63,
                },
              },
              createdAt: '2023-06-08T15:14:53.517Z',
              updatedAt: '2023-06-08T15:16:49.011Z',
              description: null,
              organization: 'ministere-interieur',
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
        },
      ],
    },
    {
      id: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      organization: 'ministere-interieur',
      name: 'psij-failed',
      description: 'Application de transmission d\'informations entre agents de la PS et de l\'IJ.',
      users: [
        {
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
          role: 'owner',
        },
      ],
      repositories: [
        {
          internalRepoName: 'psij-front',
          externalRepoUrl: 'https://github.com/dnum-mi/psij-front.git',
          isPrivate: true,
          externalUserName: 'this-is-a-test',
          externalToken: 'this-is-a-token',
          isInfra: false,
          status: 'created',
        },
        {
          internalRepoName: 'psij-back',
          externalRepoUrl: 'https://github.com/dnum-mi/psij-back.git',
          isPrivate: true,
          externalUserName: 'this-is-a-test',
          externalToken: 'this-is-a-token',
          isInfra: false,
          status: 'failed',
        },
      ],
      environments: [{
        name: 'prod',
        status: 'created',
        permissions: [
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            level: 2,
          },
        ],
      }],
      services: {
        gitlab: {
          id: 34,
        },
        registry: {
          id: 25,
        },
      },
      status: 'failed',
      locked: true,
      logs: [
        {
          action: 'create Project',
          userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
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
              organization: 'ministere-interieur',
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
                  USERNAME: 'robot$ministere-interieur-int-2+ci',
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
              roGroup: '/ministere-interieur-int-2/staging/RO',
              rwGroup: '/ministere-interieur-int-2/staging/RW',
            },
            kubernetes: {
              ns: {
                kind: 'Namespace',
                spec: {
                  finalizers: [
                    'kubernetes',
                  ],
                },
                status: {
                  phase: 'Active',
                },
                metadata: {
                  uid: 'facaa8a7-956c-4bbb-88d9-b6598ca90b43',
                  name: 'ministere-interieur-int-2-staging',
                  labels: {
                    'dso/projet': 'int-2',
                    'dso/owner.id': 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
                    'dso/environment': 'staging',
                    'dso/organization': 'ministere-interieur',
                    'dso/owner.lastName': 'Nollet',
                    'dso/owner.firstName': 'Claire',
                    'kubernetes.io/metadata.name': 'ministere-interieur-int-2-staging',
                  },
                  managedFields: [
                    {
                      time: '2023-06-08T15:16:44.000Z',
                      manager: 'unknown',
                      fieldsV1: {
                        'f:metadata': {
                          'f:labels': {
                            '.': {},
                            'f:dso/projet': {},
                            'f:dso/owner.id': {},
                            'f:dso/environment': {},
                            'f:dso/organization': {},
                            'f:dso/owner.lastName': {},
                            'f:dso/owner.firstName': {},
                            'f:kubernetes.io/metadata.name': {},
                          },
                        },
                      },
                      operation: 'Update',
                      apiVersion: 'v1',
                      fieldsType: 'FieldsV1',
                    },
                  ],
                  resourceVersion: '140498752',
                  creationTimestamp: '2023-06-08T15:16:44.000Z',
                },
                apiVersion: 'v1',
              },
              status: {
                result: 'OK',
                message: 'Updated',
              },
            },
          },
        },
      ],
    },
    {
      id: '22e7044f-8414-435d-9c4a-2df42a65034b',
      organization: 'dinum',
      name: 'beta-app',
      users: [
        {
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
          role: 'owner',
        },
        {
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
          role: 'user',
        },
        {
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
          role: 'user',
        },
        {
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
          role: 'user',
        },
      ],
      repositories: [
        {
          internalRepoName: 'beta-front',
          externalRepoUrl: 'https://github.com/dnum-mi/beta-front.git',
          isPrivate: true,
          externalUserName: 'this-is-a-test',
          externalToken: 'this-is-a-token',
          isInfra: false,
          status: 'created',
        },
        {
          internalRepoName: 'beta-back',
          externalRepoUrl: 'https://github.com/dnum-mi/beta-back.git',
          isPrivate: false,
          isInfra: false,
          status: 'created',
        },
      ],
      environments: [{
        name: 'staging',
        status: 'created',
        permissions: [
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            level: 2,
          },
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
            level: 0,
          },
        ],
      },
      {
        name: 'dev',
        status: 'created',
        permissions: [
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            level: 2,
          },
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
            level: 1,
          },
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
            level: 1,
          },
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
            level: 0,
          },
        ],
      }],
      services: {
        gitlab: {
          id: 34,
        },
        registry: {
          id: 25,
        },
      },
      status: 'created',
      locked: false,
      logs: [
        {
          action: 'create Project',
          userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
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
              organization: 'ministere-interieur',
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
                  USERNAME: 'robot$ministere-interieur-int-2+ci',
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
              roGroup: '/ministere-interieur-int-2/staging/RO',
              rwGroup: '/ministere-interieur-int-2/staging/RW',
            },
            kubernetes: {
              ns: {
                kind: 'Namespace',
                spec: {
                  finalizers: [
                    'kubernetes',
                  ],
                },
                status: {
                  phase: 'Active',
                },
                metadata: {
                  uid: 'facaa8a7-956c-4bbb-88d9-b6598ca90b43',
                  name: 'ministere-interieur-int-2-staging',
                  labels: {
                    'dso/projet': 'int-2',
                    'dso/owner.id': 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
                    'dso/environment': 'staging',
                    'dso/organization': 'ministere-interieur',
                    'dso/owner.lastName': 'Nollet',
                    'dso/owner.firstName': 'Claire',
                    'kubernetes.io/metadata.name': 'ministere-interieur-int-2-staging',
                  },
                  managedFields: [
                    {
                      time: '2023-06-08T15:16:44.000Z',
                      manager: 'unknown',
                      fieldsV1: {
                        'f:metadata': {
                          'f:labels': {
                            '.': {},
                            'f:dso/projet': {},
                            'f:dso/owner.id': {},
                            'f:dso/environment': {},
                            'f:dso/organization': {},
                            'f:dso/owner.lastName': {},
                            'f:dso/owner.firstName': {},
                            'f:kubernetes.io/metadata.name': {},
                          },
                        },
                      },
                      operation: 'Update',
                      apiVersion: 'v1',
                      fieldsType: 'FieldsV1',
                    },
                  ],
                  resourceVersion: '140498752',
                  creationTimestamp: '2023-06-08T15:16:44.000Z',
                },
                apiVersion: 'v1',
              },
              status: {
                result: 'OK',
                message: 'Updated',
              },
            },
          },
        },
        {
          action: 'Create Repository',
          userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
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
              services: {
                gitlab: {
                  id: 252,
                },
                registry: {
                  id: 63,
                },
              },
              createdAt: '2023-06-08T15:15:56.692Z',
              isPrivate: false,
              projectId: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
              updatedAt: '2023-06-08T15:15:56.692Z',
              environment: [],
              internalUrl: 'https://blabla.com/bla/projects/ministere-interieur/int-2/repo.git',
              organization: 'ministere-interieur',
              externalToken: '',
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
                    PROJECT_NAME: 'int-2',
                    GIT_INPUT_URL: 'github.com/dnum-mi/dso-console.git',
                    GIT_INPUT_USER: '',
                    GIT_OUTPUT_URL: 'blabla.com/bla/projects/ministere-interieur/int-2/repo.git',
                    GIT_OUTPUT_USER: 'root',
                    ORGANIZATION_NAME: 'ministere-interieur',
                    GIT_INPUT_PASSWORD: '',
                    GIT_PIPELINE_TOKEN: 'token',
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
        },
      ],
    },
    {
      id: '9dabf3f9-6c86-4358-8598-65007d78df65',
      organization: 'dinum',
      name: 'project-to-archive',
      users: [
        {
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
          role: 'owner',
        },
        {
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
          role: 'user',
        },
        {
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
          role: 'user',
        },
      ],
      repositories: [
        {
          internalRepoName: 'archive-front',
          externalRepoUrl: 'https://github.com/dnum-mi/archive-front.git',
          isPrivate: true,
          externalUserName: 'this-is-a-test',
          externalToken: 'this-is-a-token',
          isInfra: false,
          status: 'created',
        },
        {
          internalRepoName: 'archive-back',
          externalRepoUrl: 'https://github.com/dnum-mi/archive-back.git',
          isPrivate: false,
          isInfra: false,
          status: 'created',
        },
      ],
      environments: [{
        name: 'staging',
        status: 'created',
        permissions: [
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            level: 2,
          },
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
            level: 0,
          },
        ],
      },
      {
        name: 'dev',
        status: 'created',
        permissions: [
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            level: 2,
          },
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
            level: 1,
          },
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
            level: 1,
          },
        ],
      }],
      services: {
        gitlab: {
          id: 34,
        },
        registry: {
          id: 25,
        },
      },
      status: 'created',
      locked: false,
    },
  ],
  users: [
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      email: 'test@test.com',
      firstName: 'test',
      lastName: 'com',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      email: 'thibault.colin@test.com',
      firstName: 'Thibault',
      lastName: 'COLIN',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
      email: 'claire.nollet@test.com',
      firstName: 'Claire',
      lastName: 'NOLLET',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6568',
      email: 'baudoin.tran@test.com',
      firstName: 'Baudoin',
      lastName: 'TRAN',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
      email: 'arnaud.tardif@test.com',
      firstName: 'Arnaud',
      lastName: 'TARDIF',
    },
  ],
  organizations: [
    {
      id: '2368a61e-f243-42f6-b471-a85b056ee131',
      name: 'dinum',
      label: 'DINUM',
      active: true,
      source: 'dso-console',
    },
    {
      id: 'b644c07f-193c-47ed-ae10-b88a8f63d20b',
      name: 'ministere-interieur',
      label: 'Ministère de l\'Intérieur',
      active: true,
      source: 'dso-console',
    },
    {
      id: '94e5b24b-ba73-4169-af09-e2df4b83a60f',
      name: 'ministere-justice',
      label: 'Ministère de la Justice',
      active: true,
      source: 'dso-console',
    },
  ],
}
