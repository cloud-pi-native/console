export const projects = [
  {
    id: '011e7860-04d7-461f-912d-334c622d38b3',
    organization: 'ministere-interieur',
    name: 'candilib',
    users: [
      {
        id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
        role: 'owner',
      },
      {
        id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6464',
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
            level: 10,
          },
        ],
      },
      {
        name: 'prod',
        status: 'created',
        permissions: [
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
            level: 10,
          },
          {
            userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6464',
            level: 0,
          },
        ],
      },
    ],
    status: 'created',
  },
  {
    id: '83833faf-f654-40dd-bcd5-cf2e944fc702',
    organization: 'ministere-interieur',
    name: 'psij',
    users: [
      {
        id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
        role: 'owner',
      },
    ],
    repositories: [
      {
        internalRepoName: 'psij',
        externalRepoUrl: 'https://github.com/dnum-mi/psij.git',
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
          level: 10,
        },
      ],
    }],
    status: 'created',
  },
]
