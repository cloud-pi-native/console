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
    },
    {
      id: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      organization: 'ministere-interieur',
      name: 'psij',
      description: 'Application de transmission d\'informations entre agents de la PS et de l\'IJ.',
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
          status: 'created',
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
          status: 'failed',
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
