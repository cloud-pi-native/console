import { ProjectModel, RoleModel } from '../project'
import { UserModel } from '../user'

export type AddUserDto = {
  body: UserModel['email']
  params: {
    projectId: ProjectModel['id']
  }
}

export type UpdateUserDto = {
  body: {
    email: UserModel['email']
    role: RoleModel['role']
  }
  params: AddUserDto['params']
}
