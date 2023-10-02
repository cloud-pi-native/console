import { EnvironmentModel } from '../environment/model.js'
import { UserModel } from '../user/index.js'

export type PermissionModel = {
  id: string
  userId: UserModel['id']
  environmentId: EnvironmentModel['id']
  level: number
}
