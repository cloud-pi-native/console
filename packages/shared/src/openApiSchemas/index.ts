// import * as clustersSchemas from './cluster.js'
// import * as environmentSchema from './environment.js'
// import * as organizationSchema from './organization.js'
// import * as permissionSchema from './permission.js'
// import * as projectSchemas from './project.js'
// import * as quotasSchemas from './quota.js'
import * as repositoriesSchema from './repository.js'
// import * as stagesSchema from './stage.js'
import * as usersSchemas from './user.js'

export const openApiSchemas = {
  // ...clustersSchemas,
  // ...environmentSchema,
  // ...organizationSchema,
  // ...permissionSchema,
  // ...projectSchemas,
  // ...quotasSchemas,
  ...repositoriesSchema,
  // ...stagesSchema,
  ...usersSchemas,
}
