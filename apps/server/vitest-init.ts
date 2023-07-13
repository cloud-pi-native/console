/* eslint-disable @typescript-eslint/no-empty-function */
// import { vi } from 'vitest'
// import { hooks } from './src/plugins/index.js'
// import { objectKeys } from './src/utils/type.js'

process.env.ARGOCD_URL = 'https://argo-cd.readthedocs.io'
process.env.GITLAB_URL = 'https://gitlab.com'
process.env.HARBOR_URL = 'https://goharbor.io'
process.env.NEXUS_URL = 'https://sonatype.com/products/nexus-repository'
process.env.SONARQUBE_URL = 'https://www.sonarqube.org'
process.env.VAULT_URL = 'https://www.vaultproject.io'
process.env.PROJECTS_ROOT_DIR = 'forge-mi/projects'

// vi.mock('./src/plugins/index.js', async () => {
//   return {
//     hooks: Object.fromEntries(objectKeys(hooks).map(key => ([key, { execute: () => { }, validate: () => { } }]))),
//   }
// })
