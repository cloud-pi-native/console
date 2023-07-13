import { UserModel } from '../user/index.js'

export type LogModel = {
  id: string
  data: object
  userId: UserModel['id']
  action: string
}
