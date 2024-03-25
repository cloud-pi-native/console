import { UserModel } from '../user/index.js'

export type LogModel = {
  id: string
  userId?: UserModel['id']
  requestId?: string
  action: string
  data: {
    [x:string]: any
    failed?: boolean
    totalExecutionTime?: number
  }
  createdAt: string
  updatedAt: string
}
