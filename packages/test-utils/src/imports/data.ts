export const data = {
  quota: [
    {
      id: '5a57b62f-2465-4fb6-a853-5a751d099199',
      cpu: 2,
      memory: '4Gi',
      name: 'small',
      isPrivate: false,
    },
    {
      id: '08770663-3b76-4af6-8978-9f75eda4faa7',
      cpu: 4,
      memory: '8Gi',
      name: 'medium',
      isPrivate: false,
    },
    {
      id: 'b7b4d9bd-7a8f-4287-bb12-5ce2dadb4ff2',
      cpu: 6,
      memory: '12Gi',
      name: 'large',
      isPrivate: false,
    },
    {
      id: '97b851e8-9067-4a3d-a0e8-c3a6820c49be',
      cpu: 8,
      memory: '16Gi',
      name: 'xlarge',
      isPrivate: false,
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
  quotaStage: [
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e61c',
      quotaId: '5a57b62f-2465-4fb6-a853-5a751d099199',
      stageId: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
      status: 'active',
    },
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e62c',
      quotaId: '08770663-3b76-4af6-8978-9f75eda4faa7',
      stageId: '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9',
      status: 'active',
    },
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e63c',
      quotaId: '5a57b62f-2465-4fb6-a853-5a751d099199',
      stageId: '38fa869d-6267-441d-af7f-e0548fd06b7e',
      status: 'active',
    },
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e64c',
      quotaId: '08770663-3b76-4af6-8978-9f75eda4faa7',
      stageId: '38fa869d-6267-441d-af7f-e0548fd06b7e',
      status: 'active',
    },
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e65c',
      quotaId: '5a57b62f-2465-4fb6-a853-5a751d099199',
      stageId: 'd434310e-7850-4d59-b47f-0772edf50582',
      status: 'active',
    },
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e66c',
      quotaId: '08770663-3b76-4af6-8978-9f75eda4faa7',
      stageId: 'd434310e-7850-4d59-b47f-0772edf50582',
      status: 'active',
    },
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e71c',
      quotaId: 'b7b4d9bd-7a8f-4287-bb12-5ce2dadb4ff2',
      stageId: 'd434310e-7850-4d59-b47f-0772edf50582',
      status: 'active',
    },
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e67c',
      quotaId: '97b851e8-9067-4a3d-a0e8-c3a6820c49be',
      stageId: 'd434310e-7850-4d59-b47f-0772edf50582',
      status: 'active',
    },
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e68c',
      quotaId: '5a57b62f-2465-4fb6-a853-5a751d099199',
      stageId: '9b3e9991-896d-4d90-bdc5-a34be8c06b8f',
      status: 'active',
    },
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e69c',
      quotaId: '08770663-3b76-4af6-8978-9f75eda4faa7',
      stageId: '9b3e9991-896d-4d90-bdc5-a34be8c06b8f',
      status: 'active',
    },
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e70c',
      quotaId: 'b7b4d9bd-7a8f-4287-bb12-5ce2dadb4ff2',
      stageId: '9b3e9991-896d-4d90-bdc5-a34be8c06b8f',
      status: 'active',
    },
    {
      id: '0530e9c9-b37d-4dec-93e6-1895f700e60c',
      quotaId: '97b851e8-9067-4a3d-a0e8-c3a6820c49be',
      stageId: '9b3e9991-896d-4d90-bdc5-a34be8c06b8f',
      status: 'active',
    },
  ],
  organization: [
    {
      id: '2368a61e-f243-42f6-b471-a85b056ee131',
      source: 'dso-console',
      name: 'dinum',
      label: 'DINUM',
      active: true,
      createdAt: '2023-07-03T14:46:56.758Z',
      updatedAt: '2023-07-03T14:46:56.758Z',
    },
    {
      id: 'b644c07f-193c-47ed-ae10-b88a8f63d20b',
      source: 'dso-console',
      name: 'mi',
      label: "Ministère de l'Intérieur",
      active: true,
      createdAt: '2023-07-03T14:46:56.764Z',
      updatedAt: '2023-07-03T14:46:56.764Z',
    },
    {
      id: '94e5b24b-ba73-4169-af09-e2df4b83a60f',
      source: 'dso-console',
      name: 'mj',
      label: 'Ministère de la Justice',
      active: true,
      createdAt: '2023-07-03T14:46:56.765Z',
      updatedAt: '2023-07-03T14:46:56.765Z',
    },
  ],
  cluster: [
    {
      id: '32636a52-4dd1-430b-b08a-b2e5ed9d1789',
      label: 'public1',
      privacy: 'public',
      secretName: '3972ac09-6abc-4e49-83b6-d046da5260ec',
      clusterResources: false,
      infos: 'Cluster public proposé par DSO',
      createdAt: '2023-07-10T19:32:13.385Z',
      updatedAt: '2023-07-10T19:32:13.385Z',
      kubeconfig: {
        cluster: {
          server: 'https://public.server:6443',
          tlsServerName: 'public.server',
          skipTLSVerify: true,
        },
        user: {
          keyData: 'LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=',
          certData: 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
        },
      },
    },
    {
      id: '126ac57f-263c-4463-87bb-d4e9017056b2',
      label: 'top-secret-cluster',
      privacy: 'dedicated',
      secretName: '59be2d50-58f9-42f3-95dc-b0c0518e3d8a',
      clusterResources: true,
      createdAt: '2023-07-10T19:49:31.691Z',
      updatedAt: '2023-07-10T20:01:46.826Z',
      kubeconfig: {
        cluster: {
          server: 'https://nothere.cluster',
          skipTLSVerify: false,
          tlsServerName: 'nothere.cluster',
        },
        user: {
          token: 'nyan cat',
        },
      },
    },
    {
      id: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      label: 'pas-top-cluster',
      infos: 'Floating IP : 0.0.0.0',
      privacy: 'dedicated',
      secretName: '94d52618-7869-4192-b33e-85dd0959e815',
      clusterResources: false,
      createdAt: '2023-07-10T19:49:31.697Z',
      updatedAt: '2023-07-10T20:01:46.833Z',
      kubeconfig: {
        cluster: {
          server: 'https://pwned.cluster',
          tlsServerName: 'pwned.cluster',
        },
        user: {
          token: 'kirikou',
        },
      },
    },
  ],
  project: [
    {
      id: '22e7044f-8414-435d-9c4a-2df42a65034b',
      name: 'betaapp',
      organizationId: '2368a61e-f243-42f6-b471-a85b056ee131',
      description: null,
      status: 'created',
      locked: false,
      services: {
        gitlab: {
          id: 34,
        },
        registry: {
          id: 25,
        },
      },
      createdAt: '2023-07-03T14:46:56.814Z',
      updatedAt: '2023-07-03T14:46:56.817Z',
    },
    {
      id: '9dabf3f9-6c86-4358-8598-65007d78df65',
      name: 'projecttoarchive',
      organizationId: '2368a61e-f243-42f6-b471-a85b056ee131',
      description: null,
      status: 'created',
      locked: false,
      services: {
        gitlab: {
          id: 34,
        },
        registry: {
          id: 25,
        },
      },
      createdAt: '2023-07-03T14:46:56.824Z',
      updatedAt: '2023-07-03T14:46:56.830Z',
    },
    {
      id: '011e7860-04d7-461f-912d-334c622d38b3',
      name: 'candilib',
      organizationId: 'b644c07f-193c-47ed-ae10-b88a8f63d20b',
      description: "Application de réservation de places à l'examen du permis B.",
      status: 'created',
      locked: false,
      services: {
        gitlab: {
          id: 34,
        },
        registry: {
          id: 25,
        },
      },
      createdAt: '2023-07-03T14:46:56.778Z',
      updatedAt: '2023-07-03T14:46:56.783Z',
    },
    {
      id: '011e7860-04d7-461f-912d-334c622d38c5',
      name: 'basegun',
      organizationId: 'b644c07f-193c-47ed-ae10-b88a8f63d20b',
      description: "Application d'aide à la catégorisation d'armes à feu.",
      status: 'created',
      locked: false,
      services: {
        gitlab: {
          id: 35,
        },
        registry: {
          id: 26,
        },
      },
      createdAt: '2023-07-10T14:46:56.778Z',
      updatedAt: '2023-07-10T14:46:56.783Z',
    },
    {
      id: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      name: 'psijfailed',
      organizationId: 'b644c07f-193c-47ed-ae10-b88a8f63d20b',
      description: "Application de transmission d'informations entre agents de la PS et de l'IJ.",
      status: 'failed',
      locked: true,
      services: {
        gitlab: {
          id: 36,
        },
        registry: {
          id: 27,
        },
      },
      createdAt: '2023-07-03T14:46:56.799Z',
      updatedAt: '2023-07-03T14:46:56.806Z',
    },
  ],
  user: [
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
      firstName: 'Arnaud',
      lastName: 'TARDIF',
      email: 'arnaud.tardif@test.com',
      createdAt: '2023-07-03T14:46:56.773Z',
      updatedAt: '2023-07-03T14:46:56.773Z',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      firstName: 'Thibault',
      lastName: 'COLIN',
      email: 'thibault.colin@test.com',
      createdAt: '2023-07-03T14:46:56.772Z',
      updatedAt: '2023-07-03T14:46:56.772Z',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      firstName: 'Jean',
      lastName: 'DUPOND',
      email: 'test@test.com',
      createdAt: '2023-07-03T14:46:56.770Z',
      updatedAt: '2023-07-03T14:46:56.770Z',
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
      firstName: 'Claire',
      lastName: 'NOLLET',
      email: 'claire.nollet@test.com',
      createdAt: '2023-07-03T14:46:56.771Z',
      updatedAt: '2023-07-03T14:46:56.771Z',
    },
    {
      id: '89e5d1ca-3194-4b0a-b226-75a5f4fe6a34',
      firstName: 'Admin',
      lastName: 'ADMIN',
      email: 'admin@test.com',
      createdAt: '2023-07-03T18:01:52.884Z',
      updatedAt: '2023-07-06T12:53:39.183Z',
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
  ],
  environment: [
    {
      id: 'bc06ace5-ddf6-4f00-97fa-872922baf078',
      name: 'dev',
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      createdAt: '2023-07-03T14:46:56.819Z',
      updatedAt: '2023-07-03T14:46:56.826Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      quotaStageId: '0530e9c9-b37d-4dec-93e6-1895f700e61c',
    },
    {
      id: '95ef0d9b-945e-4af6-851c-4c6685ceff20',
      name: 'staging',
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      createdAt: '2023-07-03T14:46:56.819Z',
      updatedAt: '2023-07-03T14:46:56.829Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      quotaStageId: '0530e9c9-b37d-4dec-93e6-1895f700e61c',
    },
    {
      id: '8d4503eb-64c7-407e-89db-6ab80865071f',
      name: 'dev',
      projectId: '9dabf3f9-6c86-4358-8598-65007d78df65',
      createdAt: '2023-07-03T14:46:56.834Z',
      updatedAt: '2023-07-03T14:46:56.855Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      quotaStageId: '0530e9c9-b37d-4dec-93e6-1895f700e61c',
    },
    {
      id: '3b0cf6c1-251b-4ec6-926f-b54ce1f82560',
      name: 'staging',
      projectId: '9dabf3f9-6c86-4358-8598-65007d78df65',
      createdAt: '2023-07-03T14:46:56.834Z',
      updatedAt: '2023-07-03T14:46:56.859Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      quotaStageId: '0530e9c9-b37d-4dec-93e6-1895f700e61c',
    },
    {
      id: '1b9f1053-fcf5-4053-a7b2-ff8a2c0c1921',
      name: 'dev',
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      createdAt: '2023-07-03T14:46:56.787Z',
      updatedAt: '2023-07-03T14:46:56.803Z',
      clusterId: 'aaaaaaaa-5b03-45d5-847b-149dec875680',
      quotaStageId: '0530e9c9-b37d-4dec-93e6-1895f700e61c',
    },
    {
      id: '1c654f00-4798-4a80-929f-960ddb37885a',
      name: 'integration',
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.803Z',
      clusterId: '126ac57f-263c-4463-87bb-d4e9017056b2',
      quotaStageId: '0530e9c9-b37d-4dec-93e6-1895f700e61c',
    },
    {
      id: '1c654f00-4798-4a80-929f-960ddb36774b',
      name: 'integration',
      projectId: '011e7860-04d7-461f-912d-334c622d38c5',
      createdAt: '2023-07-03T14:46:56.788Z',
      updatedAt: '2023-07-03T14:46:56.803Z',
      clusterId: '32636a52-4dd1-430b-b08a-b2e5ed9d1789',
      quotaStageId: '0530e9c9-b37d-4dec-93e6-1895f700e61c',
    },
    {
      id: '2805a1f5-0ca4-46a4-b3d7-5b649aee4a91',
      name: 'integration',
      projectId: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      createdAt: '2023-07-03T14:46:56.808Z',
      updatedAt: '2023-07-03T14:46:56.815Z',
      clusterId: '32636a52-4dd1-430b-b08a-b2e5ed9d1789',
      quotaStageId: '0530e9c9-b37d-4dec-93e6-1895f700e61c',
    },
  ],
  permission: [
    {
      id: '1b5266b4-73b3-4c4e-95bd-cd54f0f22df4',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      environmentId: '1c654f00-4798-4a80-929f-960ddb36774b',
      level: 2,
      createdAt: '2023-07-03T14:46:56.831Z',
      updatedAt: '2023-07-03T14:46:56.831Z',
    },
    {
      id: '1b5266b4-73b3-4c4e-95bd-cd54f0f22df5',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      environmentId: 'bc06ace5-ddf6-4f00-97fa-872922baf078',
      level: 2,
      createdAt: '2023-07-03T14:46:56.831Z',
      updatedAt: '2023-07-03T14:46:56.831Z',
    },
    {
      id: 'ddd062b7-d94a-43f0-8204-1ac4156b90b4',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      environmentId: 'bc06ace5-ddf6-4f00-97fa-872922baf078',
      level: 0,
      createdAt: '2023-07-03T14:46:56.831Z',
      updatedAt: '2023-07-03T14:46:56.831Z',
    },
    {
      id: '5d21568d-013c-4f03-bfaf-16bbafbd2e85',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      environmentId: '95ef0d9b-945e-4af6-851c-4c6685ceff20',
      level: 2,
      createdAt: '2023-07-03T14:46:56.832Z',
      updatedAt: '2023-07-03T14:46:56.832Z',
    },
    {
      id: '4587f2d7-f253-4bcb-8eb4-8c6b854b852a',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
      environmentId: '95ef0d9b-945e-4af6-851c-4c6685ceff20',
      level: 1,
      createdAt: '2023-07-03T14:46:56.832Z',
      updatedAt: '2023-07-03T14:46:56.832Z',
    },
    {
      id: '0c71a970-fdbb-4243-81b5-494ca03eabc5',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      environmentId: '95ef0d9b-945e-4af6-851c-4c6685ceff20',
      level: 1,
      createdAt: '2023-07-03T14:46:56.832Z',
      updatedAt: '2023-07-03T14:46:56.832Z',
    },
    {
      id: '383bfec5-5603-4c84-bd61-b8597ad3fd4d',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
      environmentId: '95ef0d9b-945e-4af6-851c-4c6685ceff20',
      level: 0,
      createdAt: '2023-07-03T14:46:56.832Z',
      updatedAt: '2023-07-03T14:46:56.832Z',
    },
    {
      id: 'ee520417-4baa-415e-9bfd-5b272c470cbd',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      environmentId: '8d4503eb-64c7-407e-89db-6ab80865071f',
      level: 2,
      createdAt: '2023-07-03T14:46:56.861Z',
      updatedAt: '2023-07-03T14:46:56.861Z',
    },
    {
      id: '5598f092-4c2b-45df-ae68-06181e4ef235',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
      environmentId: '8d4503eb-64c7-407e-89db-6ab80865071f',
      level: 0,
      createdAt: '2023-07-03T14:46:56.861Z',
      updatedAt: '2023-07-03T14:46:56.861Z',
    },
    {
      id: '863641ef-7a81-4ba6-b110-fb6dcf131d8d',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      environmentId: '3b0cf6c1-251b-4ec6-926f-b54ce1f82560',
      level: 2,
      createdAt: '2023-07-03T14:46:56.863Z',
      updatedAt: '2023-07-03T14:46:56.863Z',
    },
    {
      id: '75f3c6db-7729-4b04-ad59-a3a661b355b6',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
      environmentId: '3b0cf6c1-251b-4ec6-926f-b54ce1f82560',
      level: 1,
      createdAt: '2023-07-03T14:46:56.863Z',
      updatedAt: '2023-07-03T14:46:56.863Z',
    },
    {
      id: 'af8f87d4-fca2-4c8d-b39f-230ccbc7308f',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      environmentId: '3b0cf6c1-251b-4ec6-926f-b54ce1f82560',
      level: 1,
      createdAt: '2023-07-03T14:46:56.863Z',
      updatedAt: '2023-07-03T14:46:56.863Z',
    },
    {
      id: 'f24773dc-c3c6-479d-9405-ee4a25227c66',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      environmentId: '1b9f1053-fcf5-4053-a7b2-ff8a2c0c1921',
      level: 2,
      createdAt: '2023-07-03T14:46:56.807Z',
      updatedAt: '2023-07-03T14:46:56.807Z',
    },
    {
      id: '1390ac0b-7895-4f69-bc1a-3d4d534564a7',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      environmentId: '1c654f00-4798-4a80-929f-960ddb37885a',
      level: 2,
      createdAt: '2023-07-03T14:46:56.808Z',
      updatedAt: '2023-07-03T14:46:56.808Z',
    },
    {
      id: '9666026d-205a-456e-a226-a2e04433e4f8',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      environmentId: '1c654f00-4798-4a80-929f-960ddb37885a',
      level: 0,
      createdAt: '2023-07-03T14:46:56.808Z',
      updatedAt: '2023-07-03T14:46:56.808Z',
    },
    {
      id: 'c607501f-e54b-4550-8714-9c8eed6ae956',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
      environmentId: '1c654f00-4798-4a80-929f-960ddb37885a',
      level: 0,
      createdAt: '2023-07-03T14:46:56.808Z',
      updatedAt: '2023-07-03T14:46:56.808Z',
    },
    {
      id: '2843d23c-c2ac-4a35-a4ca-12afdb237fc6',
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      environmentId: '2805a1f5-0ca4-46a4-b3d7-5b649aee4a91',
      level: 2,
      createdAt: '2023-07-03T14:46:56.818Z',
      updatedAt: '2023-07-03T14:46:56.818Z',
    },
  ],
  role: [
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      projectId: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      role: 'user',
      createdAt: '2023-07-03T14:46:56.826Z',
      updatedAt: '2023-07-03T14:46:56.826Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      role: 'owner',
      createdAt: '2023-07-03T14:46:56.826Z',
      updatedAt: '2023-07-03T14:46:56.826Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      role: 'user',
      createdAt: '2023-07-03T14:46:56.828Z',
      updatedAt: '2023-07-03T14:46:56.828Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      role: 'user',
      createdAt: '2023-07-03T14:46:56.828Z',
      updatedAt: '2023-07-03T14:46:56.828Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
      projectId: '22e7044f-8414-435d-9c4a-2df42a65034b',
      role: 'user',
      createdAt: '2023-07-03T14:46:56.829Z',
      updatedAt: '2023-07-03T14:46:56.829Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      projectId: '9dabf3f9-6c86-4358-8598-65007d78df65',
      role: 'user',
      createdAt: '2023-07-03T14:46:56.856Z',
      updatedAt: '2023-07-03T14:46:56.856Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567',
      projectId: '9dabf3f9-6c86-4358-8598-65007d78df65',
      role: 'user',
      createdAt: '2023-07-03T14:46:56.857Z',
      updatedAt: '2023-07-03T14:46:56.857Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      projectId: '9dabf3f9-6c86-4358-8598-65007d78df65',
      role: 'owner',
      createdAt: '2023-07-03T14:46:56.858Z',
      updatedAt: '2023-07-03T14:46:56.858Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      role: 'owner',
      createdAt: '2023-07-03T14:46:56.804Z',
      updatedAt: '2023-07-03T14:46:56.804Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      projectId: '011e7860-04d7-461f-912d-334c622d38c5',
      role: 'owner',
      createdAt: '2023-07-03T14:46:56.804Z',
      updatedAt: '2023-07-03T14:46:56.804Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569',
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      role: 'user',
      createdAt: '2023-07-03T14:46:56.805Z',
      updatedAt: '2023-07-03T14:46:56.805Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566',
      projectId: '011e7860-04d7-461f-912d-334c622d38b3',
      role: 'user',
      createdAt: '2023-07-03T14:46:56.806Z',
      updatedAt: '2023-07-03T14:46:56.806Z',
    },
    {
      userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      projectId: '83833faf-f654-40dd-bcd5-cf2e944fc702',
      role: 'owner',
      createdAt: '2023-07-03T14:46:56.816Z',
      updatedAt: '2023-07-03T14:46:56.816Z',
    },
  ],
  log: [
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
          environment: 'staging',
          organization: 'mi',
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
      createdAt: '2023-07-03T14:46:56.809Z',
      updatedAt: '2023-07-03T14:46:56.809Z',
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
          environment: 'staging',
          organization: 'mi',
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
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1235',
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
          internalUrl: 'https://blabla.com/bla/projects/mi/int-2/repo.git',
          organization: 'mi',
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
                GIT_INPUT_PASSWORD: '',
                GIT_OUTPUT_URL: 'blabla.com/bla/projects/mi/int-2/repo.git',
                GIT_OUTPUT_USER: 'root',
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
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1236',
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
          internalUrl: 'https://blabla.com/bla/projects/mi/int-2/repo.git',
          organization: 'mi',
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
                GIT_INPUT_PASSWORD: '',
                GIT_OUTPUT_URL: 'blabla.com/bla/projects/mi/int-2/repo.git',
                GIT_OUTPUT_USER: 'root',
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
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1237',
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
          organization: 'mi',
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
    },
    {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae1238',
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
          organization: 'mi',
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
          organization: 'mi',
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
    },
  ],
  associates: {
    cluster: [
      {
        id: '126ac57f-263c-4463-87bb-d4e9017056b2',
        projects: [
          {
            id: '83833faf-f654-40dd-bcd5-cf2e944fc702',
          },
          {
            id: '011e7860-04d7-461f-912d-334c622d38b3',
          },
        ],
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
        projects: [
          {
            id: '83833faf-f654-40dd-bcd5-cf2e944fc702',
          },
          {
            id: '011e7860-04d7-461f-912d-334c622d38b3',
          },
          {
            id: '9dabf3f9-6c86-4358-8598-65007d78df65',
          },
          {
            id: '22e7044f-8414-435d-9c4a-2df42a65034b',
          },
        ],
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
  },
}
