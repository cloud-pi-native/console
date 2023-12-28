import * as others from './api.js'
import * as users from './users.js'
import * as projects from './projects.js'

export {
  projects,
  others,
  users,
}

export default {
  ...projects,
  ...others,
  ...users,
}
