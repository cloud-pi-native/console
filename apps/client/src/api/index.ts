import * as clusters from './clusters.js'
import * as environments from './environments.js'
import * as files from './files.js'
import * as logs from './logs.js'
import * as organizations from './organizations.js'
import * as permissions from './permissions.js'
import * as projects from './projects.js'
import * as quotas from './quotas.js'
import * as repositories from './repositories.js'
import * as services from './services.js'
import * as projectServices from './project-services.js'
import * as plugins from './plugins.js'
import * as stages from './stages.js'
import * as users from './users.js'
import * as zones from './zones.js'

export default {
  ...clusters,
  ...environments,
  ...files,
  ...logs,
  ...organizations,
  ...permissions,
  ...projects,
  ...quotas,
  ...repositories,
  ...services,
  ...stages,
  ...users,
  ...zones,
  ...projectServices,
  ...plugins,
}
