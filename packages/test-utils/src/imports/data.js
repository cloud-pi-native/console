export const data = {
  projects: [
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
          id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
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
              userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
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
      name: 'dinum',
      label: 'DINUM',
    },
    {
      name: 'ministere-interieur',
      label: 'Ministère de l\'Intérieur',
    },
    {
      name: 'ministere-justice',
      label: 'Ministère de la Justice',
    },
  ],
}
