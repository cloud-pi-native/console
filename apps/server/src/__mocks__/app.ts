// import { vi } from 'vitest'
// import fastify from 'fastify'
// import fp from 'fastify-plugin'
// import fastifyCookie from '@fastify/cookie'
// import fastifySession from '@fastify/session'
// import fastifySwagger from '@fastify/swagger'
// import fastifySwaggerUi from '@fastify/swagger-ui'
// import { initServer } from '@ts-rest/fastify'
// import { generateOpenApi } from '@ts-rest/open-api'
// import { getContract } from '@cpn-console/shared'
// import { User } from '@cpn-console/test-utils'
// import { swaggerConf, swaggerUiConf } from '../utils/fastify.js'
// import { sessionConf } from '../utils/keycloak.js'
// import { apiRouter } from '../resources/index.js'
// import { apiRouterAdmin } from '../resources/index-admin.js'

// global.process.exit = vi.fn()

// vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => { vi.fn() }) }))

// vi.mock('@cpn-console/hooks', async () => {
//   const hooks = await vi.importActual('@cpn-console/hooks')
//   const hookTemplate = {
//     execute: () => ({
//       args: {},
//       failed: false,
//     }),
//     validate: () => ({
//       failed: false,
//     }),
//   }

//   return {
//     // @ts-ignore
//     ...hooks,
//     services: {
//       getForProject: () => { },
//       getStatus: () => [],
//       refreshStatus: async () => [],
//     },
//     PluginApi: class { },
//     servicesInfos: {
//       gitlab: { title: 'Gitlab' },
//       harbor: { title: 'Harbor' },
//     },
//     hooks: {
//       // projects
//       getProjectSecrets: {
//         execute: () => ({
//           failed: false,
//           args: {},
//           results: {
//             gitlab: {
//               secrets: {
//                 token: 'myToken',
//               },
//               status: {
//                 failed: false,
//               },
//             },
//             harbor: {
//               secrets: {
//                 token: 'myToken',
//               },
//               status: {
//                 failed: false,
//               },
//             },
//           },
//         }),
//       },
//       createProject: hookTemplate,
//       updateProject: hookTemplate,
//       archiveProject: hookTemplate,
//       // repos
//       updateRepository: hookTemplate,
//       createRepository: hookTemplate,
//       deleteRepository: hookTemplate,
//       // envs
//       initializeEnvironment: hookTemplate,
//       updateEnvironmentQuota: hookTemplate,
//       deleteEnvironment: hookTemplate,
//       // users
//       retrieveUserByEmail: hookTemplate,
//       addUserToProject: hookTemplate,
//       updateUserProjectRole: hookTemplate,
//       removeUserFromProject: hookTemplate,
//       // permissions
//       setEnvPermission: hookTemplate,
//       // clusters
//       createCluster: hookTemplate,
//       updateCluster: hookTemplate,
//       deleteCluster: hookTemplate,
//       // organizations
//       fetchOrganizations: {
//         execute: () => ({
//           args: undefined,
//           results: {
//             canel: {
//               status: {
//                 result: 'OK',
//                 message: 'Retrieved',
//               },
//               result: {
//                 organizations: [
//                   {
//                     name: 'genat',
//                     label: 'MI - gendaremerie nationale',
//                     source: 'canel',
//                   },
//                   {
//                     name: 'mas',
//                     label: 'ministère affaires sociaux',
//                     source: 'canel',
//                   },
//                   {
//                     name: 'genat',
//                     label: 'ministère affaires sociaux',
//                     source: 'canel',
//                   },
//                 ],
//               },
//             },
//           },
//         }),
//       },
//     },
//   }
// })

// let requestor: User

// export const setRequestor = (user: User) => {
//   requestor = user
// }

// export const getRequestor = () => {
//   return requestor
// }

// export const mockSessionPlugin = (app, opt, next) => {
//   app.addHook('onRequest', (req, res, next) => {
//     req.session = { user: getRequestor() }
//     next()
//   })
//   next()
// }

// export const serverInstance: ReturnType<typeof initServer> = initServer()

// // const openApiDocument = generateOpenApi(await getContract(), swaggerConf, { setOperationId: true })

// const app = fastify({ logger: false })
//   .register(fastifyCookie)
//   .register(fastifySession, sessionConf)
//   .register(fp(mockSessionPlugin))
//   // .register(apiRouter())
//   // .register(apiRouterAdmin())

// await app.ready()

// vi.spyOn(app, 'listen')
// vi.spyOn(app.log, 'info')
// vi.spyOn(app.log, 'warn')
// vi.spyOn(app.log, 'error')
// vi.spyOn(app.log, 'debug')

// export default app
